import type { SupabaseClient } from "@supabase/supabase-js";
import type { ChatMessage } from "@/lib/types";

interface ChatMessageRow {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

const SELECT_COLUMNS = "id, role, content, created_at";

function rowToMessage(row: ChatMessageRow): ChatMessage {
  return {
    id: row.id,
    role: row.role,
    text: row.content,
    timestamp: new Date(row.created_at).getTime(),
  };
}

export async function listChatMessages(
  supabase: SupabaseClient,
  limit = 50
): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from("chat_messages")
    .select(SELECT_COLUMNS)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) throw error;
  return (data as unknown as ChatMessageRow[]).map(rowToMessage);
}

export async function createChatMessage(
  supabase: SupabaseClient,
  userId: string,
  role: "user" | "assistant",
  content: string
): Promise<ChatMessage> {
  const { data, error } = await supabase
    .from("chat_messages")
    .insert({ user_id: userId, role, content })
    .select(SELECT_COLUMNS)
    .single();

  if (error) throw error;
  return rowToMessage(data as unknown as ChatMessageRow);
}
