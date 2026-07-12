import { formatDateKey } from "@/lib/calendarUtils";
import type { ScheduledItem } from "@/lib/types";

function daysFromToday(offset: number): string {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return formatDateKey(date);
}

export function createSeedScheduledItems(): ScheduledItem[] {
  return [
    {
      id: crypto.randomUUID(),
      title: "Team standup",
      date: daysFromToday(0),
      allDay: false,
      startTime: "09:30",
      endTime: "10:00",
      notes: "Daily sync with the team.",
    },
    {
      id: crypto.randomUUID(),
      title: "Dentist appointment",
      date: daysFromToday(1),
      allDay: false,
      startTime: "14:00",
    },
    {
      id: crypto.randomUUID(),
      title: "Company offsite",
      date: daysFromToday(3),
      allDay: true,
    },
    {
      id: crypto.randomUUID(),
      title: "Project deadline",
      date: daysFromToday(5),
      allDay: false,
      startTime: "17:00",
      notes: "Submit final deliverables.",
    },
    {
      id: crypto.randomUUID(),
      title: "Out of office",
      date: daysFromToday(8),
      allDay: true,
    },
    {
      id: crypto.randomUUID(),
      title: "Quarterly review",
      date: daysFromToday(-3),
      allDay: false,
      startTime: "11:00",
      endTime: "12:30",
      notes: "Past item to demonstrate month-view history.",
    },
  ];
}
