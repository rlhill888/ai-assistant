"use client";

import { useState } from "react";
import {
  addMonths,
  formatTimeFrame,
  getMonthGridDays,
  isToday,
} from "@/lib/calendarUtils";
import { expandAllOccurrences, type ScheduledOccurrence } from "@/lib/recurrence";
import type { ScheduledItem } from "@/lib/types";
import styles from "./CalendarMonthView.module.css";

interface CalendarMonthViewProps {
  items: ScheduledItem[];
  onSelectDay: (dateKey: string) => void;
  onSelectOccurrence: (occurrence: ScheduledOccurrence) => void;
}

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function CalendarMonthView({
  items,
  onSelectDay,
  onSelectOccurrence,
}: CalendarMonthViewProps) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const days = getMonthGridDays(currentMonth);
  const occurrences = expandAllOccurrences(
    items,
    days[0].dateKey,
    days[days.length - 1].dateKey
  );
  const occurrencesByDate = new Map<string, ScheduledOccurrence[]>();
  for (const occ of occurrences) {
    const existing = occurrencesByDate.get(occ.occurrenceDate) ?? [];
    existing.push(occ);
    occurrencesByDate.set(occ.occurrenceDate, existing);
  }

  const monthLabel = currentMonth.toLocaleDateString([], {
    month: "long",
    year: "numeric",
  });

  return (
    <div>
      <div className={styles.monthHeader}>
        <span className={styles.monthLabel}>{monthLabel}</span>
        <div className={styles.monthNav}>
          <button
            type="button"
            className={styles.navButton}
            onClick={() => setCurrentMonth((prev) => addMonths(prev, -1))}
          >
            Prev
          </button>
          <button
            type="button"
            className={styles.navButton}
            onClick={() => {
              const now = new Date();
              setCurrentMonth(new Date(now.getFullYear(), now.getMonth(), 1));
            }}
          >
            Today
          </button>
          <button
            type="button"
            className={styles.navButton}
            onClick={() => setCurrentMonth((prev) => addMonths(prev, 1))}
          >
            Next
          </button>
        </div>
      </div>

      <div className={styles.weekdays}>
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className={styles.weekday}>
            {label}
          </div>
        ))}
      </div>

      <div className={styles.grid}>
        {days.map((day) => (
          <button
            key={day.dateKey}
            type="button"
            className={`${styles.day} ${
              day.isCurrentMonth ? "" : styles.dayOtherMonth
            } ${isToday(day.dateKey) ? styles.dayToday : ""}`}
            onClick={() => {
              if (day.isCurrentMonth) onSelectDay(day.dateKey);
            }}
          >
            <span className={styles.dayNumber}>{day.date.getDate()}</span>
            <div className={styles.dayItems}>
              {(occurrencesByDate.get(day.dateKey) ?? []).map((occ) => {
                const timeFrame = formatTimeFrame(occ);
                return (
                  <span
                    key={`${occ.item.id}-${occ.occurrenceDate}`}
                    className={styles.itemPill}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectOccurrence(occ);
                    }}
                  >
                    {(occ.isRecurring || occ.isCustomPending) && (
                      <span className={styles.repeatIcon}>↻</span>
                    )}
                    {timeFrame && (
                      <span className={styles.itemPillTime}>{timeFrame} </span>
                    )}
                    {occ.title}
                  </span>
                );
              })}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
