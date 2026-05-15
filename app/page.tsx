import type { ReactNode } from "react";
import { FeatureSection } from "@/components/marketing/feature-section";
import { FaqSection } from "@/components/marketing/faq-section";
import { HeroSection } from "@/components/marketing/hero-section";
import { PricingPreview } from "@/components/marketing/pricing-preview";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { TemplatesPreview } from "@/components/marketing/templates-preview";
import { UseCasesSection } from "@/components/marketing/use-cases-section";

const GRID_STYLE = {
  backgroundImage:
    "linear-gradient(var(--foreground) 1px,transparent 1px),linear-gradient(to right,var(--foreground) 1px,transparent 1px)",
  backgroundSize: "40px 40px",
  opacity: 0.018,
} as const;

function SectionWrap({ children }: { children: ReactNode }) {
  return (
    <div className="relative overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0" style={GRID_STYLE} />
      {children}
    </div>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main>
        <HeroSection />
        <SectionWrap><FeatureSection /></SectionWrap>
        <SectionWrap><UseCasesSection /></SectionWrap>
        <SectionWrap><TemplatesPreview /></SectionWrap>
        <SectionWrap><PricingPreview /></SectionWrap>
        <SectionWrap><FaqSection /></SectionWrap>
      </main>
      <SiteFooter />
    </div>
  );
}
