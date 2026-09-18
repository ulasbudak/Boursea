import { authFetch } from "@/lib/api-client";

export type StockNote = {
  id: string;
  symbol: string;
  exchange: string;
  note: string;
  created_at: string;
  updated_at: string;
};

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
