import { authFetch } from "@/lib/api-client";

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
