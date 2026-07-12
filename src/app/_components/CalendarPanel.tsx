"use client";

import { useState } from "react";
import type {
  CalendarViewMode,
  RecurrenceOccurrenceOverride,
  ScheduledItem,
} from "@/lib/types";
import type { ScheduledOccurrence } from "@/lib/recurrence";
import CalendarMonthView from "./CalendarMonthView";
import CalendarAgendaView from "./CalendarAgendaView";
import ScheduledItemForm from "./ScheduledItemForm";
import RecurrenceScopeDialog from "./RecurrenceScopeDialog";
import styles from "./CalendarPanel.module.css";

interface CalendarPanelProps {
  items: ScheduledItem[];
  onCreateItem: (item: ScheduledItem) => Promise<void>;
  onUpdateItem: (item: ScheduledItem) => Promise<void>;
  onDeleteItem: (id: string) => Promise<void>;
  onUpdateOccurrence: (
    itemId: string,
    occurrenceDate: string,
    fields: RecurrenceOccurrenceOverride
  ) => Promise<void>;
  onDeleteOccurrence: (itemId: string, occurrenceDate: string) => Promise<void>;
}

type FormMode =
  | { kind: "create"; defaultDate?: string }
  | { kind: "edit-plain"; item: ScheduledItem }
  | { kind: "edit-series"; item: ScheduledItem }
  | {
      kind: "edit-occurrence";
      item: ScheduledItem;
      occurrenceDate: string;
      synthetic: ScheduledItem;
    };

export default function CalendarPanel({
  items,
  onCreateItem,
  onUpdateItem,
  onDeleteItem,
  onUpdateOccurrence,
  onDeleteOccurrence,
}: CalendarPanelProps) {
  const [viewMode, setViewMode] = useState<CalendarViewMode>("month");
  const [formMode, setFormMode] = useState<FormMode | null>(null);
  const [scopePrompt, setScopePrompt] = useState<{
    occurrence: ScheduledOccurrence;
  } | null>(null);

  function handleSelectOccurrence(occurrence: ScheduledOccurrence) {
    if (occurrence.item.recurrence) {
      setScopePrompt({ occurrence });
    } else {
      setFormMode({ kind: "edit-plain", item: occurrence.item });
    }
  }

  function handleChooseOccurrence() {
    const { occurrence } = scopePrompt!;
    setFormMode({
      kind: "edit-occurrence",
      item: occurrence.item,
      occurrenceDate: occurrence.occurrenceDate,
      synthetic: {
        id: occurrence.item.id,
        title: occurrence.title,
        date: occurrence.occurrenceDate,
        allDay: occurrence.allDay,
        startTime: occurrence.startTime,
        endTime: occurrence.endTime,
        notes: occurrence.notes,
        recurrence: occurrence.item.recurrence,
      },
    });
    setScopePrompt(null);
  }

  function handleChooseSeries() {
    setFormMode({ kind: "edit-series", item: scopePrompt!.occurrence.item });
    setScopePrompt(null);
  }

  function closeForm() {
    setFormMode(null);
  }

  async function handleSave(formItem: ScheduledItem) {
    if (formMode?.kind === "edit-occurrence") {
      await onUpdateOccurrence(formMode.item.id, formMode.occurrenceDate, {
        title: formItem.title,
        allDay: formItem.allDay,
        startTime: formItem.startTime,
        endTime: formItem.endTime,
        notes: formItem.notes,
      });
    } else if (formMode?.kind === "edit-plain" || formMode?.kind === "edit-series") {
      await onUpdateItem(formItem);
    } else {
      await onCreateItem(formItem);
    }
  }

  async function handleDelete() {
    if (formMode?.kind === "edit-occurrence") {
      await onDeleteOccurrence(formMode.item.id, formMode.occurrenceDate);
    } else if (formMode?.kind === "edit-plain" || formMode?.kind === "edit-series") {
      await onDeleteItem(formMode.item.id);
    }
  }

  const initialItem =
    formMode?.kind === "create"
      ? null
      : formMode?.kind === "edit-occurrence"
        ? formMode.synthetic
        : (formMode?.item ?? null);

  return (
    <div>
      <div className={styles.header}>
        <div className={styles.viewSwitcher}>
          <button
            type="button"
            className={`${styles.viewButton} ${
              viewMode === "month" ? styles.viewButtonActive : ""
            }`}
            onClick={() => setViewMode("month")}
          >
            Month
          </button>
          <button
            type="button"
            className={`${styles.viewButton} ${
              viewMode === "agenda" ? styles.viewButtonActive : ""
            }`}
            onClick={() => setViewMode("agenda")}
          >
            Agenda
          </button>
        </div>
        <button
          type="button"
          className={styles.newButton}
          onClick={() => setFormMode({ kind: "create" })}
        >
          New item
        </button>
      </div>

      {viewMode === "month" ? (
        <CalendarMonthView
          items={items}
          onSelectDay={(dateKey) => setFormMode({ kind: "create", defaultDate: dateKey })}
          onSelectOccurrence={handleSelectOccurrence}
        />
      ) : (
        <CalendarAgendaView items={items} onSelectOccurrence={handleSelectOccurrence} />
      )}

      {scopePrompt && (
        <RecurrenceScopeDialog
          onChooseOccurrence={handleChooseOccurrence}
          onChooseSeries={handleChooseSeries}
          onClose={() => setScopePrompt(null)}
        />
      )}

      {formMode && (
        <ScheduledItemForm
          initialItem={initialItem}
          defaultDate={formMode.kind === "create" ? formMode.defaultDate : undefined}
          isOccurrenceEdit={formMode.kind === "edit-occurrence"}
          onSave={handleSave}
          onDelete={formMode.kind !== "create" ? handleDelete : undefined}
          onClose={closeForm}
        />
      )}
    </div>
  );
}
