import { apiDataRequest } from "@/lib/api/client";

export type PromptRecord = {
  id: string;
  title: string;
  rough_input: string;
  enhanced_input: string | null;
  generated_prompt: string;
  image_urls: string[];
  category: string;
  tone: string;
  platform: string;
  complexity: string;
  output_format: string;
  is_favorite: boolean;
  collection_id: string | null;
};

export async function getMyPrompts(accessToken: string) {
  return apiDataRequest<PromptRecord[]>("/prompts/history", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}
