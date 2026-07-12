import type { ScheduledItem } from "@/lib/types";

export interface MonthGridDay {
  date: Date;
  dateKey: string;
  isCurrentMonth: boolean;
}

export function formatTimeFrame(
  item: Pick<ScheduledItem, "allDay" | "startTime" | "endTime">
): string | undefined {
  if (item.allDay) return undefined;
  if (!item.startTime) return undefined;
  return item.endTime ? `${item.startTime}–${item.endTime}` : item.startTime;
}

export function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addMonths(date: Date, amount: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

export function addDays(date: Date, amount: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount);
}

export function parseDateKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function isToday(dateKey: string): boolean {
  return dateKey === formatDateKey(new Date());
}

export function getMonthGridDays(monthDate: Date): MonthGridDay[] {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();

  const firstOfMonth = new Date(year, month, 1);
  const startOffset = firstOfMonth.getDay(); // 0 = Sunday
  const gridStart = new Date(year, month, 1 - startOffset);

  const days: MonthGridDay[] = [];
  for (let i = 0; i < 42; i++) {
    const date = new Date(
      gridStart.getFullYear(),
      gridStart.getMonth(),
      gridStart.getDate() + i
    );
    days.push({
      date,
      dateKey: formatDateKey(date),
      isCurrentMonth: date.getMonth() === month,
    });
  }
  return days;
}
