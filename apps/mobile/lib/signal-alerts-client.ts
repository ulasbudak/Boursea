import { supabase } from "./supabase";

export type SignalRule = {
  rule_id: string;
  rule_name: string;
  direction: "bullish" | "bearish";
};

export type SignalAlert = {
  id: string;
  symbol: string;
  exchange: string;
  name: string | null;
  rule_id: string;
  rule_name: string;
  timeframe: string;
  status: "active" | "triggered";
  created_at: string;
  triggered_at: string | null;
  unavailable: boolean;
};

export type SignalAlertsResponse = {
  alerts: SignalAlert[];
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

export async function fetchSignalRules(): Promise<SignalRule[]> {
  const apiUrl = process.env.EXPO_PUBLIC_API_URL;
  const response = await fetch(`${apiUrl}/technical/rules`);
  if (!response.ok) throw new Error("Failed to load signal rules");
  return response.json();
}

export async function fetchSignalAlerts(): Promise<SignalAlertsResponse> {
  const response = await authFetch("/signal-alerts");
  if (!response.ok) throw new Error("Failed to load signal alerts");
  return response.json();
}

export async function createSignalAlert(alert: {
  symbol: string;
  exchange: string;
  name?: string | null;
  rule_id: string;
  timeframe: string;
}): Promise<SignalAlert> {
  const response = await authFetch("/signal-alerts", {
    method: "POST",
    body: JSON.stringify(alert),
  });
  if (!response.ok) throw new Error("Failed to create signal alert");
  return response.json();
}

export async function deleteSignalAlert(alertId: string): Promise<void> {
  const response = await authFetch(`/signal-alerts/${alertId}`, { method: "DELETE" });
  if (!response.ok) throw new Error("Failed to delete signal alert");
}
