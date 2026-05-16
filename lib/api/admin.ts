import { apiDataRequest, getApiBaseUrl } from "@/lib/api/client";
import type { AuthSessionPayload, LoginPayload } from "@/lib/api/auth";
import { clearAdminSession } from "@/lib/auth/admin-session";

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}` };
}

const API_V1_PREFIX = process.env.NEXT_PUBLIC_API_V1_PREFIX ?? "/api/v1";

async function adminApiDataRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${getApiBaseUrl()}${API_V1_PREFIX}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  const body = await response.json().catch(() => null) as {
    message?: string;
    data?: T;
  } | null;

  if (response.status === 401) {
    clearAdminSession();
    if (typeof window !== "undefined" && !window.location.pathname.startsWith("/admin/sign-in")) {
      window.location.href = "/admin/sign-in";
    }
    throw new Error("Admin session expired. Please sign in again.");
  }

  if (!response.ok) {
    throw new Error(body?.message ?? "Admin request failed.");
  }

  return body?.data as T;
}

/* ── Admin Auth ───────────────────────────────────────────────────── */

export async function adminLoginUser(payload: LoginPayload): Promise<AuthSessionPayload> {
  return apiDataRequest<AuthSessionPayload>("/admin/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/* ── Overview ─────────────────────────────────────────────────────── */

export type AdminOverview = {
  total_users: number;
  active_users: number;
  verified_users: number;
  paying_users: number;
  total_prompts_generated: number;
  open_support_tickets: number;
  reported_request_chats: number;
};

export async function getAdminOverview(token: string): Promise<AdminOverview> {
  return adminApiDataRequest<AdminOverview>("/admin/dashboard/overview", {
    headers: authHeaders(token),
  });
}

/* ── Users ────────────────────────────────────────────────────────── */

export type AdminUser = {
  id: string;
  full_name: string | null;
  email: string;
  role: string;
  is_active: boolean;
  is_verified: boolean;
  current_plan_id: string | null;
  monthly_generation_count: number;
  prompt_generation_count: number;
  subscription_status: string;
  created_at: string;
  credits_remaining: number;
};

export type AdminUserChatOutput = {
  id: string;
  title: string;
  category: string;
  created_at: string | null;
  generated_prompt_count: number;
  final_outputs?: string[];
  latest_output_preview: string | null;
  status: string;
  is_favorite: boolean;
};

export type AdminDeleteUserResult = {
  id: string;
  mode: string;
  deleted_related_records: Record<string, number>;
};

export async function getAdminUsers(token: string): Promise<AdminUser[]> {
  return adminApiDataRequest<AdminUser[]>("/admin/users", {
    headers: authHeaders(token),
  });
}

export async function getAdminUser(token: string, userId: string): Promise<AdminUser> {
  return adminApiDataRequest<AdminUser>(`/admin/users/${userId}`, {
    headers: authHeaders(token),
  });
}

export async function getAdminUserChats(token: string, userId: string): Promise<AdminUserChatOutput[]> {
  return adminApiDataRequest<AdminUserChatOutput[]>(`/admin/users/${userId}/chats`, {
    headers: authHeaders(token),
  });
}

export async function toggleUserStatus(token: string, userId: string): Promise<AdminUser> {
  return adminApiDataRequest<AdminUser>(`/admin/users/${userId}/toggle-status`, {
    method: "PATCH",
    headers: authHeaders(token),
  });
}

export async function deactivateAdminUser(token: string, userId: string): Promise<AdminUser> {
  return adminApiDataRequest<AdminUser>(`/admin/users/${userId}/deactivate`, {
    method: "PATCH",
    headers: authHeaders(token),
  });
}

export async function reactivateAdminUser(token: string, userId: string): Promise<AdminUser> {
  return adminApiDataRequest<AdminUser>(`/admin/users/${userId}/reactivate`, {
    method: "PATCH",
    headers: authHeaders(token),
  });
}

export async function deleteAdminUser(token: string, userId: string): Promise<AdminDeleteUserResult> {
  return adminApiDataRequest<AdminDeleteUserResult>(`/admin/users/${userId}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
}

export async function grantCredits(
  token: string,
  userId: string,
  amount: number,
  reason: string,
) {
  return adminApiDataRequest<{ user_id: string; credits_added: number; remaining_credits: number }>(
    `/admin/users/${userId}/grant-credits`,
    {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify({ amount, reason }),
    },
  );
}

export async function grantPrompts(
  token: string,
  userId: string,
  amount: number,
  reason: string,
) {
  return adminApiDataRequest<{ user_id: string; prompts_granted: number; monthly_count: number }>(
    `/admin/users/${userId}/grant-prompts`,
    {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify({ amount, reason }),
    },
  );
}

/* ── Support tickets ──────────────────────────────────────────────── */

