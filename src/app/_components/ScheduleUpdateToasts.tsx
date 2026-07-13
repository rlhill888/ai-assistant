"use client";

import type { ScheduleOccurrenceCrud } from "@/lib/types";
import styles from "./ScheduleUpdateToasts.module.css";

export interface ToastEntry {
  key: string;
  crud: ScheduleOccurrenceCrud;
  message: string;
}

export interface ToastBatch {
  batchId: string;
  entries: ToastEntry[];
}

interface ScheduleUpdateToastsProps {
  batch: ToastBatch | null;
}

const ICONS: Record<ScheduleOccurrenceCrud, string> = {
  create: "+",
  update: "~",
  delete: "×",
  read: "i",
};

export default function ScheduleUpdateToasts({ batch }: ScheduleUpdateToastsProps) {
  if (!batch || batch.entries.length === 0) return null;

  return (
    <div className={styles.container}>
      {batch.entries.map((entry, index) => (
        <div
          key={`${batch.batchId}-${entry.key}`}
          className={`${styles.toast} ${styles[entry.crud]}`}
          style={{ animationDelay: `${index * 90}ms` }}
        >
          <span className={styles.icon}>{ICONS[entry.crud]}</span>
          <span className={styles.message}>{entry.message}</span>
        </div>
      ))}
    </div>
  );
}
