import { authFetch } from "@/lib/api-client";

export type Position = {
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

export type Portfolio = {
  id: string;
  name: string;
  created_at: string;
  positions: Position[];
  total_market_value: number;
  total_cost_basis: number;
  total_pnl_abs: number;
  total_pnl_pct: number | null;
};

type PortfoliosResponse = {
  portfolios: Portfolio[];
  warnings: string[];
};

export async function fetchPortfolios(): Promise<PortfoliosResponse> {
  const response = await authFetch("/portfolios");
  if (!response.ok) throw new Error("Failed to load portfolios");
  return response.json();
}

export async function createPortfolio(name: string): Promise<Portfolio> {
  const response = await authFetch("/portfolios", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
  if (!response.ok) throw new Error("Failed to create portfolio");
  return response.json();
}

export async function deletePortfolio(portfolioId: string): Promise<void> {
  const response = await authFetch(`/portfolios/${portfolioId}`, { method: "DELETE" });
  if (!response.ok) throw new Error("Failed to delete portfolio");
}

export async function addTransaction(
  portfolioId: string,
  transaction: {
    symbol: string;
    exchange: string;
    name?: string | null;
    quantity: number;
    price: number;
    side: "buy" | "sell";
  }
): Promise<Position> {
  const response = await authFetch(`/portfolios/${portfolioId}/positions`, {
    method: "POST",
    body: JSON.stringify(transaction),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.detail ?? "Failed to add transaction");
  }
  return response.json();
}

export async function deletePosition(portfolioId: string, positionId: string): Promise<void> {
  const response = await authFetch(`/portfolios/${portfolioId}/positions/${positionId}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Failed to delete position");
}