export type SupportMessage = {
  id: string;
  sender_type: "user" | "admin";
  message: string;
  is_internal: boolean;
  created_at: string;
};

export type SupportTicket = {
  id: string;
  user_id: string;
  subject: string;
  status: string;
  priority: string;
  tags: string[];
  messages: SupportMessage[];
  assigned_admin_id: string | null;
  created_at: string;
  updated_at: string;
};

export async function getAdminTickets(token: string): Promise<SupportTicket[]> {
  return adminApiDataRequest<SupportTicket[]>("/admin/support/tickets", {
    headers: authHeaders(token),
  });
}

export async function replyToTicket(token: string, ticketId: string, message: string) {
  return adminApiDataRequest<{ ticket_id: string }>(`/admin/support/tickets/${ticketId}/reply`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ message }),
  });
}

export async function updateTicketStatus(token: string, ticketId: string, status: string) {
  return adminApiDataRequest<{ ticket_id: string; status: string }>(
    `/admin/support/tickets/${ticketId}/status`,
    {
      method: "PATCH",
      headers: authHeaders(token),
      body: JSON.stringify({ status }),
    },
  );
}

export async function updateTicketPriority(token: string, ticketId: string, priority: string) {
  return adminApiDataRequest<{ ticket_id: string; priority: string }>(
    `/admin/support/tickets/${ticketId}/priority`,
    {
      method: "PATCH",
      headers: authHeaders(token),
      body: JSON.stringify({ priority }),
    },
  );
}

/* ── Request chats ────────────────────────────────────────────────── */

/* ── Payments ─────────────────────────────────────────────────────── */

export type AdminPayment = {
  id: string;
  user_id: string | null;
  user_name?: string | null;
  user_email?: string | null;
  plan_id: string | null;
  plan_name?: string | null;
  provider_reference: string | null;
  amount: number | null;
  currency: string | null;
  status: string | null;
  provider: string | null;
  created_at: string | null;
  updated_at?: string | null;
  plan_snapshot?: {
    plan_id: string;
    name: string | null;
    slug: string | null;
    billing_interval: string | null;
    plan_currency: string | null;
    plan_amount: number | null;
    provider_currency: string | null;
    provider_amount: number | null;
  } | null;
};

export async function getAdminPayments(token: string): Promise<AdminPayment[]> {
  return adminApiDataRequest<AdminPayment[]>("/admin/payments", {
    headers: authHeaders(token),
  });
}

/* ── Templates ────────────────────────────────────────────────────── */

export type AdminTemplate = {
  id: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  is_premium: boolean;
  is_active: boolean;
  template_content: string;
};

export type CreateTemplatePayload = {
  title: string;
  description: string;
  category: string;
  tags: string[];
  is_premium: boolean;
  is_active: boolean;
  template_content: string;
};

export async function getAdminTemplates(token: string): Promise<AdminTemplate[]> {
  return adminApiDataRequest<AdminTemplate[]>("/admin/templates", {
    headers: authHeaders(token),
  });
}

export async function getAdminTemplate(token: string, id: string): Promise<AdminTemplate> {
  return adminApiDataRequest<AdminTemplate>(`/admin/templates/${id}`, {
    headers: authHeaders(token),
  });
}

