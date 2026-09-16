import { supabase } from "./supabase";

export type SavedScreen = {
  id: string;
  name: string;
  criteria: Record<string, unknown>;
  created_at: string;
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

export async function fetchSavedScreens(): Promise<SavedScreen[]> {
  const response = await authFetch("/saved-screens");
  if (!response.ok) throw new Error("Failed to load saved screens");
  return response.json();
}

export async function createSavedScreen(
  name: string,
  criteria: Record<string, unknown>
): Promise<SavedScreen> {
  const response = await authFetch("/saved-screens", {
    method: "POST",
    body: JSON.stringify({ name, criteria }),
  });
  if (!response.ok) throw new Error("Failed to save screen");
  return response.json();
}

export async function renameSavedScreen(id: string, name: string): Promise<SavedScreen> {
  const response = await authFetch(`/saved-screens/${id}`, {
    method: "PUT",
    body: JSON.stringify({ name }),
  });
  if (!response.ok) throw new Error("Failed to rename saved screen");
  return response.json();
}

export async function deleteSavedScreen(id: string): Promise<void> {
  const response = await authFetch(`/saved-screens/${id}`, { method: "DELETE" });
  if (!response.ok) throw new Error("Failed to delete saved screen");
}
