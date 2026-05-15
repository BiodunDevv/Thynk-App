"use client";

export type CheckoutProvider = "paystack" | "stripe";

export type PendingCheckoutSelection = {
  planSlug: string;
  provider?: CheckoutProvider;
  redirectTo: string;
  source?: string;
};

const CHECKOUT_STORAGE_KEY = "thynk.pending.checkout";

export function createCheckoutUrl(
  pathname: string,
  selection: Omit<PendingCheckoutSelection, "redirectTo">,
) {
  const params = new URLSearchParams();
  params.set("plan", selection.planSlug);

  if (selection.provider) {
    params.set("provider", selection.provider);
  }

  if (selection.source) {
    params.set("source", selection.source);
  }

  return `${pathname}?${params.toString()}`;
}

export function buildCheckoutRedirectPath(
  selection: Pick<PendingCheckoutSelection, "planSlug" | "provider">,
) {
  const params = new URLSearchParams();
  params.set("tab", "billing");
  params.set("plan", selection.planSlug);

  if (selection.provider) {
    params.set("provider", selection.provider);
  }

  return `/settings?${params.toString()}`;
}

export function writePendingCheckout(selection: PendingCheckoutSelection) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(CHECKOUT_STORAGE_KEY, JSON.stringify(selection));
}

export function readPendingCheckout() {
  if (typeof window === "undefined") {
    return null as PendingCheckoutSelection | null;
  }

  const value = window.localStorage.getItem(CHECKOUT_STORAGE_KEY);

  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as PendingCheckoutSelection;
  } catch {
    window.localStorage.removeItem(CHECKOUT_STORAGE_KEY);
    return null;
  }
}

export function clearPendingCheckout() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(CHECKOUT_STORAGE_KEY);
}
