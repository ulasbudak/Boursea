import { cookies, headers } from "next/headers";
import { resolveLocale, resolveLocaleFromAcceptLanguage, type Locale } from "@boursea/shared";
import { createClient } from "@/lib/supabase/server";

export const LOCALE_COOKIE = "boursea_locale";

export async function getLocale(): Promise<Locale> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const metadataLocale = data?.claims?.user_metadata?.locale;
  if (typeof metadataLocale === "string") {
    return resolveLocale(metadataLocale);
  }

  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value;
  if (cookieLocale) {
    return resolveLocale(cookieLocale);
  }

  const headerList = await headers();
  return resolveLocaleFromAcceptLanguage(headerList.get("accept-language"));
}
