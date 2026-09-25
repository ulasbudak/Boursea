import { headers } from "next/headers";

/** The public origin of the current request, for links Supabase emails back to the user. */
export async function getSiteOrigin(): Promise<string> {
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  const proto =
    headerList.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
