import { supabase } from "./supabase";

export type Pick = {
  symbol: string;
  name: string;
  score: number;
  label: string;
};

export type Bulletin = {
  bulletin_date: string;
  sector: string;
  picks: Pick[];
  content: string;
  created_at: string;
};

type BulletinsResponse = { bulletins: Bulletin[]; warnings: string[] };

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

export async function fetchBulletins(): Promise<BulletinsResponse> {
  const response = await authFetch("/bulletins");
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.detail ?? "Failed to load bulletins");
  }
  return response.json();
}
