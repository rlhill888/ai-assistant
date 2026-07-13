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
import type {
  RecurrenceOccurrenceOverride,
  RecurrenceRule,
  ScheduledItem,
  ScheduleOccurrenceChanges,
} from "@/lib/types";

type ToolHandlerResult = {
  result: unknown;
  changes: ScheduleOccurrenceChanges;
};

type ToolHandler = (
  supabase: SupabaseClient,
  userId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  input: any
) => Promise<ToolHandlerResult>;

function formatTimeRange(startTime?: string, endTime?: string): string {
  if (!startTime) return "";
  return endTime ? `${startTime}–${endTime}` : startTime;
}

function describeSchedule(item: {
  date: string;
  allDay: boolean;
  startTime?: string;
  endTime?: string;
}): string {
  if (item.allDay) return `${item.date} (all day)`;
  const time = formatTimeRange(item.startTime, item.endTime);
  return time ? `${item.date} at ${time}` : item.date;
}

function describeRecurrenceSuffix(recurrence?: RecurrenceRule): string {
  return recurrence ? ` (repeats ${recurrence.frequency})` : "";
}

const handlers: Record<string, ToolHandler> = {
  list_scheduled_items: async (supabase, _userId, input) => {
    const items = await listScheduledItems(supabase, {
      startDate: input.startDate,
      endDate: input.endDate,
    });
    return { result: items, changes: {} };
  },

  get_scheduled_item: async (supabase, _userId, input) => {
    const item = await getScheduledItem(supabase, input.id);
    return {
      result: item,
      changes: item ? { [item.id]: { crud: "read", updateMessage: "" } } : {},
    };
  },

  create_scheduled_item: async (supabase, userId, input) => {
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
    const created = await createScheduledItem(supabase, userId, item);
    return {
      result: created,
      changes: {
        [created.id]: {
          crud: "create",
          updateMessage: `Created "${created.title}" on ${describeSchedule(created)}${describeRecurrenceSuffix(created.recurrence)}`,
        },
      },
    };
  },

  update_scheduled_item: async (supabase, _userId, input) => {
    const existing = await getScheduledItem(supabase, input.id);
    if (!existing) return { result: null, changes: {} };

    const item: ScheduledItem = {
      ...existing,
      ...Object.fromEntries(
        Object.entries(input).filter(([, value]) => value !== undefined)
      ),
    };
    const updated = await updateScheduledItem(supabase, item);
    if (!updated) return { result: null, changes: {} };

    const parts: string[] = [];
    if (existing.title !== updated.title) {
      parts.push(`title → "${updated.title}"`);
    }
    if (existing.date !== updated.date) {
      parts.push(`date → ${updated.date}`);
    }
    if (
      existing.allDay !== updated.allDay ||
      existing.startTime !== updated.startTime ||
      existing.endTime !== updated.endTime
    ) {
      parts.push(
        updated.allDay
          ? "now all-day"
          : `time → ${formatTimeRange(updated.startTime, updated.endTime) || "unset"}`
      );
    }
    if ((existing.notes ?? "") !== (updated.notes ?? "")) {
      parts.push("notes updated");
    }
    if (
      existing.recurrence?.frequency !== updated.recurrence?.frequency ||
      existing.recurrence?.endDate !== updated.recurrence?.endDate
    ) {
      parts.push(
        updated.recurrence ? `repeat → ${updated.recurrence.frequency}` : "repeat removed"
      );
    }

    return {
      result: updated,
      changes: {
        [updated.id]: {
          crud: "update",
          updateMessage: parts.length
            ? `Updated "${updated.title}": ${parts.join(", ")}`
            : `Updated "${updated.title}"`,
        },
      },
    };
  },

  delete_scheduled_item: async (supabase, _userId, input) => {
    const existing = await getScheduledItem(supabase, input.id);
    const deleted = await deleteScheduledItem(supabase, input.id);
    return {
      result: deleted,
      changes:
        deleted && existing
          ? {
              [input.id]: {
                crud: "delete",
                updateMessage: `Deleted "${existing.title}"`,
              },
            }
          : {},
    };
  },

  update_scheduled_item_occurrence: async (supabase, _userId, input) => {
    const fields: RecurrenceOccurrenceOverride = {
      title: input.title,
      allDay: input.allDay,
      startTime: input.startTime,
      endTime: input.endTime,
      notes: input.notes,
    };
    const updated = await updateScheduledItemOccurrence(
      supabase,
      input.id,
      input.occurrenceDate,
      fields
    );
    if (!updated) return { result: null, changes: {} };

    return {
      result: updated,
      changes: {
        [`${input.id}:${input.occurrenceDate}`]: {
          crud: "update",
          updateMessage: `Set "${fields.title}" – ${describeSchedule({ ...fields, date: input.occurrenceDate })} for this occurrence`,
        },
      },
    };
  },

  delete_scheduled_item_occurrence: async (supabase, _userId, input) => {
    const updated = await deleteScheduledItemOccurrence(
      supabase,
      input.id,
      input.occurrenceDate
    );
    return {
      result: updated,
      changes: updated
        ? {
            [`${input.id}:${input.occurrenceDate}`]: {
              crud: "delete",
              updateMessage: `Removed the ${input.occurrenceDate} occurrence`,
            },
          }
        : {},
    };
  },

  delete_scheduled_item_occurrences: async (supabase, _userId, input) => {
    const updated = await deleteScheduledItemOccurrences(
      supabase,
      input.id,
      input.occurrenceDates
    );
    const changes: ScheduleOccurrenceChanges = {};
    if (updated) {
      for (const date of input.occurrenceDates as string[]) {
        changes[`${input.id}:${date}`] = {
          crud: "delete",
          updateMessage: `Removed the ${date} occurrence`,
        };
      }
    }
    return { result: updated, changes };
  },
};

export async function runTool(
  supabase: SupabaseClient,
  userId: string,
  toolUse: Anthropic.Messages.ToolUseBlock
): Promise<{
  result: Anthropic.Messages.ToolResultBlockParam;
  changes: ScheduleOccurrenceChanges;
}> {
  const handler = handlers[toolUse.name];
  if (!handler) {
    return {
      result: {
        type: "tool_result",
        tool_use_id: toolUse.id,
        is_error: true,
        content: `Unknown tool: ${toolUse.name}`,
      },
      changes: {},
    };
  }

  try {
    const { result, changes } = await handler(supabase, userId, toolUse.input);
    return {
      result: {
        type: "tool_result",
        tool_use_id: toolUse.id,
        content: JSON.stringify(result ?? { ok: true }),
      },
      changes,
    };
  } catch (error) {
    return {
      result: {
        type: "tool_result",
        tool_use_id: toolUse.id,
        is_error: true,
        content: error instanceof Error ? error.message : "Tool execution failed",
      },
      changes: {},
    };
  }
}
