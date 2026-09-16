import { supabase } from "./supabase";

export type PriceAlert = {
  id: string;
  symbol: string;
  exchange: string;
  name: string | null;
  direction: "above" | "below";
  threshold: number;
  status: "active" | "triggered";
  created_at: string;
  triggered_at: string | null;
  unavailable: boolean;
};

export type AlertsResponse = {
  alerts: PriceAlert[];
  warnings: string[];
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

export async function fetchAlerts(): Promise<AlertsResponse> {
  const response = await authFetch("/alerts");
  if (!response.ok) throw new Error("Failed to load alerts");
  return response.json();
}

export async function createAlert(alert: {
  symbol: string;
  exchange: string;
  name?: string | null;
  direction: "above" | "below";
  threshold: number;
}): Promise<PriceAlert> {
  const response = await authFetch("/alerts", {
    method: "POST",
    body: JSON.stringify(alert),
  });
  if (!response.ok) throw new Error("Failed to create alert");
  return response.json();
}

export async function deleteAlert(alertId: string): Promise<void> {
  const response = await authFetch(`/alerts/${alertId}`, { method: "DELETE" });
  if (!response.ok) throw new Error("Failed to delete alert");
}
