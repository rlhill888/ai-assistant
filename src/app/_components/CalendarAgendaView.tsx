"use client";

import { addDays, formatDateKey, formatTimeFrame } from "@/lib/calendarUtils";
import { expandAllOccurrences, type ScheduledOccurrence } from "@/lib/recurrence";
import type { ScheduledItem } from "@/lib/types";
import styles from "./CalendarAgendaView.module.css";

interface CalendarAgendaViewProps {
  items: ScheduledItem[];
  onSelectOccurrence: (occurrence: ScheduledOccurrence) => void;
}

// Bounds how far ahead we expand recurring items for the "upcoming" list —
// keeps render cost bounded for indefinite recurrences and covers typical
// upcoming horizons.
const AGENDA_WINDOW_DAYS = 90;

export default function CalendarAgendaView({
  items,
  onSelectOccurrence,
}: CalendarAgendaViewProps) {
  const today = formatDateKey(new Date());
  const rangeEnd = formatDateKey(addDays(new Date(), AGENDA_WINDOW_DAYS - 1));

  const upcoming = expandAllOccurrences(items, today, rangeEnd).sort((a, b) => {
    if (a.occurrenceDate !== b.occurrenceDate) {
      return a.occurrenceDate.localeCompare(b.occurrenceDate);
    }
    return (a.startTime ?? "").localeCompare(b.startTime ?? "");
  });

  if (upcoming.length === 0) {
    return <p className={styles.empty}>No upcoming items.</p>;
  }

  const groups = new Map<string, ScheduledOccurrence[]>();
  for (const occ of upcoming) {
    const existing = groups.get(occ.occurrenceDate) ?? [];
    existing.push(occ);
    groups.set(occ.occurrenceDate, existing);
  }

  return (
    <div>
      {Array.from(groups.entries()).map(([date, dateOccurrences]) => (
        <div key={date} className={styles.group}>
          <div className={styles.groupHeading}>
            {new Date(`${date}T00:00:00`).toLocaleDateString([], {
              weekday: "short",
              month: "short",
              day: "numeric",
            })}
          </div>
          {dateOccurrences.map((occ) => (
            <button
              key={`${occ.item.id}-${occ.occurrenceDate}`}
              type="button"
              className={styles.itemRow}
              onClick={() => onSelectOccurrence(occ)}
            >
              <span className={styles.time}>
                {occ.allDay ? "All day" : formatTimeFrame(occ)}
              </span>
              <span className={styles.title}>
                {(occ.isRecurring || occ.isCustomPending) && (
                  <span className={styles.repeatIcon}>↻</span>
                )}
                {occ.title}
              </span>
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}
