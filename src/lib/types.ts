export type TabId = "assistant" | "calendar";

export type CalendarViewMode = "month" | "agenda";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  timestamp: number;
}

export type RecurrenceFrequency =
  | "daily"
  | "weekly"
  | "biweekly"
  | "monthly"
  | "yearly"
  | "custom";

// Full field snapshot (not a sparse diff) — avoids merge ambiguity and maps
// 1:1 onto the form's editable fields.
export type RecurrenceOccurrenceOverride = Pick<
  ScheduledItem,
  "title" | "allDay" | "startTime" | "endTime" | "notes"
>;

export interface RecurrenceRule {
  frequency: RecurrenceFrequency;
  endDate?: string; // "YYYY-MM-DD", inclusive; omitted = indefinite
  customDescription?: string; // only meaningful when frequency === "custom"; never parsed
  exceptions?: string[]; // dateKeys skipped via "this occurrence only" delete
  overrides?: Record<string, RecurrenceOccurrenceOverride>; // dateKey -> snapshot
}

export interface ScheduledItem {
  id: string;
  title: string;
  date: string; // "YYYY-MM-DD" — anchor date (first occurrence for recurring items)
  allDay: boolean;
  startTime?: string; // "HH:mm", required when !allDay
  endTime?: string; // "HH:mm", optional time frame end
  notes?: string;
  recurrence?: RecurrenceRule;
}
