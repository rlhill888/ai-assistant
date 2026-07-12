import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  createScheduledItem,
  deleteScheduledItem,
  deleteScheduledItemOccurrence,
  deleteScheduledItemOccurrences,
  getScheduledItem,
  listScheduledItems,
  updateScheduledItem,
  updateScheduledItemOccurrence,
} from "@/lib/supabase/scheduledItems";
import type { RecurrenceOccurrenceOverride, RecurrenceRule, ScheduledItem } from "@/lib/types";

type ToolHandler = (
  supabase: SupabaseClient,
  userId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  input: any
) => Promise<unknown>;

const handlers: Record<string, ToolHandler> = {
  list_scheduled_items: (supabase, _userId, input) =>
    listScheduledItems(supabase, {
      startDate: input.startDate,
      endDate: input.endDate,
    }),

  get_scheduled_item: (supabase, _userId, input) =>
    getScheduledItem(supabase, input.id),

  create_scheduled_item: (supabase, userId, input) => {
    const item: ScheduledItem = {
      id: crypto.randomUUID(),
      title: input.title,
      date: input.date,
      allDay: input.allDay,
      startTime: input.startTime,
      endTime: input.endTime,
      notes: input.notes,
      recurrence: input.recurrence as RecurrenceRule | undefined,
    };
    return createScheduledItem(supabase, userId, item);
  },

  update_scheduled_item: async (supabase, _userId, input) => {
    const existing = await getScheduledItem(supabase, input.id);
    if (!existing) return null;
    const item: ScheduledItem = {
      ...existing,
      ...Object.fromEntries(
        Object.entries(input).filter(([, value]) => value !== undefined)
      ),
    };
    return updateScheduledItem(supabase, item);
  },

  delete_scheduled_item: (supabase, _userId, input) =>
    deleteScheduledItem(supabase, input.id),

  update_scheduled_item_occurrence: (supabase, _userId, input) => {
    const fields: RecurrenceOccurrenceOverride = {
      title: input.title,
      allDay: input.allDay,
      startTime: input.startTime,
      endTime: input.endTime,
      notes: input.notes,
    };
    return updateScheduledItemOccurrence(supabase, input.id, input.occurrenceDate, fields);
  },

  delete_scheduled_item_occurrence: (supabase, _userId, input) =>
    deleteScheduledItemOccurrence(supabase, input.id, input.occurrenceDate),

  delete_scheduled_item_occurrences: (supabase, _userId, input) =>
    deleteScheduledItemOccurrences(supabase, input.id, input.occurrenceDates),
};


export async function runTool(
  supabase: SupabaseClient,
  userId: string,
  toolUse: Anthropic.Messages.ToolUseBlock
): Promise<Anthropic.Messages.ToolResultBlockParam> {
  const handler = handlers[toolUse.name];
  if (!handler) {
    return {
      type: "tool_result",
      tool_use_id: toolUse.id,
      is_error: true,
      content: `Unknown tool: ${toolUse.name}`,
    };
  }

  try {
    const result = await handler(supabase, userId, toolUse.input);
    return {
      type: "tool_result",
      tool_use_id: toolUse.id,
      content: JSON.stringify(result ?? { ok: true }),
    };
  } catch (error) {
    return {
      type: "tool_result",
      tool_use_id: toolUse.id,
      is_error: true,
      content: error instanceof Error ? error.message : "Tool execution failed",
    };
  }
}
