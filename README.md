# AI Assistant

A Next.js app combining an AI assistant with a calendar, backed by Supabase for auth/data and the Anthropic API for the assistant itself.

## What it does

After signing up or logging in (email/password via Supabase), you land on a two-tab app:

- **Calendar** — a month/agenda view of your scheduled items, including recurring events. You can create, edit, and delete items and individual occurrences of a recurring series directly in the UI.
- **AI Assistant** — a chat interface backed by Claude. Ask it to schedule, look up, or move things on your calendar in plain English (e.g. "move my dentist appointment to Friday at 3pm"), and it calls tools that read and write your scheduled items, keeping the calendar view in sync with the conversation.

Everything is scoped per-user: your schedule and chat history are stored in Supabase and tied to your account.

