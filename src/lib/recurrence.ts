import { addDays, formatDateKey, parseDateKey } from "@/lib/calendarUtils";
import type {
  RecurrenceFrequency,
  RecurrenceOccurrenceOverride,
  ScheduledItem,
} from "@/lib/types";

export interface ScheduledOccurrence {
  item: ScheduledItem; // base/series item
  occurrenceDate: string; // resolved "YYYY-MM-DD" for this specific occurrence
  isRecurring: boolean; // true only for expanded (non-custom) recurrences
  isCustomPending: boolean; // true when recurrence.frequency === "custom"
  title: string;
  allDay: boolean;
  startTime?: string;
  endTime?: string;
  notes?: string;
}

// Safety net against runaway loops on an end-date-less recurrence. Combined
// with estimateStartIndex, real iteration counts are tiny since ranges are
// always bounded (a month grid or a fixed agenda window) — this only
// guards against bugs, not expected usage.
const MAX_OCCURRENCES_PER_ITEM = 500;

function toOccurrence(
  item: ScheduledItem,
  occurrenceDate: string,
  isRecurring: boolean,
  isCustomPending: boolean,
  override?: RecurrenceOccurrenceOverride
): ScheduledOccurrence {
  const source = override ?? item;
  return {
    item,
    occurrenceDate,
    isRecurring,
    isCustomPending,
    title: source.title,
    allDay: source.allDay,
    startTime: source.startTime,
    endTime: source.endTime,
    notes: source.notes,
  };
}

// Adds `monthsToAdd` months to `anchor`, clamping day-of-month to the last
// valid day of the target month (Jan 31 + 1mo -> Feb 28/29; Feb 29 + 1yr in
// a non-leap year -> Feb 28). Always computed from the original anchor, not
// the previous occurrence, so clamping never compounds/drifts across steps.
function addMonthsClamped(anchor: Date, monthsToAdd: number): Date {
  const anchorDay = anchor.getDate();
  const targetMonthIndex = anchor.getMonth() + monthsToAdd;
  const daysInTargetMonth = new Date(
    anchor.getFullYear(),
    targetMonthIndex + 1,
    0
  ).getDate();
  return new Date(
    anchor.getFullYear(),
    targetMonthIndex,
    Math.min(anchorDay, daysInTargetMonth)
  );
}

function occurrenceDateForIndex(
  anchor: Date,
  frequency: RecurrenceFrequency,
  n: number
): Date {
  switch (frequency) {
    case "daily":
      return addDays(anchor, n);
    case "weekly":
      return addDays(anchor, n * 7);
    case "biweekly":
      return addDays(anchor, n * 14);
    case "monthly":
      return addMonthsClamped(anchor, n);
    case "yearly":
      return addMonthsClamped(anchor, n * 12);
    case "custom":
      return anchor; // unreachable — custom is handled before this is called
  }
}

// Estimates the smallest occurrence index whose date could fall at/after
// rangeStart, so we don't iterate from n=0 for an item anchored years ago.
// Off by a 1-step safety margin (subtract 1, clamp to 0) to protect against
// integer-division truncation landing one step past the true boundary.
function estimateStartIndex(
  anchor: Date,
  frequency: RecurrenceFrequency,
  rangeStart: Date
): number {
  if (
    frequency === "daily" ||
    frequency === "weekly" ||
    frequency === "biweekly"
  ) {
    const stepDays = frequency === "daily" ? 1 : frequency === "weekly" ? 7 : 14;
    const diffDays = Math.floor(
      (rangeStart.getTime() - anchor.getTime()) / 86_400_000
    );
    return Math.max(0, Math.floor(diffDays / stepDays) - 1);
  }
  const stepMonths = frequency === "yearly" ? 12 : 1;
  const monthDiff =
    (rangeStart.getFullYear() - anchor.getFullYear()) * 12 +
    (rangeStart.getMonth() - anchor.getMonth());
  return Math.max(0, Math.floor(monthDiff / stepMonths) - 1);
}

export function expandOccurrences(
  item: ScheduledItem,
  rangeStartKey: string,
  rangeEndKey: string
): ScheduledOccurrence[] {
  const { recurrence } = item;

  if (!recurrence) {
    if (item.date >= rangeStartKey && item.date <= rangeEndKey) {
      return [toOccurrence(item, item.date, false, false)];
    }
    return [];
  }

  const exceptionSet = new Set(recurrence.exceptions ?? []);
  const overrides = recurrence.overrides ?? {};

  // Custom is UI-only this pass: no date math at all — render the anchor
  // date as a single, non-expanded occurrence flagged as pending.
  if (recurrence.frequency === "custom") {
    if (
      item.date >= rangeStartKey &&
      item.date <= rangeEndKey &&
      !exceptionSet.has(item.date)
    ) {
      return [toOccurrence(item, item.date, false, true, overrides[item.date])];
    }
    return [];
  }

  const anchor = parseDateKey(item.date);
  const rangeStart = parseDateKey(rangeStartKey);
  const startN = estimateStartIndex(anchor, recurrence.frequency, rangeStart);
  const results: ScheduledOccurrence[] = [];

  for (let n = startN; n < startN + MAX_OCCURRENCES_PER_ITEM; n++) {
    const occDate = occurrenceDateForIndex(anchor, recurrence.frequency, n);
    const dateKey = formatDateKey(occDate);

    if (dateKey > rangeEndKey) break;
    if (recurrence.endDate && dateKey > recurrence.endDate) break;

    if (dateKey >= rangeStartKey && !exceptionSet.has(dateKey)) {
      results.push(toOccurrence(item, dateKey, true, false, overrides[dateKey]));
    }
  }

  return results;
}

export function expandAllOccurrences(
  items: ScheduledItem[],
  rangeStartKey: string,
  rangeEndKey: string
): ScheduledOccurrence[] {
  return items.flatMap((item) =>
    expandOccurrences(item, rangeStartKey, rangeEndKey)
  );
}
