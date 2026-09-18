import { supabase } from "./supabase";

export type StockNote = {
  id: string;
  symbol: string;
  exchange: string;
  note: string;
  created_at: string;
  updated_at: string;
};

async function authFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");

  const apiUrl = process.env.EXPO_PUBLIC_API_URL;
  return fetch(`${apiUrl}${path}`, { ...init, headers });
}

export async function fetchNote(symbol: string, exchange: string): Promise<StockNote | null> {
  const response = await authFetch(
    `/notes?symbol=${encodeURIComponent(symbol)}&exchange=${encodeURIComponent(exchange)}`
  );
  if (!response.ok) throw new Error("Failed to load note");
  return response.json();
}

export async function saveNote(symbol: string, exchange: string, note: string): Promise<StockNote> {
  const response = await authFetch("/notes", {
    method: "PUT",
    body: JSON.stringify({ symbol, exchange, note }),
  });
  if (!response.ok) throw new Error("Failed to save note");
  return response.json();
}

export async function deleteNote(symbol: string, exchange: string): Promise<void> {
  const response = await authFetch(
    `/notes?symbol=${encodeURIComponent(symbol)}&exchange=${encodeURIComponent(exchange)}`,
    { method: "DELETE" }
  );
  if (!response.ok) throw new Error("Failed to delete note");
}
