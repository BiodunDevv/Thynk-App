import { apiDataRequest } from "@/lib/api/client";

export type RequestChatMessageRecord = {
  id: string;
  role: string;
  content: string;
  metadata: RequestChatMessageMetadata;
  token_usage: number | null;
  model_used: string | null;
  created_at: string;
};

export type ClarificationQuestionType = "single" | "multi" | "yesno" | "open";

export type ClarificationQuestion = {
  type: ClarificationQuestionType;
  question: string;
  options: string[];
};

export type ClarificationPayload = {
  clarification_complete: boolean;
  next_action: "ask_followup" | "ready_for_final_prompt";
  questions: ClarificationQuestion[];
  reasoning_summary?: string | null;
};

export type PromptStep = {
  step: number;
  title: string;
  content: string;
};

export type PromptDocumentSections = {
  prompt?: string;
  why?: string;
  best_used_with?: string;
  raw?: string;
};

export type RequestChatMessageMetadata = Record<string, unknown> & {
  image_urls?: string[];
  deep_thinking?: boolean;
  type?: string;
  clarification_complete?: boolean;
  next_action?: "ask_followup" | "ready_for_final_prompt";
  clarification?: ClarificationPayload;
  prompt_document?: PromptDocumentSections;
  prompt_steps?: PromptStep[];
  prompt_step_count?: number;
  is_step_split?: boolean;
  continuation_hint?: string;
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
  created_at: string;
  updated_at?: string;
};

export async function getMyRequestChats(accessToken: string) {
  return apiDataRequest<RequestChatRecord[]>("/request-chats/history", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

export async function createRequestChat(
  payload: { title: string; category: string; message: string; source?: string; image_urls?: string[]; deep_thinking?: boolean },
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
  image_urls?: string[],
  deep_thinking?: boolean,
): Promise<RequestChatRecord> {
  return apiDataRequest<RequestChatRecord>(`/request-chats/${chatId}/messages`, {
    method: "POST",
    body: JSON.stringify({ content, image_urls: image_urls ?? [], deep_thinking: deep_thinking ?? false }),
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export async function generateFinalPrompt(
  chatId: string,
  accessToken: string,
  deepThinking?: boolean,
): Promise<RequestChatRecord> {
  return apiDataRequest<RequestChatRecord>(`/request-chats/${chatId}/generate`, {
    method: "POST",
    body: JSON.stringify({ deep_thinking: deepThinking ?? false }),
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export async function regenerateFinalPrompt(
  chatId: string,
  accessToken: string,
  variationHint?: string,
  deepThinking?: boolean,
): Promise<RequestChatRecord> {
  return apiDataRequest<RequestChatRecord>(`/request-chats/${chatId}/regenerate`, {
    method: "POST",
    body: JSON.stringify({ variation_hint: variationHint ?? null, deep_thinking: deepThinking ?? false }),
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export async function toggleFavoriteChat(
  chatId: string,
  accessToken: string,
): Promise<RequestChatRecord> {
  return apiDataRequest<RequestChatRecord>(`/request-chats/${chatId}/favorite`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export async function deleteRequestChat(
  chatId: string,
  accessToken: string,
): Promise<void> {
  await apiDataRequest(`/request-chats/${chatId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export async function clearRequestChats(
  accessToken: string,
): Promise<{ deleted_count: number }> {
  return apiDataRequest<{ deleted_count: number }>("/request-chats", {
    method: "DELETE",
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
