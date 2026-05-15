import { apiDataRequest } from "@/lib/api/client";

export type PaymentProvider = "paystack" | "stripe";

export type PaymentRecord = {
  id: string;
  provider: string;
  provider_reference: string;
  amount: number;
  currency: string;
  status: string;
  metadata: Record<string, unknown>;
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

export async function getPaymentProviderConfig(accessToken: string) {
  return apiDataRequest<PaymentProviderConfig>("/payments/providers/config", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}
