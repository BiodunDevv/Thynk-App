import { apiDataRequest } from "@/lib/api/client";

export type RequestChatMessageRecord = {
  id: string;
  role: string;
  content: string;
  metadata: Record<string, unknown>;
  token_usage: number | null;
  model_used: string | null;
  created_at: string;
};

export type RequestChatRecord = {
  id: string;
  title: string;
  category: string;
  status: string;
  source: string;
  messages: RequestChatMessageRecord[];
  generated_prompt_ids: string[];
  is_favorite: boolean;
  is_reported: boolean;
  reported_reason: string | null;
};

export async function getMyRequestChats(accessToken: string) {
  return apiDataRequest<RequestChatRecord[]>("/request-chats/me", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

export async function createRequestChat(
  payload: { title: string; category: string; message: string; source?: string },
  accessToken: string,
): Promise<RequestChatRecord> {
  return apiDataRequest<RequestChatRecord>("/request-chats", {
    method: "POST",
    body: JSON.stringify(payload),
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export async function addMessageToChat(
  chatId: string,
  content: string,
  accessToken: string,
): Promise<RequestChatRecord> {
  return apiDataRequest<RequestChatRecord>(`/request-chats/${chatId}/messages`, {
    method: "POST",
    body: JSON.stringify({ content }),
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export async function generateFinalPrompt(
  chatId: string,
  accessToken: string,
): Promise<RequestChatRecord> {
  return apiDataRequest<RequestChatRecord>(`/request-chats/${chatId}/generate`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export async function regenerateFinalPrompt(
  chatId: string,
  accessToken: string,
  variationHint?: string,
): Promise<RequestChatRecord> {
  return apiDataRequest<RequestChatRecord>(`/request-chats/${chatId}/regenerate`, {
    method: "POST",
    body: JSON.stringify({ variation_hint: variationHint ?? null }),
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export async function freeTestGenerate(
  prompt: string,
): Promise<{ content: string; used: boolean }> {
  return apiDataRequest<{ content: string; used: boolean }>("/prompts/test-free", {
    method: "POST",
    body: JSON.stringify({ prompt }),
  });
}
