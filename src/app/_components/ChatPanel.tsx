"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ChatMessage } from "@/lib/types";
import styles from "./ChatPanel.module.css";

interface ChatPanelProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  isSending?: boolean;
}

export default function ChatPanel({
  messages,
  onSendMessage,
  isSending = false,
}: ChatPanelProps) {
  const [inputValue, setInputValue] = useState("");
  const messagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = messagesRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, isSending]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = inputValue.trim();
    if (!trimmed || isSending) return;
    onSendMessage(trimmed);
    setInputValue("");
  }

  return (
    <div className={styles.chat}>
      <div className={styles.messages} ref={messagesRef}>
        {messages.length === 0 && (
          <p className={styles.empty}>
            Ask me to schedule something on your calendar.
          </p>
        )}
        {messages.map((message) => (
          <div
            key={message.id}
            className={`${styles.messageRow} ${
              message.role === "user"
                ? styles.messageRowUser
                : styles.messageRowAssistant
            }`}
          >
            <div
              className={`${styles.bubble} ${
                message.role === "user"
                  ? styles.bubbleUser
                  : `${styles.bubbleAssistant} ${styles.markdown}`
              }`}
            >
              {message.role === "assistant" ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {message.text}
                </ReactMarkdown>
              ) : (
                message.text
              )}
            </div>
            <span className={styles.timestamp}>
              {new Date(message.timestamp).toLocaleTimeString([], {
                hour: "numeric",
                minute: "2-digit",
              })}
            </span>
          </div>
        ))}
        {isSending && (
          <div className={`${styles.messageRow} ${styles.messageRowAssistant}`}>
            <div className={`${styles.bubble} ${styles.bubbleAssistant} ${styles.thinkingBubble}`}>
              <span className={styles.thinkingDot} />
              <span className={styles.thinkingDot} />
              <span className={styles.thinkingDot} />
            </div>
          </div>
        )}
      </div>
      <form className={styles.inputForm} onSubmit={handleSubmit}>
        <input
          className={styles.input}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Type a message…"
          disabled={isSending}
        />
        <button
          className={styles.sendButton}
          type="submit"
          disabled={!inputValue.trim() || isSending}
        >
          Send
        </button>
      </form>
    </div>
  );
}
