"use client";

import { useEffect, useRef, useState } from "react";
import { formatDateKey } from "@/lib/calendarUtils";
import type { ScheduledItem } from "@/lib/types";
import styles from "./ScheduledItemForm.module.css";

interface ScheduledItemFormProps {
  initialItem: ScheduledItem | null;
  defaultDate?: string;
  onSave: (item: ScheduledItem) => void;
  onDelete?: () => void;
  onClose: () => void;
}

export default function ScheduledItemForm({
  initialItem,
  defaultDate,
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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  function handleClose() {
    dialogRef.current?.close();
    onClose();
  }

  function handleSubmit(e: React.FormEvent) {
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

    const item: ScheduledItem = {
      id: initialItem?.id ?? crypto.randomUUID(),
      title: title.trim(),
      date,
      allDay,
      startTime: allDay ? undefined : startTime,
      endTime: allDay ? undefined : endTime || undefined,
      notes: notes.trim() || undefined,
    };

    onSave(item);
    handleClose();
  }

  function handleDelete() {
    if (!onDelete) return;
    if (window.confirm("Delete this item?")) {
      onDelete();
      handleClose();
    }
  }

  return (
    <dialog
      className={styles.dialog}
      ref={dialogRef}
      onClose={onClose}
      onCancel={onClose}
    >
      <form className={styles.form} onSubmit={handleSubmit}>
        <h2>{initialItem ? "Edit item" : "New item"}</h2>
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
          />
        </label>
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
        <div className={styles.actions}>
          {onDelete && (
            <button
              type="button"
              className={styles.deleteButton}
              onClick={handleDelete}
            >
              Delete
            </button>
          )}
          <div className={styles.actionsRight}>
            <button
              type="button"
              className={styles.cancelButton}
              onClick={handleClose}
            >
              Cancel
            </button>
            <button type="submit" className={styles.saveButton}>
              Save
            </button>
          </div>
        </div>
      </form>
    </dialog>
  );
}
