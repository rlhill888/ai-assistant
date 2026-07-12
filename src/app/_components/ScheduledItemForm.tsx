"use client";

import { useEffect, useRef, useState } from "react";
import { formatDateKey } from "@/lib/calendarUtils";
import type { RecurrenceFrequency, RecurrenceRule, ScheduledItem } from "@/lib/types";
import styles from "./ScheduledItemForm.module.css";

interface ScheduledItemFormProps {
  initialItem: ScheduledItem | null;
  defaultDate?: string;
  isOccurrenceEdit?: boolean;
  onSave: (item: ScheduledItem) => Promise<void>;
  onDelete?: () => Promise<void>;
  onClose: () => void;
}

type RepeatsOption = RecurrenceFrequency | "none";

const REPEATS_OPTIONS: { value: RepeatsOption; label: string }[] = [
  { value: "none", label: "Does not repeat" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Bi-weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
  { value: "custom", label: "Custom…" },
];

export default function ScheduledItemForm({
  initialItem,
  defaultDate,
  isOccurrenceEdit = false,
  onSave,
  onDelete,
  onClose,
}: ScheduledItemFormProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  const [title, setTitle] = useState(initialItem?.title ?? "");
  const [date, setDate] = useState(
    initialItem?.date ?? defaultDate ?? formatDateKey(new Date())
  );
  const [allDay, setAllDay] = useState(initialItem?.allDay ?? false);
  const [startTime, setStartTime] = useState(initialItem?.startTime ?? "09:00");
  const [endTime, setEndTime] = useState(initialItem?.endTime ?? "");
  const [notes, setNotes] = useState(initialItem?.notes ?? "");
  const [repeats, setRepeats] = useState<RepeatsOption>(
    initialItem?.recurrence?.frequency ?? "none"
  );
  const [recurrenceEndDate, setRecurrenceEndDate] = useState(
    initialItem?.recurrence?.endDate ?? ""
  );
  const [customDescription, setCustomDescription] = useState(
    initialItem?.recurrence?.customDescription ?? ""
  );
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isSeries = Boolean(initialItem?.recurrence);

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  function handleClose() {
    dialogRef.current?.close();
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    if (!date) {
      setError("Date is required.");
      return;
    }
    if (!allDay && !startTime) {
      setError("Start time is required unless the item is all-day.");
      return;
    }
    if (!allDay && endTime && endTime <= startTime) {
      setError("End time must be after the start time.");
      return;
    }
    if (!isOccurrenceEdit && repeats !== "none" && recurrenceEndDate && recurrenceEndDate < date) {
      setError("End date must be on or after the start date.");
      return;
    }
    if (!isOccurrenceEdit && repeats === "custom" && !customDescription.trim()) {
      setError("Please describe how often this repeats.");
      return;
    }

    const recurrence: RecurrenceRule | undefined = isOccurrenceEdit
      ? initialItem?.recurrence
      : repeats === "none"
        ? undefined
        : {
            frequency: repeats,
            endDate: recurrenceEndDate || undefined,
            customDescription:
              repeats === "custom" ? customDescription.trim() || undefined : undefined,
            exceptions: initialItem?.recurrence?.exceptions,
            overrides: initialItem?.recurrence?.overrides,
          };

    const item: ScheduledItem = {
      id: initialItem?.id ?? crypto.randomUUID(),
      title: title.trim(),
      date,
      allDay,
      startTime: allDay ? undefined : startTime,
      endTime: allDay ? undefined : endTime || undefined,
      notes: notes.trim() || undefined,
      recurrence,
    };

    setError(null);
    setIsSubmitting(true);
    try {
      await onSave(item);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save item.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!onDelete) return;
    const confirmText = isOccurrenceEdit
      ? "Delete this occurrence only? Other occurrences won't be affected."
      : isSeries
        ? "Delete this entire recurring series?"
        : "Delete this item?";
    if (!window.confirm(confirmText)) return;

    setError(null);
    setIsSubmitting(true);
    try {
      await onDelete();
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete item.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const headerText = isOccurrenceEdit
    ? "Edit occurrence"
    : initialItem
      ? "Edit item"
      : "New item";

  return (
    <dialog
      className={styles.dialog}
      ref={dialogRef}
      onClose={onClose}
      onCancel={onClose}
    >
      <form className={styles.form} onSubmit={handleSubmit}>
        <h2>{headerText}</h2>
        {error && <p className={styles.error}>{error}</p>}
        <label>
          Title
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </label>
        <label>
          Date
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            disabled={isOccurrenceEdit}
          />
        </label>
        {isOccurrenceEdit && (
          <p className={styles.hint}>
            Editing this occurrence only — the date can&apos;t be changed here.
          </p>
        )}
        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={allDay}
            onChange={(e) => setAllDay(e.target.checked)}
          />
          All day
        </label>
        {!allDay && (
          <>
            <label>
              Start time
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required={!allDay}
              />
            </label>
            <label>
              End time (optional)
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </label>
          </>
        )}
        <label>
          Notes
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </label>
        {!isOccurrenceEdit && (
          <>
            <label>
              Repeats
              <select
                value={repeats}
                onChange={(e) => setRepeats(e.target.value as RepeatsOption)}
              >
                {REPEATS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            {repeats !== "none" && (
              <label>
                Ends on (optional)
                <input
                  type="date"
                  value={recurrenceEndDate}
                  onChange={(e) => setRecurrenceEndDate(e.target.value)}
                />
              </label>
            )}
            {repeats === "custom" && (
              <label>
                Describe how often
                <input
                  type="text"
                  value={customDescription}
                  onChange={(e) => setCustomDescription(e.target.value)}
                  placeholder="e.g. every other Tuesday"
                />
              </label>
            )}
          </>
        )}
        <div className={styles.actions}>
          {onDelete && (
            <button
              type="button"
              className={styles.deleteButton}
              onClick={handleDelete}
              disabled={isSubmitting}
            >
              Delete
            </button>
          )}
          <div className={styles.actionsRight}>
            <button
              type="button"
              className={styles.cancelButton}
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button type="submit" className={styles.saveButton} disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </form>
    </dialog>
  );
}
