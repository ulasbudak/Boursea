import { createClient } from "@/lib/supabase/client";

/** Fetch against the backend with the current Supabase session attached as a bearer token. */
export async function authFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  const headers = new Headers(init.headers);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  return fetch(`${apiUrl}${path}`, { ...init, headers });
}
