import { supabase } from "./supabase";

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
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  const headers = new Headers();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const apiUrl = process.env.EXPO_PUBLIC_API_URL;
  const response = await fetch(`${apiUrl}/highlights`, { headers });
  if (!response.ok) throw new Error("Failed to load highlights");
  return response.json();
}
