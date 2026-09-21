import { supabase } from "./supabase";

export type Entitlement = {
  tier: "free" | "premium" | "promo";
  watchlist_item_limit: number | null;
  alert_limit: number | null;
  signal_alert_limit: number | null;
  portfolio_limit: number | null;
  advanced_indicators: boolean;
  realtime_data: boolean;
  ai_reports: boolean;
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

export async function fetchEntitlement(): Promise<Entitlement> {
  const response = await authFetch("/entitlements");
  if (!response.ok) throw new Error("Failed to load entitlement");
  return response.json();
}
