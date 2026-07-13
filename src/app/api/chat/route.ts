import { NextResponse } from "next/server";
import type Anthropic from "@anthropic-ai/sdk";
import { requireUser } from "@/lib/supabase/auth";
import { createChatMessage, listChatMessages } from "@/lib/supabase/chatMessages";
import { listScheduledItems } from "@/lib/supabase/scheduledItems";
import { getClaudeClient, CLAUDE_MODEL } from "@/lib/claude/client";
import { tools } from "@/lib/claude/tools";
import { runTool } from "@/lib/claude/runTool";

const MAX_TOOL_ITERATIONS = 8;

const MUTATING_TOOL_NAMES = new Set([
  "create_scheduled_item",
  "update_scheduled_item",
  "delete_scheduled_item",
  "update_scheduled_item_occurrence",
  "delete_scheduled_item_occurrence",
  "delete_scheduled_item_occurrences",
]);

export async function GET() {
  const auth = await requireUser();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const messages = await listChatMessages(auth.supabase);
    return NextResponse.json({ messages }, { status: 200 });
  } catch {
    return NextResponse.json(
      { error: "Failed to load chat history" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireUser();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const text = (body as Record<string, unknown> | null)?.text;
  if (typeof text !== "string" || !text.trim()) {
    return NextResponse.json({ error: "Invalid message text" }, { status: 400 });
  }

  const { supabase, user } = auth;

  try {
    await createChatMessage(supabase, user.id, "user", text.trim());

    const history = await listChatMessages(supabase);
    const conversation: Anthropic.MessageParam[] = history.map((m) => ({
      role: m.role,
      content: m.text,
    }));

    const today = new Date().toISOString().slice(0, 10);
    const system =
      `You are a helpful scheduling assistant embedded in a calendar app. ` +
      `Today's date is ${today} (YYYY-MM-DD). Use the provided tools to look up, ` +
      `create, update, or delete the user's scheduled items. Give brief, direct answers.`;

    const client = getClaudeClient();
    let finalText = "";
    let itemsMutated = false;

    for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
      const response = await client.messages.create({
        model: CLAUDE_MODEL,
        max_tokens: 1024,
        system,
        tools: tools as Anthropic.Tool[],
        messages: conversation,
      });

      if (response.stop_reason === "tool_use") {
        conversation.push({
          role: "assistant",
          content: response.content as unknown as Anthropic.MessageParam["content"],
        });

        const toolUseBlocks = response.content.filter(
          (block): block is Anthropic.Messages.ToolUseBlock =>
            block.type === "tool_use"
        );
        if (toolUseBlocks.some((block) => MUTATING_TOOL_NAMES.has(block.name))) {
          itemsMutated = true;
        }
        const toolResults = await Promise.all(
          toolUseBlocks.map((block) => runTool(supabase, user.id, block))
        );

        conversation.push({ role: "user", content: toolResults });
        continue;
      }

      finalText = response.content
        .filter(
          (block): block is Anthropic.Messages.TextBlock => block.type === "text"
        )
        .map((block) => block.text)
        .join("\n")
        .trim();
      break;
    }

    if (!finalText) {
      finalText = "Sorry, I wasn't able to finish that — could you try rephrasing?";
    }

    const assistantMessage = await createChatMessage(
      supabase,
      user.id,
      "assistant",
      finalText
    );

    const items = itemsMutated ? await listScheduledItems(supabase) : undefined;
    return NextResponse.json({ message: assistantMessage, items }, { status: 200 });
  } catch (error) {
    console.error("Error processing chat message:", error);
    return NextResponse.json(
      { error: "Failed to process message" },
      { status: 500 }
    );
  }
}
