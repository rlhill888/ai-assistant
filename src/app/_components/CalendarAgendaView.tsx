"use client";

import { formatDateKey, formatTimeFrame } from "@/lib/calendarUtils";
import type { ScheduledItem } from "@/lib/types";
import styles from "./CalendarAgendaView.module.css";

interface CalendarAgendaViewProps {
  items: ScheduledItem[];
  onSelectItem: (item: ScheduledItem) => void;
}

export default function CalendarAgendaView({
  items,
  onSelectItem,
}: CalendarAgendaViewProps) {
  const today = formatDateKey(new Date());

  const upcoming = items
    .filter((item) => item.date >= today)
    .sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return (a.startTime ?? "").localeCompare(b.startTime ?? "");
    });

  if (upcoming.length === 0) {
    return <p className={styles.empty}>No upcoming items.</p>;
  }

  const groups = new Map<string, ScheduledItem[]>();
  for (const item of upcoming) {
    const existing = groups.get(item.date) ?? [];
    existing.push(item);
    groups.set(item.date, existing);
  }

  return (
    <div>
      {Array.from(groups.entries()).map(([date, dateItems]) => (
        <div key={date} className={styles.group}>
          <div className={styles.groupHeading}>
            {new Date(`${date}T00:00:00`).toLocaleDateString([], {
              weekday: "short",
              month: "short",
              day: "numeric",
            })}
          </div>
          {dateItems.map((item) => (
            <button
              key={item.id}
              type="button"
              className={styles.itemRow}
              onClick={() => onSelectItem(item)}
            >
              <span className={styles.time}>
                {item.allDay ? "All day" : formatTimeFrame(item)}
              </span>
              <span className={styles.title}>{item.title}</span>
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}
