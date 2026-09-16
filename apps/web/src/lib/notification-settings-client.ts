import { authFetch } from "@/lib/api-client";

export type NotificationSettings = {
  expo_push_token: string | null;
  push_enabled: boolean;
  email_enabled: boolean;
};

export async function fetchNotificationSettings(): Promise<NotificationSettings> {
  const response = await authFetch("/notification-settings");
  if (!response.ok) throw new Error("Failed to load notification settings");
  return response.json();
}

export async function updateNotificationSettings(update: {
  expo_push_token?: string | null;
  push_enabled?: boolean;
  email_enabled?: boolean;
}): Promise<NotificationSettings> {
  const response = await authFetch("/notification-settings", {
    method: "PUT",
    body: JSON.stringify(update),
  });
  if (!response.ok) throw new Error("Failed to update notification settings");
  return response.json();
}
