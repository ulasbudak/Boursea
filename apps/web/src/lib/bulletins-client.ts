import { authFetch } from "@/lib/api-client";

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

export async function fetchBulletins(): Promise<BulletinsResponse> {
  const response = await authFetch("/bulletins");
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.detail ?? "Failed to load bulletins");
  }
  return response.json();
}
