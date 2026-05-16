import { apiDataRequest } from "@/lib/api/client";
import type { UserRecord } from "@/lib/api/users";

export type AuthTokens = {
  access_token: string;
  refresh_token: string;
  token_type: string;
};

export type AuthPlanData = {
  plan_id: string | null;
  name?: string;
  slug?: string;
  price?: number;
  currency?: string;
  billing_interval?: string;
  generation_limit?: number;
  can_use_premium_templates?: boolean;
  can_save_unlimited_prompts?: boolean;
  priority_generation?: boolean;
};

export type AuthSubscriptionData = {
  id?: string;
  plan_id?: string;
  status?: string;
  provider?: string;
  current_period_start?: string | null;
  current_period_end?: string | null;
  cancel_at_period_end?: boolean;
};

export type AuthSessionPayload = {
  tokens: AuthTokens;
  user: UserRecord;
  role: string;
  plan: AuthPlanData;
  subscription_status: string;
  subscription?: AuthSubscriptionData;
};

export type RegisterPayload = {
  full_name: string;
  email: string;
  password: string;
};

export type LoginPayload = {
  email: string;
  password: string;
};

export type OtpPayload = {
  email: string;
  code: string;
};

export type EmailPayload = {
  email: string;
};

export type ResetPasswordPayload = {
  email: string;
  code: string;
  new_password: string;
};

export async function registerUser(payload: RegisterPayload) {
  return apiDataRequest<{ user: UserRecord }>("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function verifyEmailCode(payload: OtpPayload) {
  return apiDataRequest<{ user: UserRecord }>("/auth/verify-email", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function loginUser(payload: LoginPayload) {
  return apiDataRequest<AuthSessionPayload>("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function requestPasswordReset(payload: EmailPayload) {
  return apiDataRequest<Record<string, never>>("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function verifyResetCode(payload: OtpPayload) {
  return apiDataRequest<Record<string, never>>("/auth/verify-reset-code", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function resetPassword(payload: ResetPasswordPayload) {
  return apiDataRequest<Record<string, never>>("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function resendVerificationCode(payload: EmailPayload) {
  return apiDataRequest<Record<string, never>>("/auth/resend-verification-code", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
