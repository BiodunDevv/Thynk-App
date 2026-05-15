import type { PlanRecord } from "@/lib/api/plans";
import type { PaymentProvider } from "@/lib/api/payments";

export function formatPlanPrice(plan: PlanRecord) {
  if (plan.billing_interval === "free") {
    return plan.currency === "NGN" ? "₦0" : "$0";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: plan.currency,
    maximumFractionDigits: plan.price % 1 === 0 ? 0 : 2,
  }).format(plan.price);
}

export function formatPlanProviderPrice(
  plan: PlanRecord,
  provider: PaymentProvider,
) {
  const providerPrice = plan.provider_prices?.[provider];

  if (!providerPrice) {
    return formatPlanPrice(plan);
  }

  return new Intl.NumberFormat(
    providerPrice.currency === "USD" ? "en-US" : "en-NG",
    {
      style: "currency",
      currency: providerPrice.currency,
      maximumFractionDigits: providerPrice.amount % 1 === 0 ? 0 : 2,
    },
  ).format(providerPrice.amount);
}

export function getPlanCadence(plan: PlanRecord) {
  if (plan.billing_interval === "free") {
    return "/free";
  }

  if (plan.billing_interval === "yearly") {
    return "/year";
  }

  return "/month";
}

export function getPlanDisplayName(plan: PlanRecord) {
  if (plan.slug === "free") {
    return "Free";
  }

  if (plan.slug === "pro-monthly") {
    return "Pro";
  }

  if (plan.slug === "pro-yearly") {
    return "Pro yearly";
  }

  return plan.name;
}

export function getPlanFeatures(plan: PlanRecord) {
  if (plan.slug === "free") {
    return [
      `${plan.generation_limit} generations per day`,
      "Basic templates",
      "Limited saved prompts",
    ];
  }

  return [
    "Higher usage limits",
    "Premium templates",
    "Unlimited saved prompts",
    "Advanced prompt enhancement",
    "Priority access",
  ];
}

export function getPlanCta(plan: PlanRecord) {
  return plan.slug === "free" ? "Start free" : "Choose plan";
}

export function getPlanBadge(plan: PlanRecord) {
  if (plan.slug === "pro-monthly") {
    return "Recommended";
  }

  if (plan.slug === "pro-yearly") {
    return "Best value";
  }

  return null;
}

export function selectPreviewPlans(plans: PlanRecord[]) {
  const order = ["free", "pro-monthly", "pro-yearly"];
  const sorted = order
    .map((slug) => plans.find((p) => p.slug === slug))
    .filter(Boolean) as PlanRecord[];
  return sorted.length > 0 ? sorted : plans.slice(0, 3);
}
