import { apiDataRequest } from "@/lib/api/client";

export type NotificationRecord = {
  id: string;
  title: string;
  body: string;
  type: string;
  data: Record<string, unknown>;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
};

export type NotificationSummary = {
  unread_count: number;
  registered_devices: number;
  has_browser_token: boolean;
  has_web_push_subscription: boolean;
};

export type WebPushSubscriptionPayload = {
  endpoint: string;
  expirationTime: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
  origin?: string;
  user_agent?: string;
};

export async function getNotifications(accessToken: string) {
  return apiDataRequest<NotificationRecord[]>("/notifications", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

export async function getNotificationSummary(accessToken: string) {
  return apiDataRequest<NotificationSummary>("/notifications/summary", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

export async function registerNotificationToken(accessToken: string, token: string) {
  return apiDataRequest<Record<string, never>>("/notifications/register-token", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ token }),
  });
}

export async function removeNotificationToken(accessToken: string, token: string) {
  return apiDataRequest<Record<string, never>>("/notifications/remove-token", {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ token }),
  });
}

export async function registerWebPushSubscription(
  accessToken: string,
  payload: WebPushSubscriptionPayload,
) {
  return apiDataRequest<Record<string, never>>("/notifications/web-push", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });
}

export async function removeWebPushSubscription(accessToken: string, endpoint: string) {
  return apiDataRequest<Record<string, never>>("/notifications/web-push", {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ endpoint }),
  });
}

export async function sendTestNotification(accessToken: string) {
  return apiDataRequest<NotificationRecord>("/notifications/test", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

export async function markNotificationRead(accessToken: string, notificationId: string) {
  return apiDataRequest<NotificationRecord>(`/notifications/${notificationId}/read`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

export async function markAllNotificationsRead(accessToken: string) {
  return apiDataRequest<{ marked_count: number }>("/notifications/read-all", {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

export async function deleteNotification(accessToken: string, notificationId: string) {
  return apiDataRequest<{ deleted: boolean; notification_id: string }>(`/notifications/${notificationId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}
