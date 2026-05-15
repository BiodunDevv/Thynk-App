import { SectionContainer } from "@/components/shared/section-container";
import { LegalContentLoading } from "@/components/shared/legal-content";

export default function RefundPolicyLoading() {
  return (
    <div className="min-h-screen bg-background py-10">
      <SectionContainer>
        <LegalContentLoading />
      </SectionContainer>
    </div>
  );
}
