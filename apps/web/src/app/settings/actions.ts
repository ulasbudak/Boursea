"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { SUPPORTED_LOCALES, type Locale } from "@borocean/shared";
import { createClient } from "@/lib/supabase/server";
import { LOCALE_COOKIE } from "@/lib/i18n/locale";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export async function setLocale(locale: string) {
  if (!(SUPPORTED_LOCALES as readonly string[]).includes(locale)) {
    return;
  }
  const typedLocale = locale as Locale;

  const cookieStore = await cookies();
  cookieStore.set(LOCALE_COOKIE, typedLocale, {
    path: "/",
    maxAge: ONE_YEAR_SECONDS,
    sameSite: "lax",
  });

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (data?.claims) {
    await supabase.auth.updateUser({ data: { locale: typedLocale } });
  }

  revalidatePath("/", "layout");
}

export async function setInterestSectors(sectors: string[]) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) return;

  await supabase.auth.updateUser({ data: { interest_sectors: sectors } });
  // updateUser() changes auth.users but doesn't rotate this session's access
  // token, so a server component reading getClaims() right after would still
  // see the pre-update user_metadata (stale JWT). Force a fresh token now so
  // the dashboard's Highlights reflects the new sectors on the very next load.
  await supabase.auth.refreshSession();
  revalidatePath("/", "layout");
}