export async function createTemplate(token: string, payload: CreateTemplatePayload) {
  return adminApiDataRequest<AdminTemplate>("/admin/templates", {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
}

export async function toggleTemplate(token: string, id: string): Promise<AdminTemplate> {
  return adminApiDataRequest<AdminTemplate>(`/admin/templates/${id}/toggle`, {
    method: "PATCH",
    headers: authHeaders(token),
  });
}

export async function deleteTemplate(token: string, id: string): Promise<void> {
  await adminApiDataRequest<{ id: string }>(`/admin/templates/${id}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
}

/* ── Coupons ──────────────────────────────────────────────────────── */

export type AdminCoupon = {
  id: string;
  code: string;
  description?: string;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  currency?: string;
  max_redemptions?: number | null;
  per_user_limit: number;
  valid_from?: string | null;
  valid_until?: string | null;
  applicable_plan_ids: string[];
  minimum_amount: number;
  is_active: boolean;
  redeemed_count: number;
};

export type CreateCouponPayload = {
  code: string;
  description?: string;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  currency?: string;
  max_redemptions?: number | null;
  per_user_limit: number;
  minimum_amount: number;
  valid_from?: string;
  valid_until?: string;
  applicable_plan_ids: string[];
  is_active: boolean;
};

export type UpdateCouponPayload = Partial<CreateCouponPayload>;

export async function getAdminCoupons(token: string): Promise<AdminCoupon[]> {
  return adminApiDataRequest<AdminCoupon[]>("/admin/coupons", {
    headers: authHeaders(token),
  });
}

export async function getAdminCoupon(token: string, id: string): Promise<AdminCoupon> {
  return adminApiDataRequest<AdminCoupon>(`/admin/coupons/${id}`, {
    headers: authHeaders(token),
  });
}

export async function createCoupon(token: string, payload: CreateCouponPayload) {
  return adminApiDataRequest<AdminCoupon>("/admin/coupons", {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
}

export async function updateCoupon(token: string, id: string, payload: UpdateCouponPayload) {
  return adminApiDataRequest<AdminCoupon>(`/admin/coupons/${id}`, {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
}

export async function toggleCoupon(token: string, id: string): Promise<AdminCoupon> {
  return adminApiDataRequest<AdminCoupon>(`/admin/coupons/${id}/toggle`, {
    method: "PATCH",
    headers: authHeaders(token),
  });
}

export async function deleteCoupon(token: string, id: string): Promise<void> {
  await adminApiDataRequest<{ id: string }>(`/admin/coupons/${id}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
}

/* ── Payments (detail) ────────────────────────────────────────────── */

export async function getAdminPayment(token: string, id: string): Promise<AdminPayment> {
  return adminApiDataRequest<AdminPayment>(`/admin/payments/${id}`, {
    headers: authHeaders(token),
  });
}

/* ── Plans (admin) ────────────────────────────────────────────────── */

export type AdminPlan = {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  currency: string;
  billing_interval: string;
  generation_limit: number;
  can_use_premium_templates: boolean;
  can_save_unlimited_prompts: boolean;
  priority_generation: boolean;
  is_active: boolean;
  provider_prices: Record<string, { amount: number; currency: string }>;
};

export type PlanUpdatePayload = {
  name?: string;
  description?: string;
  price?: number;
  currency?: string;
  billing_interval?: string;
  generation_limit?: number;
  can_use_premium_templates?: boolean;
  can_save_unlimited_prompts?: boolean;
  priority_generation?: boolean;
  is_active?: boolean;
};

export type PlanCreatePayload = PlanUpdatePayload & {
  name: string;
  slug: string;
  description: string;
  price: number;
  generation_limit: number;
};

export async function getAdminPlans(token: string): Promise<AdminPlan[]> {
  return adminApiDataRequest<AdminPlan[]>("/admin/plans", { headers: authHeaders(token) });
}

export async function createAdminPlan(token: string, payload: PlanCreatePayload): Promise<AdminPlan> {
  return adminApiDataRequest<AdminPlan>("/admin/plans", {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
}

export async function updateAdminPlan(token: string, id: string, payload: PlanUpdatePayload): Promise<AdminPlan> {
  return adminApiDataRequest<AdminPlan>(`/admin/plans/${id}`, {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
}

export async function toggleAdminPlan(token: string, id: string): Promise<AdminPlan> {
  return adminApiDataRequest<AdminPlan>(`/admin/plans/${id}/toggle`, {
    method: "PATCH",
    headers: authHeaders(token),
  });
}

export async function deleteAdminPlan(token: string, id: string): Promise<void> {
  await adminApiDataRequest<{ id?: string }>(`/admin/plans/${id}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
}

/* ── Prompts (admin) ──────────────────────────────────────────────── */

export type AdminPrompt = {
  id: string;
  user_id: string;
  user_name?: string | null;
  user_email?: string | null;
  title: string;
  rough_input?: string | null;
  generated_prompt: string;
  category: string;
  tone?: string;
  platform?: string;
  complexity?: string;
  output_format?: string;
  image_urls?: string[];
  created_at: string;
  source?: string;
};

export async function getAdminPrompts(token: string): Promise<AdminPrompt[]> {
  return adminApiDataRequest<AdminPrompt[]>("/admin/prompts", {
    headers: authHeaders(token),
  });
}

/* ── Analytics ────────────────────────────────────────────────────── */

export type AIUsageStat = {
  date: string;
  total_requests: number;
  total_tokens: number;
  prompt_tokens: number;
  completion_tokens: number;
  avg_tokens_per_request: number;
  failed_requests: number;
};

export type SystemAnalytics = {
  ai_usage: AIUsageStat[];
  total_tokens_all_time: number;
  total_ai_requests_all_time: number;
  avg_response_time_ms: number;
  success_rate_pct: number;
  top_categories: { category: string; count: number }[];
  top_platforms: { platform: string; count: number }[];
  daily_new_users: { date: string; count: number }[];
  daily_generations: { date: string; count: number }[];
  revenue_by_day: { date: string; amount: number; currency: string }[];
  plan_distribution: { plan: string; count: number }[];
};

export async function getSystemAnalytics(token: string, days = 30): Promise<SystemAnalytics> {
  return adminApiDataRequest<SystemAnalytics>(`/admin/analytics?days=${days}`, {
    headers: authHeaders(token),
  });
}
