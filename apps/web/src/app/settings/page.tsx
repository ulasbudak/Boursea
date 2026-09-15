import Link from "next/link";
import { redirect } from "next/navigation";
import { messages } from "@trendus/shared";
import { createClient } from "@/lib/supabase/server";
import { getLocale } from "@/lib/i18n/locale";
import { LanguageSwitcher } from "./language-switcher";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  if (!data?.claims) {
    redirect("/login");
  }

  const locale = await getLocale();
  const t = messages[locale];

  return (
    <div>
      <p>
        <Link href="/dashboard">{t.settings.backToDashboard}</Link>
      </p>
      <h1>{t.settings.title}</h1>
      <p>{t.settings.language}</p>
      <LanguageSwitcher currentLocale={locale} messages={t.settings} />
    </div>
  );
}
