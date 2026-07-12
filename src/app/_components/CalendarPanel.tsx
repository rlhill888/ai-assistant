"use client";

import { useState } from "react";
import type { CalendarViewMode, ScheduledItem } from "@/lib/types";
import CalendarMonthView from "./CalendarMonthView";
import CalendarAgendaView from "./CalendarAgendaView";
import ScheduledItemForm from "./ScheduledItemForm";
import styles from "./CalendarPanel.module.css";

interface CalendarPanelProps {
  items: ScheduledItem[];
  onCreateItem: (item: ScheduledItem) => void;
  onUpdateItem: (item: ScheduledItem) => void;
  onDeleteItem: (id: string) => void;
}

export default function CalendarPanel({
  items,
  onCreateItem,
  onUpdateItem,
  onDeleteItem,
}: CalendarPanelProps) {
  const [viewMode, setViewMode] = useState<CalendarViewMode>("month");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ScheduledItem | null>(null);
  const [formDefaultDate, setFormDefaultDate] = useState<string | undefined>();

  function openCreateForm(defaultDate?: string) {
    setEditingItem(null);
    setFormDefaultDate(defaultDate);
    setIsFormOpen(true);
  }

  function openEditForm(item: ScheduledItem) {
    setEditingItem(item);
    setFormDefaultDate(undefined);
    setIsFormOpen(true);
  }

  function closeForm() {
    setIsFormOpen(false);
    setEditingItem(null);
    setFormDefaultDate(undefined);
  }

  function handleSave(item: ScheduledItem) {
    if (editingItem) {
      onUpdateItem(item);
    } else {
      onCreateItem(item);
    }
  }

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
          onClick={() => openCreateForm()}
        >
          New item
        </button>
      </div>

      {viewMode === "month" ? (
        <CalendarMonthView
          items={items}
          onSelectDay={(dateKey) => openCreateForm(dateKey)}
          onSelectItem={openEditForm}
        />
      ) : (
        <CalendarAgendaView items={items} onSelectItem={openEditForm} />
      )}

      {isFormOpen && (
        <ScheduledItemForm
          initialItem={editingItem}
          defaultDate={formDefaultDate}
          onSave={handleSave}
          onDelete={editingItem ? () => onDeleteItem(editingItem.id) : undefined}
          onClose={closeForm}
        />
      )}
    </div>
  );
}
