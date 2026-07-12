"use client";

import { useState } from "react";
import ChatPanel from "./_components/ChatPanel";
import CalendarPanel from "./_components/CalendarPanel";
import { createSeedScheduledItems } from "@/lib/mockScheduledItems";
import { pickCannedReply } from "@/lib/chatReplies";
import type { ChatMessage, ScheduledItem, TabId } from "@/lib/types";
import styles from "./page.module.css";

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabId>("calendar");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [items, setItems] = useState<ScheduledItem[]>(() =>
    createSeedScheduledItems()
  );

  function handleSendMessage(text: string) {
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      text,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMessage]);

    setTimeout(() => {
      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        text: pickCannedReply(),
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    }, 500);
  }

  function handleCreateItem(item: ScheduledItem) {
    setItems((prev) => [...prev, item]);
  }

  function handleUpdateItem(item: ScheduledItem) {
    setItems((prev) => prev.map((i) => (i.id === item.id ? item : i)));
  }

  function handleDeleteItem(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
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
          AI Assistant
        </button>
      </div>

      <div className={styles.panel} hidden={activeTab !== "assistant"}>
        <ChatPanel messages={messages} onSendMessage={handleSendMessage} />
      </div>
      <div className={styles.panel} hidden={activeTab !== "calendar"}>
        <CalendarPanel
          items={items}
          onCreateItem={handleCreateItem}
          onUpdateItem={handleUpdateItem}
          onDeleteItem={handleDeleteItem}
        />
      </div>
    </div>
  );
}
