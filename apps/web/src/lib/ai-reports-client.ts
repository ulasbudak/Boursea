import { authFetch } from "@/lib/api-client";

export type FundamentalAIReport = {
  symbol: string;
  exchange: string;
  report: string;
  generated_at: string;
  cached: boolean;
};

export type Detection = {
  label: string;
  confidence: number;
};

export type TechnicalAIReport = {
  symbol: string;
  exchange: string;
  report: string;
  detections: Detection[];
  generated_at: string;
  cached: boolean;
};

export type CombinedAIReport = {
  symbol: string;
  exchange: string;
  report: string;
  generated_at: string;
  cached: boolean;
};

type FundamentalResponse = { report: FundamentalAIReport | null; warnings: string[] };
type TechnicalResponse = { report: TechnicalAIReport | null; warnings: string[] };
type CombinedResponse = { report: CombinedAIReport | null; warnings: string[] };

async function fetchReport<T>(path: string, symbol: string, exchange: string): Promise<T> {
  const response = await authFetch(
    `${path}?symbol=${encodeURIComponent(symbol)}&exchange=${encodeURIComponent(exchange)}`
  );
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.detail ?? "Failed to load AI report");
  }
  return response.json();
}

export async function fetchFundamentalAIReport(
  symbol: string,
  exchange: string
): Promise<FundamentalResponse> {
  return fetchReport("/symbols/ai-report/fundamental", symbol, exchange);
}

export async function fetchTechnicalAIReport(
  symbol: string,
  exchange: string
): Promise<TechnicalResponse> {
  return fetchReport("/symbols/ai-report/technical", symbol, exchange);
}

export async function fetchCombinedAIReport(
  symbol: string,
  exchange: string
): Promise<CombinedResponse> {
  return fetchReport("/symbols/ai-report/combined", symbol, exchange);
}
