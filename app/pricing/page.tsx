"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Check, ArrowRight, Zap, CheckCircle2, CreditCard } from "lucide-react";

import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { SectionContainer } from "@/components/shared/section-container";
import { useAuthSession } from "@/lib/auth/session";
import { createCheckoutUrl } from "@/lib/billing/checkout";
import { getPlans } from "@/lib/api/plans";
import { getCurrentUser } from "@/lib/api/users";
import { getMySubscription } from "@/lib/api/subscriptions";
import {
  formatPlanPrice,
  getPlanBadge,
  getPlanCadence,
  getPlanCta,
  getPlanDisplayName,
  getPlanFeatures,
} from "@/lib/constants/pricing";
import { Skeleton } from "@/components/ui/skeleton";

const FAQ_ITEMS = [
  {
    q: "Can I start without a credit card?",
    a: "Yes. The Free plan requires no payment details. You get 5 generations per week with automatic weekly resets.",
  },
  {
    q: "What counts as a generation?",
    a: "Each time you generate a polished AI prompt from your rough idea, that's one generation.",
  },
  {
    q: "Can I switch plans at any time?",
    a: "Yes. Upgrade or downgrade whenever you like. Changes take effect immediately.",
  },
  {
    q: "Is there a yearly discount?",
    a: "Yes — the Pro Yearly plan saves you over 16% compared to monthly billing.",
  },
];

