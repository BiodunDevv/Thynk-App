import { apiDataRequest } from "@/lib/api/client";

export type LegalDocumentSlug = "terms" | "privacy" | "refund-policy";

export type LegalDocumentResponse = {
  success: true;
  message: string;
  data: {
    title: string;
    last_updated: string;
    content: string;
  };
};

export async function getLegalContent(slug: LegalDocumentSlug) {
  return apiDataRequest<LegalDocumentResponse>(`/legal/${slug}`);
}
