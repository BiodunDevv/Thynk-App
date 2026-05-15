import { apiDataRequest } from "@/lib/api/client";

export type SubscriptionRecord = {
  id: string;
  user_id: string;
  plan_id: string;
  status: string;
  provider: string;
};

export async function getMySubscription(accessToken: string) {
  return apiDataRequest<SubscriptionRecord | null>("/subscriptions/me", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}
