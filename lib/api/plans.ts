import { apiDataRequest } from "@/lib/api/client";

export type PlanRecord = {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  currency: string;
  billing_interval: "free" | "monthly" | "yearly";
  generation_limit: number;
  can_use_premium_templates: boolean;
  can_save_unlimited_prompts: boolean;
  priority_generation: boolean;
  is_active: boolean;
  provider_prices: Record<
    "paystack" | "stripe",
    {
      amount: number;
      currency: string;
    }
  >;
};

export async function getPlans() {
  return apiDataRequest<PlanRecord[]>("/plans");
}
