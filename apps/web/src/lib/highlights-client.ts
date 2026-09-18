import { authFetch } from "@/lib/api-client";

export type Highlight = {
  symbol: string;
  exchange: string;
  name: string;
  sector: string | null;
  price: number | null;
  change_abs: number | null;
  change_pct: number | null;
};

type HighlightsResponse = {
  highlights: Highlight[];
  warnings: string[];
};

export async function fetchHighlights(): Promise<HighlightsResponse> {
  const response = await authFetch("/highlights");
  if (!response.ok) throw new Error("Failed to load highlights");
  return response.json();
}
