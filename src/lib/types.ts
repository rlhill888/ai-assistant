export type TabId = "assistant" | "calendar";

export type CalendarViewMode = "month" | "agenda";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  timestamp: number;
}

export interface ScheduledItem {
  id: string;
  title: string;
  date: string; // "YYYY-MM-DD"
  allDay: boolean;
  startTime?: string; // "HH:mm", required when !allDay
  endTime?: string; // "HH:mm", optional time frame end
  notes?: string;
}
