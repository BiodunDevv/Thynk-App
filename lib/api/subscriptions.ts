import { apiDataRequest } from "@/lib/api/client";

export type SubscriptionRecord = {
  id: string;
  user_id: string;
  plan_id: string;
  status: string;
  provider: string;
  provider_subscription_id: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  created_at: string | null;
};

export async function getMySubscription(accessToken: string) {
  return apiDataRequest<SubscriptionRecord | null>("/subscriptions/me", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}
