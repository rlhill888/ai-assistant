import { NextResponse } from "next/server";
import type Anthropic from "@anthropic-ai/sdk";
import { requireUser } from "@/lib/supabase/auth";
import { createChatMessage, listChatMessages } from "@/lib/supabase/chatMessages";
import { listScheduledItems } from "@/lib/supabase/scheduledItems";
import { getClaudeClient, CLAUDE_MODEL } from "@/lib/claude/client";
import { tools } from "@/lib/claude/tools";
import { runTool } from "@/lib/claude/runTool";

const MAX_TOOL_ITERATIONS = 800;

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
      `create, update, or delete the user's scheduled items. Give brief, direct answers.\n\n` +
      `If the user has ` +
      `already given enough detail to act (e.g. a full spec for a routine or ` +
      `schedule), call the tools immediately instead of describing a plan and ` +
      `waiting for confirmation; only ask a clarifying question first if ` +
      `required details are actually missing. For requests that need several ` +
      `items (e.g. a recurring routine with multiple distinct events), make ` +
      `every necessary create_scheduled_item call before giving your final ` +
      `summary.`;

    const client = getClaudeClient();
    let finalText = "";
    let itemsMutated = false;
    let anyToolUsed = false;
    let nudged = false;
    let toolChoice: { type: "auto" } | { type: "any" } = { type: "auto" };

    for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
      const response = await client.messages.create({
        model: CLAUDE_MODEL,
        max_tokens: 8000,
        system,
        tools: tools as Anthropic.Tool[],
        tool_choice: toolChoice,
        messages: conversation,
      });
      toolChoice = { type: "auto" };

      if (response.stop_reason === "max_tokens") {
        // Generation was cut off mid-response — response.content may hold an
        // incomplete tool_use block. Don't push it into the conversation (its
        // tool_use id would never get a matching tool_result, which Anthropic's
        // API rejects on the next call) — just bail out to the fallback message.
        break;
      }

      if (response.stop_reason === "tool_use") {
        anyToolUsed = true;
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

      const text = response.content
        .filter(
          (block): block is Anthropic.Messages.TextBlock => block.type === "text"
        )
        .map((block) => block.text)
        .join("\n")
        .trim();

      // The model ended its turn with plain text and never touched a tool.
      // That's fine for a genuine no-action answer, but it's also exactly
      // the shape of a false promise like "I'll create this now" — give it
      // one forced chance to actually act before accepting the text as final.
      if (!anyToolUsed && !nudged) {
        nudged = true;
        conversation.push({ role: "assistant", content: response.content });
        conversation.push({
          role: "user",
          content:
            "If you intended to create, update, delete, or look anything up, " +
            "call the appropriate tool now instead of just describing it. If " +
            "your previous answer was already complete and needed no tool, " +
            "repeat it verbatim as your final answer.",
        });
        toolChoice = { type: "any" };
        continue;

      }

      finalText = text;
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
