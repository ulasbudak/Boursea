import { authFetch } from "@/lib/api-client";

export type Entitlement = {
  tier: "free" | "premium";
  watchlist_item_limit: number | null;
  alert_limit: number | null;
  signal_alert_limit: number | null;
  portfolio_limit: number | null;
  advanced_indicators: boolean;
  realtime_data: boolean;
};

export async function fetchEntitlement(): Promise<Entitlement> {
  const response = await authFetch("/entitlements");
  if (!response.ok) throw new Error("Failed to load entitlement");
  return response.json();
}
