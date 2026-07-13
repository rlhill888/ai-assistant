"use client";

import { useEffect, useRef, useState } from "react";
import ChatPanel from "./_components/ChatPanel";
import CalendarPanel from "./_components/CalendarPanel";
import ScheduleUpdateToasts, {
  type ToastBatch,
} from "./_components/ScheduleUpdateToasts";
import type {
  ChatMessage,
  RecurrenceOccurrenceOverride,
  ScheduledItem,
  ScheduleOccurrenceChanges,
  TabId,
} from "@/lib/types";
import styles from "./page.module.css";

const TOAST_DISPLAY_MS = 5000;

async function extractErrorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const body = await res.json();
    return typeof body?.error === "string" ? body.error : fallback;
  } catch {
    return fallback;
  }
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabId>("calendar");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatSending, setChatSending] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [items, setItems] = useState<ScheduledItem[]>([]);
  const [itemsLoading, setItemsLoading] = useState(true);
  const [itemsError, setItemsError] = useState<string | null>(null);
  const [toastBatch, setToastBatch] = useState<ToastBatch | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showScheduleUpdateToasts(scheduleOccurrences: ScheduleOccurrenceChanges) {
    const entries = Object.entries(scheduleOccurrences)
      .filter(([, change]) => change.crud !== "read")
      .map(([key, change]) => ({
        key,
        crud: change.crud,
        message: change.updateMessage,
      }));
    if (entries.length === 0) return;

    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToastBatch({ batchId: crypto.randomUUID(), entries });
    toastTimerRef.current = setTimeout(
      () => setToastBatch(null),
      TOAST_DISPLAY_MS + entries.length * 90 + 400
    );
  }

  useEffect(() => {
    let cancelled = false;

    fetch("/api/schedule")
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(await extractErrorMessage(res, "Failed to load items"));
        }
        const { items } = await res.json();
        if (!cancelled) setItems(items);
      })
      .catch((err: Error) => {
        if (!cancelled) setItemsError(err.message);
      })
      .finally(() => {
        if (!cancelled) setItemsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/chat")
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(await extractErrorMessage(res, "Failed to load chat history"));
        }
        const { messages } = await res.json();
        if (!cancelled) setMessages(messages);
      })
      .catch((err: Error) => {
        if (!cancelled) setChatError(err.message);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSendMessage(text: string) {
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      text,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setChatError(null);
    setChatSending(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) {
        throw new Error(await extractErrorMessage(res, "Failed to send message"));
      }
      const { message, items, scheduleOccurrences } = await res.json();
      setMessages((prev) => [...prev, message]);
      if (items) setItems(items);
      if (scheduleOccurrences) showScheduleUpdateToasts(scheduleOccurrences);
    } catch (err) {
      setChatError(err instanceof Error ? err.message : "Failed to send message");
    } finally {
      setChatSending(false);
    }
  }

  async function handleCreateItem(item: ScheduledItem) {
    const res = await fetch("/api/schedule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(item),
    });
    if (!res.ok) {
      throw new Error(await extractErrorMessage(res, "Failed to create item"));
    }
    const { item: created } = await res.json();
    setItems((prev) => [...prev, created]);
  }

  async function handleUpdateItem(item: ScheduledItem) {
    const res = await fetch(`/api/schedule/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(item),
    });
    if (!res.ok) {
      throw new Error(await extractErrorMessage(res, "Failed to update item"));
    }
    const { item: updated } = await res.json();
    setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
  }

  async function handleDeleteItem(id: string) {
    const res = await fetch(`/api/schedule/${id}`, { method: "DELETE" });
    if (!res.ok) {
      throw new Error(await extractErrorMessage(res, "Failed to delete item"));
    }
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  async function handleUpdateOccurrence(
    itemId: string,
    occurrenceDate: string,
    fields: RecurrenceOccurrenceOverride
  ) {
    const res = await fetch(`/api/schedule/${itemId}/occurrence`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ occurrenceDate, fields }),
    });
    if (!res.ok) {
      throw new Error(await extractErrorMessage(res, "Failed to update occurrence"));
    }
    const { item: updated } = await res.json();
    setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
  }

  async function handleDeleteOccurrence(itemId: string, occurrenceDate: string) {
    const res = await fetch(
      `/api/schedule/${itemId}/occurrence?date=${encodeURIComponent(occurrenceDate)}`,
      { method: "DELETE" }
    );
    if (!res.ok) {
      throw new Error(await extractErrorMessage(res, "Failed to delete occurrence"));
    }
    const { item: updated } = await res.json();
    setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
  }

  return (
    <div className={styles.page}>
      <div className={styles.tabs}>
        <button
          type="button"
          className={`${styles.tab} ${
            activeTab === "calendar" ? styles.tabActive : ""
          }`}
          onClick={() => setActiveTab("calendar")}
        >
          Calendar
        </button>
        <button
          type="button"
          className={`${styles.tab} ${
            activeTab === "assistant" ? styles.tabActive : ""
          }`}
          onClick={() => setActiveTab("assistant")}
        >
          Message AI Assistant
        </button>
      </div>

      <div className={styles.panel} hidden={activeTab !== "assistant"}>
        {chatError && <p>{chatError}</p>}
        <ChatPanel
          messages={messages}
          onSendMessage={handleSendMessage}
          isSending={chatSending}
        />
        <ScheduleUpdateToasts batch={toastBatch} />
      </div>
      <div className={styles.panel} hidden={activeTab !== "calendar"}>
        {itemsLoading && <p>Loading…</p>}
        {itemsError && <p>{itemsError}</p>}
        {!itemsLoading && !itemsError && (
          <CalendarPanel
            items={items}
            onCreateItem={handleCreateItem}
            onUpdateItem={handleUpdateItem}
            onDeleteItem={handleDeleteItem}
            onUpdateOccurrence={handleUpdateOccurrence}
            onDeleteOccurrence={handleDeleteOccurrence}
          />
        )}
      </div>
    </div>
  );
}
