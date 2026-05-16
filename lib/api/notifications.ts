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
