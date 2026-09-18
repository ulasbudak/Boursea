import { supabase } from "./supabase";

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

type FundamentalResponse = { report: FundamentalAIReport | null; warnings: string[] };
type TechnicalResponse = { report: TechnicalAIReport | null; warnings: string[] };

async function authFetch(path: string): Promise<Response> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  const headers = new Headers();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const apiUrl = process.env.EXPO_PUBLIC_API_URL;
  return fetch(`${apiUrl}${path}`, { headers });
}

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
