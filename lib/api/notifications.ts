import { apiDataRequest } from "@/lib/api/client";

export type NotificationRecord = {
  id: string;
  title: string;
  body: string;
  type: string;
  data: Record<string, unknown>;
  is_read: boolean;
};

export async function getNotifications(accessToken: string) {
  return apiDataRequest<NotificationRecord[]>("/notifications", {
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
