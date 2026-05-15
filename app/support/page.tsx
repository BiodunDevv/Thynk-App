import { LifeBuoy, Mail, MessageSquareText } from "lucide-react";

import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { SectionContainer } from "@/components/shared/section-container";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const supportOptions = [
  {
    title: "Billing and plan questions",
    description: "Get clarity on subscriptions, plan access, and account-level questions.",
    icon: LifeBuoy,
  },
  {
    title: "Product help",
    description: "Use support when something feels blocked, unclear, or unexpectedly broken.",
    icon: MessageSquareText,
  },
  {
    title: "Direct email support",
    description: "If you need a direct line, contact the team at support@thynk.app.",
    icon: Mail,
  },
] as const;

export default function SupportPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <SectionContainer className="py-10">
        <div className="max-w-2xl">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-primary">
            Support
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            Calm, clear support when you need it.
          </h1>
          <p className="mt-4 text-sm leading-7 text-muted-foreground sm:text-base">
            Thynk support is designed to be straightforward: less handoff, less confusion,
            and faster clarity when something matters.
          </p>
        </div>

        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          {supportOptions.map((option) => {
            const Icon = option.icon;
            return (
              <Card key={option.title} className="border border-border bg-card">
                <CardHeader className="space-y-4">
                  <div className="flex size-10 items-center justify-center border border-border bg-muted text-primary">
                    <Icon className="size-4" />
                  </div>
                  <CardTitle className="text-base tracking-tight">{option.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-7 text-muted-foreground">{option.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </SectionContainer>
      <SiteFooter />
    </div>
  );
}
