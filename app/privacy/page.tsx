import { SectionContainer } from "@/components/shared/section-container";
import { LegalContent, LegalRetryHint } from "@/components/shared/legal-content";
import { getLegalContent } from "@/lib/api/legal";

export default async function PrivacyPage() {
  let document:
    | {
        title: string;
        lastUpdated: string;
        content: string;
      }
    | null = null;
  let error: string | undefined;

  try {
    const response = await getLegalContent("privacy");
    document = {
      title: response.data.title,
      lastUpdated: response.data.last_updated,
      content: response.data.content,
    };
  } catch {
    error = "The latest privacy policy could not be fetched from the backend.";
  }

  return (
    <div className="min-h-screen bg-background py-10">
      <SectionContainer className="space-y-6">
        <LegalContent
          title={document?.title ?? "Privacy Policy"}
          lastUpdated={document?.lastUpdated}
          content={document?.content}
          error={error}
        />
        {error ? <LegalRetryHint /> : null}
      </SectionContainer>
    </div>
  );
}
