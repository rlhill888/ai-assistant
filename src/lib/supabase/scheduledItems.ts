import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  RecurrenceOccurrenceOverride,
  RecurrenceRule,
  ScheduledItem,
} from "@/lib/types";

interface ScheduledItemRow {
  id: string;
  user_id: string;
  title: string;
  date: string;
  all_day: boolean;
  start_time: string | null; // "HH:mm:ss" from PostgREST
  end_time: string | null;
  notes: string | null;
  recurrence_frequency: RecurrenceRule["frequency"] | null;
  recurrence_end_date: string | null;
  recurrence_custom_description: string | null;
  recurrence_exceptions: string[];
  recurrence_overrides: Record<string, RecurrenceOccurrenceOverride>;
}

const SELECT_COLUMNS =
  "id, user_id, title, date, all_day, start_time, end_time, notes, " +
  "recurrence_frequency, recurrence_end_date, recurrence_custom_description, " +
  "recurrence_exceptions, recurrence_overrides";

// Postgres `time` -> "HH:mm:ss"; truncate to "HH:mm" so formatTimeFrame()
// and <input type="time"> keep working unchanged.
function toHHmm(value: string | null): string | undefined {
  return value ? value.slice(0, 5) : undefined;
}

function rowToItem(row: ScheduledItemRow): ScheduledItem {
  const recurrence: RecurrenceRule | undefined = row.recurrence_frequency
    ? {
        frequency: row.recurrence_frequency,
        endDate: row.recurrence_end_date ?? undefined,
        customDescription: row.recurrence_custom_description ?? undefined,
        exceptions: row.recurrence_exceptions.length
          ? row.recurrence_exceptions
          : undefined,
        overrides: Object.keys(row.recurrence_overrides).length
          ? row.recurrence_overrides
          : undefined,
      }
    : undefined;

  return {
    id: row.id,
    title: row.title,
    date: row.date,
    allDay: row.all_day,
    startTime: toHHmm(row.start_time),
    endTime: toHHmm(row.end_time),
    notes: row.notes ?? undefined,
    recurrence,
  };
}

function itemToRow(item: ScheduledItem) {
  return {
    id: item.id,
    title: item.title,
    date: item.date,
    all_day: item.allDay,
    start_time: item.startTime ?? null,
    end_time: item.endTime ?? null,
    notes: item.notes ?? null,
    recurrence_frequency: item.recurrence?.frequency ?? null,
    recurrence_end_date: item.recurrence?.endDate ?? null,
    recurrence_custom_description: item.recurrence?.customDescription ?? null,
    recurrence_exceptions: item.recurrence?.exceptions ?? [],
    recurrence_overrides: item.recurrence?.overrides ?? {},
  };
}

export async function listScheduledItems(
  supabase: SupabaseClient,
  range?: { startDate?: string; endDate?: string }
): Promise<ScheduledItem[]> {
  let query = supabase.from("scheduled_items").select(SELECT_COLUMNS);
  if (range?.startDate) query = query.gte("date", range.startDate);
  if (range?.endDate) query = query.lte("date", range.endDate);

  const { data, error } = await query.order("date", { ascending: true });

  if (error) throw error;
  return (data as unknown as ScheduledItemRow[]).map(rowToItem);
}

export async function getScheduledItem(
  supabase: SupabaseClient,
  id: string
): Promise<ScheduledItem | null> {
  const { data, error } = await supabase
    .from("scheduled_items")
    .select(SELECT_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data ? rowToItem(data as unknown as ScheduledItemRow) : null;
}

export async function createScheduledItem(
  supabase: SupabaseClient,
  userId: string,
  item: ScheduledItem
): Promise<ScheduledItem> {
  const { data, error } = await supabase
    .from("scheduled_items")
    .insert({ ...itemToRow(item), user_id: userId })
    .select(SELECT_COLUMNS)
    .single();

  if (error) throw error;
  return rowToItem(data as unknown as ScheduledItemRow);
}

export async function updateScheduledItem(
  supabase: SupabaseClient,
  item: ScheduledItem
): Promise<ScheduledItem | null> {
  const { data, error } = await supabase
    .from("scheduled_items")
    .update(itemToRow(item))
    .eq("id", item.id)
    .select(SELECT_COLUMNS)
    .maybeSingle();

  if (error) throw error;
  return data ? rowToItem(data as unknown as ScheduledItemRow) : null;
}

export async function deleteScheduledItem(
  supabase: SupabaseClient,
  id: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from("scheduled_items")
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) throw error;
  return data !== null;
}

// Read-modify-write: no optimistic concurrency control. Acceptable for a
// single-user app at this stage — a race only occurs if the same user edits
// two occurrences of the same item concurrently from two tabs/devices, and
// the loser's write would silently overwrite the winner's.
export async function updateScheduledItemOccurrence(
  supabase: SupabaseClient,
  itemId: string,
  occurrenceDate: string,
  fields: RecurrenceOccurrenceOverride
): Promise<ScheduledItem | null> {
  const { data: current, error: readError } = await supabase
    .from("scheduled_items")
    .select("recurrence_overrides")
    .eq("id", itemId)
    .maybeSingle();

  if (readError) throw readError;
  if (!current) return null;

  const nextOverrides = {
    ...(current.recurrence_overrides as Record<
      string,
      RecurrenceOccurrenceOverride
    >),
    [occurrenceDate]: fields,
  };

  const { data, error } = await supabase
    .from("scheduled_items")
    .update({ recurrence_overrides: nextOverrides })
    .eq("id", itemId)
    .select(SELECT_COLUMNS)
    .maybeSingle();

  if (error) throw error;
  return data ? rowToItem(data as unknown as ScheduledItemRow) : null;
}

export async function deleteScheduledItemOccurrence(
  supabase: SupabaseClient,
  itemId: string,
  occurrenceDate: string
): Promise<ScheduledItem | null> {
  const { data: current, error: readError } = await supabase
    .from("scheduled_items")
    .select("recurrence_exceptions")
    .eq("id", itemId)
    .maybeSingle();

  if (readError) throw readError;
  if (!current) return null;

  const existing = current.recurrence_exceptions as string[];
  const nextExceptions = existing.includes(occurrenceDate)
    ? existing
    : [...existing, occurrenceDate];

  const { data, error } = await supabase
    .from("scheduled_items")
    .update({ recurrence_exceptions: nextExceptions })
    .eq("id", itemId)
    .select(SELECT_COLUMNS)
    .maybeSingle();

  if (error) throw error;
  return data ? rowToItem(data as unknown as ScheduledItemRow) : null;
}

export async function deleteScheduledItemOccurrences(
  supabase: SupabaseClient,
  itemId: string,
  occurrenceDates: string[]
): Promise<ScheduledItem | null> {
  const { data: current, error: readError } = await supabase
    .from("scheduled_items")
    .select("recurrence_exceptions")
    .eq("id", itemId)
    .maybeSingle();

  if (readError) throw readError;
  if (!current) return null;

  const existing = current.recurrence_exceptions as string[];
  const nextExceptions = [...new Set([...existing, ...occurrenceDates])];

  const { data, error } = await supabase
    .from("scheduled_items")
    .update({ recurrence_exceptions: nextExceptions })
    .eq("id", itemId)
    .select(SELECT_COLUMNS)
    .maybeSingle();

  if (error) throw error;
  return data ? rowToItem(data as unknown as ScheduledItemRow) : null;
}
