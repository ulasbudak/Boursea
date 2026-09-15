import { supabase } from "./supabase";

export type WatchlistItem = {
  id: string;
  symbol: string;
  exchange: string;
  name: string | null;
  note: string | null;
  added_at: string;
};

export type Watchlist = {
  id: string;
  name: string;
  created_at: string;
  items: WatchlistItem[];
};

async function authFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  const headers = new Headers(init.headers);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const apiUrl = process.env.EXPO_PUBLIC_API_URL;
  return fetch(`${apiUrl}${path}`, { ...init, headers });
}

export async function fetchWatchlists(): Promise<Watchlist[]> {
  const response = await authFetch("/watchlists");
  if (!response.ok) throw new Error("Failed to load watchlists");
  return response.json();
}

export async function createWatchlist(name: string): Promise<Watchlist> {
  const response = await authFetch("/watchlists", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
  if (!response.ok) throw new Error("Failed to create watchlist");
  return response.json();
}

export async function deleteWatchlist(watchlistId: string): Promise<void> {
  const response = await authFetch(`/watchlists/${watchlistId}`, { method: "DELETE" });
  if (!response.ok) throw new Error("Failed to delete watchlist");
}

export async function addWatchlistItem(
  watchlistId: string,
  item: { symbol: string; exchange: string; name?: string | null }
): Promise<WatchlistItem> {
  const response = await authFetch(`/watchlists/${watchlistId}/items`, {
    method: "POST",
    body: JSON.stringify(item),
  });
  if (!response.ok) throw new Error("Failed to add item");
  return response.json();
}

export async function removeWatchlistItem(watchlistId: string, itemId: string): Promise<void> {
  const response = await authFetch(`/watchlists/${watchlistId}/items/${itemId}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Failed to remove item");
}
