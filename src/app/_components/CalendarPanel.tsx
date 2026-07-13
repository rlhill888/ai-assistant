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
  | {
      kind: "edit-recurring";
      item: ScheduledItem;
      occurrenceDate: string;
      editItem: ScheduledItem;
    };

type ScopePrompt = {
  action: "save" | "delete";
  item: ScheduledItem;
  occurrenceDate: string;
  formItem?: ScheduledItem;
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
  const [scopePrompt, setScopePrompt] = useState<ScopePrompt | null>(null);
  const [scopeSubmitting, setScopeSubmitting] = useState(false);
  const [scopeError, setScopeError] = useState<string | null>(null);

  function handleSelectOccurrence(occurrence: ScheduledOccurrence) {
    if (occurrence.item.recurrence) {
      setFormMode({
        kind: "edit-recurring",
        item: occurrence.item,
        occurrenceDate: occurrence.occurrenceDate,
        editItem: {
          id: occurrence.item.id,
          title: occurrence.title,
          date: occurrence.item.date,
          allDay: occurrence.allDay,
          startTime: occurrence.startTime,
          endTime: occurrence.endTime,
          notes: occurrence.notes,
          recurrence: occurrence.item.recurrence,
        },
      });
    } else {
      setFormMode({ kind: "edit-plain", item: occurrence.item });
    }
  }

  function closeForm() {
    setFormMode(null);
  }

  function closeScopePrompt() {
    setScopePrompt(null);
    setScopeError(null);
  }

  async function handleSave(formItem: ScheduledItem) {
    if (formMode?.kind === "edit-recurring") {
      setScopeError(null);
      setScopePrompt({
        action: "save",
        item: formMode.item,
        occurrenceDate: formMode.occurrenceDate,
        formItem,
      });
      return;
    }
    if (formMode?.kind === "edit-plain") {
      await onUpdateItem(formItem);
    } else {
      await onCreateItem(formItem);
    }
  }

  async function handleDelete() {
    if (formMode?.kind === "edit-recurring") {
      setScopeError(null);
      setScopePrompt({
        action: "delete",
        item: formMode.item,
        occurrenceDate: formMode.occurrenceDate,
      });
      return;
    }
    if (formMode?.kind === "edit-plain") {
      await onDeleteItem(formMode.item.id);
    }
  }

  async function handleChooseOccurrence() {
    if (!scopePrompt) return;
    setScopeSubmitting(true);
    setScopeError(null);
    try {
      if (scopePrompt.action === "save" && scopePrompt.formItem) {
        await onUpdateOccurrence(scopePrompt.item.id, scopePrompt.occurrenceDate, {
          title: scopePrompt.formItem.title,
          allDay: scopePrompt.formItem.allDay,
          startTime: scopePrompt.formItem.startTime,
          endTime: scopePrompt.formItem.endTime,
          notes: scopePrompt.formItem.notes,
        });
      } else if (scopePrompt.action === "delete") {
        await onDeleteOccurrence(scopePrompt.item.id, scopePrompt.occurrenceDate);
      }
      setScopePrompt(null);
    } catch (err) {
      setScopeError(err instanceof Error ? err.message : "Failed to save changes.");
    } finally {
      setScopeSubmitting(false);
    }
  }

  async function handleChooseSeries() {
    if (!scopePrompt) return;
    setScopeSubmitting(true);
    setScopeError(null);
    try {
      if (scopePrompt.action === "save" && scopePrompt.formItem) {
        await onUpdateItem(scopePrompt.formItem);
      } else if (scopePrompt.action === "delete") {
        await onDeleteItem(scopePrompt.item.id);
      }
      setScopePrompt(null);
    } catch (err) {
      setScopeError(err instanceof Error ? err.message : "Failed to save changes.");
    } finally {
      setScopeSubmitting(false);
    }
  }

  const initialItem =
    formMode?.kind === "create"
      ? null
      : formMode?.kind === "edit-recurring"
        ? formMode.editItem
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
          description={
            scopePrompt.action === "delete"
              ? "Delete just this occurrence, or the entire series?"
              : "Apply your change to just this occurrence, or the entire series?"
          }
          error={scopeError}
          isSubmitting={scopeSubmitting}
          onChooseOccurrence={handleChooseOccurrence}
          onChooseSeries={handleChooseSeries}
          onClose={closeScopePrompt}
        />
      )}

      {formMode && (
        <ScheduledItemForm
          initialItem={initialItem}
          defaultDate={formMode.kind === "create" ? formMode.defaultDate : undefined}
          isRecurringEdit={formMode.kind === "edit-recurring"}
          onSave={handleSave}
          onDelete={formMode.kind !== "create" ? handleDelete : undefined}
          onClose={closeForm}
        />
      )}
    </div>
  );
}
