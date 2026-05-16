import { apiDataRequest } from "@/lib/api/client";

export type PaymentProvider = "paystack" | "stripe";

export type PaymentRecord = {
  id: string;
  user_id: string;
  plan_id: string;
  provider: string;
  provider_reference: string;
  amount: number;
  currency: string;
  status: string;
  metadata: Record<string, unknown>;
  created_at: string | null;
  updated_at: string | null;
  plan_snapshot: PaymentPlanSnapshot | null;
};

export type PaymentPlanSnapshot = {
  plan_id: string;
  name: string | null;
  slug: string | null;
  billing_interval: string | null;
  plan_currency: string | null;
  plan_amount: number | null;
  provider_currency: string | null;
  provider_amount: number | null;
};

export type BillingState = {
  current_plan_id: string | null;
  subscription_id: string | null;
  subscription_status: string;
  payment_status: string;
  granted: boolean;
  resolved_via: string;
};

export type ProviderStatus = {
  provider: string;
  reference: string | null;
  status: string;
  event: string | null;
  message: string | null;
  source: string;
};

export type PaymentVerificationResult = {
  payment: PaymentRecord;
  plan_snapshot: PaymentPlanSnapshot | null;
  subscription: {
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
  } | null;
  billing_state: BillingState;
  provider_status: ProviderStatus;
  provider_debug: Record<string, unknown> | null;
  already_verified?: boolean;
};

export type PaymentProviderConfig = {
  api_base_url: string;
  default_callback_url: string;
  providers: Record<
    PaymentProvider,
    {
      name: string;
      webhook_url: string;
      callback_url: string;
      signature_header: string;
      signature_source: string;
      webhook_secret_required: boolean;
      instructions: string;
    }
  >;
};

export async function initializePayment(
  accessToken: string,
  payload: {
    plan_id: string;
    provider: PaymentProvider;
    callback_url?: string;
  },
) {
  return apiDataRequest<{
    payment: PaymentRecord;
    authorization: {
      authorization_url?: string;
      reference?: string;
      message?: string;
      payload?: Record<string, unknown>;
    };
  }>("/payments/initialize", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });
}

export async function verifyPayment(
  accessToken: string,
  reference: string,
) {
  return apiDataRequest<PaymentVerificationResult>(`/payments/verify/${reference}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

export async function getMyPayments(accessToken: string) {
  return apiDataRequest<PaymentRecord[]>("/payments/me", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

export async function getPaymentProviderConfig(accessToken: string) {
  return apiDataRequest<PaymentProviderConfig>("/payments/providers/config", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}
