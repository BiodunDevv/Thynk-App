"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import type { AuthView } from "@/components/auth/auth-modal-provider";
import { useAuthModal } from "@/components/auth/auth-modal-provider";
import { ThynkLogo } from "@/components/brand/thynk-logo";
import {
  buildCheckoutRedirectPath,
  writePendingCheckout,
} from "@/lib/billing/checkout";
import { SectionContainer } from "@/components/shared/section-container";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function AuthEntryPage({
  view,
  title,
  description,
}: {
  view: AuthView;
  title: string;
  description: string;
}) {
  const { openAuthModal } = useAuthModal();
  const searchParams = useSearchParams();

  React.useEffect(() => {
    const planSlug = searchParams.get("plan");
    const provider = searchParams.get("provider");
    const source = searchParams.get("source") ?? "landing";

    if (!planSlug) {
      return;
    }

    writePendingCheckout({
      planSlug,
      provider:
        provider === "stripe" || provider === "paystack" ? provider : undefined,
      redirectTo: buildCheckoutRedirectPath({
        planSlug,
        provider:
          provider === "stripe" || provider === "paystack" ? provider : undefined,
      }),
      source,
    });
  }, [searchParams]);

  React.useEffect(() => {
    openAuthModal(view);
  }, [openAuthModal, view]);

  return (
    <div className="min-h-screen bg-background">
      <SectionContainer className="py-10">
        <div className="mb-10 flex items-center justify-between gap-4">
          <ThynkLogo size="sm" />
          <Button asChild variant="outline">
            <Link href="/">Back home</Link>
          </Button>
        </div>

        <Card className="mx-auto max-w-xl border border-border bg-card">
          <CardHeader>
            <CardTitle className="text-2xl tracking-tight">{title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <p className="text-sm leading-7 text-muted-foreground">{description}</p>
            <Button onClick={() => openAuthModal(view)}>Open Thynk auth</Button>
          </CardContent>
        </Card>
      </SectionContainer>
    </div>
  );
}
