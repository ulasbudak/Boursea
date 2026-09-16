import { supabase } from "./supabase";

export type NotificationSettings = {
  expo_push_token: string | null;
  push_enabled: boolean;
  email_enabled: boolean;
};

async function authFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  const headers = new Headers(init.headers);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const apiUrl = process.env.EXPO_PUBLIC_API_URL;
  return fetch(`${apiUrl}${path}`, { ...init, headers });
}

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