export default function PricingPage() {
  const session = useAuthSession();
  const accessToken = session?.tokens.access_token ?? "";

  const plansQuery = useQuery({
    queryKey: ["plans"],
    queryFn: getPlans,
  });
  const userQuery = useQuery({
    queryKey: ["user-profile", accessToken],
    queryFn: () => getCurrentUser(accessToken),
    enabled: Boolean(accessToken),
    staleTime: 30_000,
  });
  const subscriptionQuery = useQuery({
    queryKey: ["subscription-current", accessToken],
    queryFn: () => getMySubscription(accessToken),
    enabled: Boolean(accessToken),
    staleTime: 30_000,
  });

  const plans = plansQuery.data ?? [];
  const user = userQuery.data ?? session?.user ?? null;
  const subscription = subscriptionQuery.data ?? session?.subscription ?? null;
  const currentPlan =
    plans.find((p) => p.id === subscription?.plan_id) ??
    plans.find((p) => p.id === user?.current_plan_id) ??
    plans.find((p) => p.id === session?.plan?.plan_id) ??
    null;

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main>
        {/* ── Hero ─────────────────────────────── */}
        <SectionContainer as="div" className="pb-0 pt-14 sm:pt-18">
          <div className="mb-12 max-w-2xl">
            <div className="mb-6 inline-flex items-center gap-2 border border-border bg-card px-3.5 py-1.5 shadow-sm">
              <span className="size-1.5 rounded-full bg-primary" />
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                Pricing
              </span>
            </div>
            <h1 className="text-[clamp(2rem,5vw,3rem)] font-semibold leading-[1.1] tracking-[-0.03em] text-foreground">
              Simple plans.{" "}
              <span className="text-muted-foreground">Real value.</span>
            </h1>
            <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-muted-foreground">
              Start free, upgrade when prompt work becomes part of your daily flow.
              Prices in NGN — no hidden fees.
            </p>
            {session && currentPlan && (
              <div className="mt-6 inline-flex items-center gap-2 border border-border bg-card px-3.5 py-2 shadow-sm">
                <CheckCircle2 className="size-3.5 text-emerald-500" />
                <div className="text-left">
                  <p className="text-[13px] font-medium text-foreground">
                    Active subscription: {getPlanDisplayName(currentPlan)}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {subscription?.status === "active" ? "Your plan is active now." : "Your account billing is being tracked here."}
                  </p>
                </div>
                <Link
                  href="/settings?tab=billing"
                  className="ml-2 inline-flex items-center gap-1.5 border border-border bg-background px-3 py-1.5 text-[12px] font-medium text-foreground transition-colors hover:bg-muted"
                >
                  <CreditCard className="size-3.5" />
                  Manage
                </Link>
              </div>
            )}
          </div>

          {/* ── Plan grid ────────────────────── */}
          {plansQuery.isLoading && (
            <div className="grid gap-px border border-border bg-border sm:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex flex-col gap-5 bg-card p-7">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-10 w-28" />
                  <Skeleton className="h-3 w-full" />
                  <div className="space-y-2.5">
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-4/5" />
                    <Skeleton className="h-3 w-3/5" />
                  </div>
                  <Skeleton className="mt-auto h-9 w-full" />
                </div>
              ))}
            </div>
          )}

          {plansQuery.isError && (
            <div className="border border-border bg-muted px-6 py-5 text-sm text-muted-foreground">
              Pricing could not be loaded. Please refresh or try again shortly.
            </div>
          )}

          {!plansQuery.isLoading && !plansQuery.isError && plans.length > 0 && (
            <div className="grid gap-px border border-border bg-border sm:grid-cols-3">
              {plans.map((plan) => {
                const badge = getPlanBadge(plan);
                const isFeatured = Boolean(badge);
                const isCurrent = currentPlan?.id === plan.id;

                return (
                  <div key={plan.id} className="relative flex flex-col bg-card p-7">
                    {/* Badge */}
                    {badge && (
                      <span className="absolute right-0 top-0 bg-primary px-2.5 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.15em] text-primary-foreground">
                        {badge}
                      </span>
                    )}
                    {isCurrent && (
                      <span className="absolute left-0 top-0 border-r border-b border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.15em] text-emerald-500">
                        Active
                      </span>
                    )}

                    {/* Plan label */}
                    <p className={`font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground ${isCurrent || badge ? "mt-6" : ""}`}>
                      {getPlanDisplayName(plan)}
                    </p>

                    {/* Price */}
                    <div className="mt-3 flex items-end gap-1">
                      <span className="text-[2.5rem] font-semibold leading-none tracking-tight text-foreground">
                        {formatPlanPrice(plan)}
                      </span>
                      <span className="mb-1 text-xs text-muted-foreground">
                        {getPlanCadence(plan)}
                      </span>
                    </div>

                    {/* Description */}
                    <p className="mt-3 text-[13px] leading-[1.6] text-muted-foreground">
                      {plan.description}
                    </p>

                    {/* Generation limit callout */}
                    <div className="mt-4 inline-flex items-center gap-1.5 border border-border bg-muted/50 px-2.5 py-1.5">
                      <Zap className="size-3 text-primary" />
                      <span className="font-mono text-[10px] text-muted-foreground">
                        {plan.generation_limit === 5
                          ? "5 generations / week"
                          : plan.generation_limit >= 30000
                          ? "30,000 generations / year"
                          : `${plan.generation_limit.toLocaleString()} generations / mo`}
                      </span>
                    </div>

                    {/* Divider */}
                    <div className="my-5 border-t border-border" />

                    {/* Features */}
                    <ul className="flex-1 space-y-3">
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
                        href={
                          isCurrent
                            ? "/settings?tab=billing"
                            : createCheckoutUrl("/get-started", {
                                planSlug: plan.slug,
                                source: "pricing-page",
                              })
                        }
                        className={
                          isCurrent
                            ? "flex w-full items-center justify-center gap-2 border border-border bg-background px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                            : isFeatured
                            ? "flex w-full items-center justify-center gap-2 bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
                            : "flex w-full items-center justify-center gap-2 border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                        }
                      >
                        {isCurrent ? "Manage plan" : getPlanCta(plan)}
                        <ArrowRight className="size-3.5" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Footer note */}
          <p className="mt-4 text-center text-xs text-muted-foreground">
            All plans include access to the core Thynk prompt workspace. No credit card required to start.
          </p>
        </SectionContainer>

        {/* ── Comparison table ─────────────────── */}
        <SectionContainer as="div" className="py-16">
          <div className="mb-8 border-b border-border pb-4">
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              Full plan comparison
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-3 pr-6 text-left font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    Feature
                  </th>
                  {["Free", "Pro Monthly", "Pro Yearly"].map((name) => (
                    <th key={name} className="py-3 px-4 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                      {name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {[
                  { label: "Generations", values: ["5 / day", "2,500 / mo", "30,000 / yr"] },
                  { label: "Premium templates", values: [false, true, true] },
                  { label: "Unlimited saved prompts", values: [false, true, true] },
                  { label: "Advanced enhancement", values: [false, true, true] },
                  { label: "Priority generation", values: [false, true, true] },
                  { label: "AI target selection", values: [true, true, true] },
                  { label: "Output format control", values: [true, true, true] },
                  { label: "Chat workspace", values: [true, true, true] },
                  { label: "Prompt downloads (.md)", values: [true, true, true] },
                ].map((row) => (
                  <tr key={row.label} className="group hover:bg-muted/30 transition-colors">
                    <td className="py-3 pr-6 text-[13px] text-muted-foreground">{row.label}</td>
                    {row.values.map((val, i) => (
                      <td key={i} className="py-3 px-4 text-center">
                        {typeof val === "boolean" ? (
                          val ? (
                            <span className="inline-flex size-4 items-center justify-center bg-primary/10 text-primary mx-auto">
                              <Check className="size-2.5" />
                            </span>
                          ) : (
                            <span className="text-muted-foreground/30 text-base leading-none">—</span>
                          )
                        ) : (
                          <span className="font-mono text-[11px] text-foreground">{val}</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionContainer>

        {/* ── FAQ ──────────────────────────────── */}
        <SectionContainer as="div" className="border-t border-border py-16">
          <div className="grid gap-10 lg:grid-cols-[280px_1fr]">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary">
                FAQ
              </p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
                Common questions
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Anything else?{" "}
                <Link href="/support" className="text-foreground underline underline-offset-2 hover:text-primary transition-colors">
                  Contact support
                </Link>
                .
              </p>
            </div>

            <dl className="divide-y divide-border border-t border-border">
              {FAQ_ITEMS.map((item) => (
                <div key={item.q} className="py-5">
                  <dt className="text-[14px] font-medium text-foreground">{item.q}</dt>
                  <dd className="mt-2 text-[13px] leading-relaxed text-muted-foreground">{item.a}</dd>
                </div>
              ))}
            </dl>
          </div>
        </SectionContainer>

        {/* ── Bottom CTA strip ─────────────────── */}
        <SectionContainer as="div" className="py-12">
          <div className="flex flex-col items-center gap-5 border border-border bg-card px-8 py-10 text-center sm:flex-row sm:justify-between sm:text-left">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                Get started today
              </p>
              <h3 className="mt-2 text-xl font-semibold tracking-tight text-foreground">
                Start building better prompts — free.
              </h3>
            </div>
            <Link
              href="/get-started"
              className="inline-flex shrink-0 items-center gap-2 bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              Start free
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </SectionContainer>
      </main>

      <SiteFooter />
    </div>
  );
}
