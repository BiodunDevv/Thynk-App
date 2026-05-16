import { apiDataRequest } from "@/lib/api/client";

export type UserRecord = {
  id: string;
  full_name: string;
  email: string;
  role: string;
  is_verified: boolean;
  is_active: boolean;
  avatar_url: string | null;
  current_plan_id: string | null;
  subscription_status: string;
  subscription_id: string | null;
  prompt_generation_count: number;
  monthly_generation_count: number;
};

export async function getCurrentUser(accessToken: string) {
  return apiDataRequest<UserRecord>("/users/profile", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}
