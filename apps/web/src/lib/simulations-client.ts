import { authFetch } from "@/lib/api-client";

export type SimulationPosition = {
  id: string;
  symbol: string;
  exchange: string;
  name: string | null;
  quantity: number;
  avg_cost: number;
  created_at: string;
  updated_at: string;
  current_price: number | null;
  market_value: number | null;
  cost_basis: number;
  pnl_abs: number | null;
  pnl_pct: number | null;
  price_unavailable: boolean;
};

export type Simulation = {
  id: string;
  name: string;
  starting_budget: number;
  cash_balance: number;
  created_at: string;
  positions: SimulationPosition[];
  positions_value: number;
  total_equity: number;
  total_pnl_abs: number;
  total_pnl_pct: number | null;
};

export type SnapshotPoint = {
  snapshot_date: string;
  cash_balance: number;
  positions_value: number;
  total_equity: number;
  pnl_abs: number;
  pnl_pct: number | null;
};

type SimulationsResponse = { simulations: Simulation[]; warnings: string[] };
type HistoryResponse = { history: SnapshotPoint[]; warnings: string[] };

async function parseErrorOrThrow(response: Response, fallback: string): Promise<never> {
  const body = await response.json().catch(() => null);
  throw new Error(body?.detail ?? fallback);
}

export async function fetchSimulations(): Promise<SimulationsResponse> {
  const response = await authFetch("/simulations");
  if (!response.ok) return parseErrorOrThrow(response, "Failed to load simulations");
  return response.json();
}

export async function createSimulation(name: string, startingBudget: number): Promise<Simulation> {
  const response = await authFetch("/simulations", {
    method: "POST",
    body: JSON.stringify({ name, starting_budget: startingBudget }),
  });
  if (!response.ok) return parseErrorOrThrow(response, "Failed to create simulation");
  return response.json();
}

export async function deleteSimulation(simulationId: string): Promise<void> {
  const response = await authFetch(`/simulations/${simulationId}`, { method: "DELETE" });
  if (!response.ok) return parseErrorOrThrow(response, "Failed to delete simulation");
}

export async function placeOrder(
  simulationId: string,
  order: { symbol: string; exchange: string; name?: string | null; quantity: number; side: "buy" | "sell" }
): Promise<SimulationPosition> {
  const response = await authFetch(`/simulations/${simulationId}/orders`, {
    method: "POST",
    body: JSON.stringify(order),
  });
  if (!response.ok) return parseErrorOrThrow(response, "Failed to place order");
  return response.json();
}

export async function fetchHistory(simulationId: string): Promise<HistoryResponse> {
  const response = await authFetch(`/simulations/${simulationId}/history`);
  if (!response.ok) return parseErrorOrThrow(response, "Failed to load history");
  return response.json();
}
