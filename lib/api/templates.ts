import { apiDataRequest } from "@/lib/api/client";

export type TemplateRecord = {
  id: string;
  title: string;
  description: string;
  category: string;
  template_content: string;
  tags: string[];
  is_premium: boolean;
  is_active: boolean;
};

export async function getTemplates() {
  return apiDataRequest<TemplateRecord[]>("/templates");
}
