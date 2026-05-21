"use client";

const SERVICE_WORKER_URL = "/thynk-push-sw.js";

function toUint8Array(base64Url: string) {
  const padded = `${base64Url}${"=".repeat((4 - (base64Url.length % 4 || 4)) % 4)}`
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const raw = window.atob(padded);
  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
}

function serializePushSubscription(subscription: PushSubscription) {
  const json = subscription.toJSON();
  const p256dh = json.keys?.p256dh;
  const auth = json.keys?.auth;

  if (!json.endpoint || !p256dh || !auth) {
    throw new Error("Browser push subscription is incomplete.");
  }

  return {
    endpoint: json.endpoint,
    expirationTime: json.expirationTime ?? null,
    keys: { p256dh, auth },
    origin: window.location.origin,
    user_agent: navigator.userAgent,
  };
}

export function supportsWebPush() {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export async function ensurePushServiceWorker() {
  if (!supportsWebPush()) {
    throw new Error("This browser does not support web push.");
  }

  return navigator.serviceWorker.register(SERVICE_WORKER_URL, { scope: "/" });
}

export async function getExistingWebPushSubscription() {
  if (!supportsWebPush()) {
    return null;
  }

  const registration = await navigator.serviceWorker.getRegistration("/");
  if (!registration) {
    return null;
  }

  return registration.pushManager.getSubscription();
}

export async function subscribeToWebPush(vapidPublicKey: string) {
  if (!vapidPublicKey) {
    throw new Error("Web push is not configured for this environment.");
  }

  if (!supportsWebPush()) {
    throw new Error("This browser does not support web push.");
  }

  const permission = await window.Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("Notification permission was not granted.");
  }

  const registration = await ensurePushServiceWorker();
  const existing = await registration.pushManager.getSubscription();
  if (existing) {
    return serializePushSubscription(existing);
  }

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: toUint8Array(vapidPublicKey),
  });

  return serializePushSubscription(subscription);
}

export async function unsubscribeFromWebPush() {
  const existing = await getExistingWebPushSubscription();
  if (!existing) {
    return null;
  }

  const endpoint = existing.endpoint;
  await existing.unsubscribe();
  return endpoint;
}
