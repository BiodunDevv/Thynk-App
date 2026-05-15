import { apiDataRequest, apiRequest } from "@/lib/api/client";
import type { AuthSessionPayload, LoginPayload } from "@/lib/api/auth";

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}` };
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
  return apiDataRequest<AdminOverview>("/admin/dashboard/overview", {
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
};

export async function getAdminUsers(token: string): Promise<AdminUser[]> {
  return apiDataRequest<AdminUser[]>("/admin/users", {
    headers: authHeaders(token),
  });
}

export async function getAdminUser(token: string, userId: string): Promise<AdminUser> {
  return apiDataRequest<AdminUser>(`/admin/users/${userId}`, {
    headers: authHeaders(token),
  });
}

export async function toggleUserStatus(token: string, userId: string): Promise<AdminUser> {
  return apiDataRequest<AdminUser>(`/admin/users/${userId}/toggle-status`, {
    method: "PATCH",
    headers: authHeaders(token),
  });
}

export async function grantCredits(
  token: string,
  userId: string,
  amount: number,
  reason: string,
) {
  return apiDataRequest<{ user_id: string; credits_added: number; remaining_credits: number }>(
    `/admin/users/${userId}/grant-credits`,
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
  return apiDataRequest<SupportTicket[]>("/admin/support/tickets", {
    headers: authHeaders(token),
  });
}

export async function replyToTicket(token: string, ticketId: string, message: string) {
  return apiDataRequest<{ ticket_id: string }>(`/admin/support/tickets/${ticketId}/reply`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ message }),
  });
}

export async function updateTicketStatus(token: string, ticketId: string, status: string) {
  return apiDataRequest<{ ticket_id: string; status: string }>(
    `/admin/support/tickets/${ticketId}/status`,
    {
      method: "PATCH",
      headers: authHeaders(token),
      body: JSON.stringify({ status }),
    },
  );
}

export async function updateTicketPriority(token: string, ticketId: string, priority: string) {
  return apiDataRequest<{ ticket_id: string; priority: string }>(
    `/admin/support/tickets/${ticketId}/priority`,
    {
      method: "PATCH",
      headers: authHeaders(token),
      body: JSON.stringify({ priority }),
    },
  );
}

/* ── Request chats ────────────────────────────────────────────────── */

export type RequestChat = {
  id: string;
  user_id: string;
  title: string;
  category: string;
  status: string;
  is_reported: boolean;
  messages: { role: string; content: string; created_at: string }[];
  created_at: string;
};

export async function getAdminChats(token: string): Promise<RequestChat[]> {
  return apiDataRequest<RequestChat[]>("/admin/request-chats", {
    headers: authHeaders(token),
  });
}

export async function addChatNote(token: string, chatId: string, note: string) {
  return apiDataRequest<{ chat_id: string; note: string }>(
    `/admin/request-chats/${chatId}/notes`,
    {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify({ note }),
    },
  );
}

/* ── Payments ─────────────────────────────────────────────────────── */

export type AdminPayment = {
  id: string;
  user_id: string;
  plan_id: string;
  amount: number;
  currency: string;
  status: string;
  provider: string;
  created_at: string;
};

export async function getAdminPayments(token: string): Promise<AdminPayment[]> {
  return apiDataRequest<AdminPayment[]>("/admin/payments", {
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
  return apiDataRequest<AdminTemplate[]>("/admin/templates", {
    headers: authHeaders(token),
  });
}

export async function getAdminTemplate(token: string, id: string): Promise<AdminTemplate> {
  return apiDataRequest<AdminTemplate>(`/admin/templates/${id}`, {
    headers: authHeaders(token),
  });
}

export async function createTemplate(token: string, payload: CreateTemplatePayload) {
  return apiDataRequest<AdminTemplate>("/admin/templates", {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
}

export async function toggleTemplate(token: string, id: string): Promise<AdminTemplate> {
  return apiDataRequest<AdminTemplate>(`/admin/templates/${id}/toggle`, {
    method: "PATCH",
    headers: authHeaders(token),
  });
}

export async function deleteTemplate(token: string, id: string): Promise<void> {
  await apiDataRequest<{ id: string }>(`/admin/templates/${id}`, {
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

export async function getAdminCoupons(token: string): Promise<AdminCoupon[]> {
  return apiDataRequest<AdminCoupon[]>("/admin/coupons", {
    headers: authHeaders(token),
  });
}

export async function getAdminCoupon(token: string, id: string): Promise<AdminCoupon> {
  return apiDataRequest<AdminCoupon>(`/admin/coupons/${id}`, {
    headers: authHeaders(token),
  });
}

export async function createCoupon(token: string, payload: CreateCouponPayload) {
  return apiDataRequest<AdminCoupon>("/admin/coupons", {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
}

export async function toggleCoupon(token: string, id: string): Promise<AdminCoupon> {
  return apiDataRequest<AdminCoupon>(`/admin/coupons/${id}/toggle`, {
    method: "PATCH",
    headers: authHeaders(token),
  });
}

export async function deleteCoupon(token: string, id: string): Promise<void> {
  await apiDataRequest<{ id: string }>(`/admin/coupons/${id}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
}

/* ── Payments (detail) ────────────────────────────────────────────── */

export async function getAdminPayment(token: string, id: string): Promise<AdminPayment> {
  return apiDataRequest<AdminPayment>(`/admin/payments/${id}`, {
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
  return apiDataRequest<AdminPlan[]>("/admin/plans", { headers: authHeaders(token) });
}

export async function createAdminPlan(token: string, payload: PlanCreatePayload): Promise<AdminPlan> {
  return apiDataRequest<AdminPlan>("/admin/plans", {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
}

export async function updateAdminPlan(token: string, id: string, payload: PlanUpdatePayload): Promise<AdminPlan> {
  return apiDataRequest<AdminPlan>(`/admin/plans/${id}`, {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
}

export async function toggleAdminPlan(token: string, id: string): Promise<AdminPlan> {
  return apiDataRequest<AdminPlan>(`/admin/plans/${id}/toggle`, {
    method: "PATCH",
    headers: authHeaders(token),
  });
}

export async function deleteAdminPlan(token: string, id: string): Promise<void> {
  await apiRequest(`/admin/plans/${id}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
}
