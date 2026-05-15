"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Check } from "lucide-react";

import { createCheckoutUrl } from "@/lib/billing/checkout";
import { getPlans } from "@/lib/api/plans";
import {
  formatPlanPrice,
  getPlanBadge,
  getPlanCadence,
  getPlanCta,
  getPlanDisplayName,
  getPlanFeatures,
  selectPreviewPlans,
} from "@/lib/constants/pricing";
import { SectionContainer } from "@/components/shared/section-container";
import { Skeleton } from "@/components/ui/skeleton";

export function PricingPreview() {
  const plansQuery = useQuery({
    queryKey: ["plans"],
    queryFn: getPlans,
  });

  const plans = selectPreviewPlans(plansQuery.data ?? []);

  return (
    <SectionContainer id="pricing" className="py-12 sm:py-16">

      {/* Section header */}
      <div className="mb-10 max-w-xl">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-primary">
          Pricing
        </p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Simple plans. Real value.
        </h2>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          Start free, upgrade when you need more. Prices in NGN — no hidden fees.
        </p>
      </div>

      {/* Loading skeleton */}
      {plansQuery.isLoading && (
        <div className="grid gap-px border border-border bg-border sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-5 bg-card p-7">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-9 w-28" />
              <Skeleton className="h-3 w-full" />
              <div className="mt-2 space-y-2.5">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-4/5" />
                <Skeleton className="h-3 w-3/5" />
              </div>
              <Skeleton className="mt-auto h-9 w-full" />
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {plansQuery.isError && (
        <div className="border border-border bg-muted px-6 py-5 text-sm text-muted-foreground">
          Pricing could not be loaded. Please refresh or try again shortly.
        </div>
      )}

      {/* Plans — 3 column grid */}
      {!plansQuery.isLoading && !plansQuery.isError && plans.length > 0 && (
        <div className="grid gap-px border border-border bg-border sm:grid-cols-3">
          {plans.map((plan) => {
            const badge = getPlanBadge(plan);
            const isFeatured = Boolean(badge);
            return (
              <div
                key={plan.id}
                className="relative flex flex-col bg-card p-7"
              >
                {/* Badge — top right corner */}
                {badge && (
                  <span className="absolute right-0 top-0 bg-primary px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.15em] text-primary-foreground">
                    {badge}
                  </span>
                )}

                {/* Plan label */}
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  {getPlanDisplayName(plan)}
                </p>

                {/* Price */}
                <div className="mt-3 flex items-end gap-1">
                  <span className="text-[2.25rem] font-semibold leading-none tracking-tight text-foreground">
                    {formatPlanPrice(plan)}
                  </span>
                  <span className="mb-0.5 text-xs text-muted-foreground">
                    {getPlanCadence(plan)}
                  </span>
                </div>

                {/* Description */}
                <p className="mt-2.5 text-[13px] leading-5 text-muted-foreground">
                  {plan.description}
                </p>

                {/* Divider */}
                <div className="my-5 border-t border-border" />

                {/* Features */}
                <ul className="flex-1 space-y-2.5">
                  {getPlanFeatures(plan).map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5 text-[13px] text-muted-foreground">
                      <span className="mt-px flex size-4 shrink-0 items-center justify-center bg-primary/10 text-primary">
                        <Check className="size-2.5" />
                      </span>
                      {feature}
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <div className="mt-7">
                  <Link
                    href={createCheckoutUrl("/get-started", {
                      planSlug: plan.slug,
                      source: "pricing-preview",
                    })}
                    className={
                      isFeatured
                        ? "flex w-full items-center justify-center bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
                        : "flex w-full items-center justify-center border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                    }
                  >
                    {getPlanCta(plan)}
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer note */}
      <p className="mt-5 text-center text-xs text-muted-foreground">
        All plans include access to the core Thynk prompt workspace. No credit card required to start.
      </p>

    </SectionContainer>
  );
}
