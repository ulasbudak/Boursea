import Link from "next/link";
import { redirect } from "next/navigation";
import { messages } from "@trendus/shared";
import { createClient } from "@/lib/supabase/server";
import { getLocale } from "@/lib/i18n/locale";
import { ScreenerForm } from "./screener-form";

export default async function ScreenerPage() {
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
        <Link href="/dashboard">{t.screener.backToDashboard}</Link>
      </p>
      <h1>{t.screener.title}</h1>
      <ScreenerForm messages={t.screener} locale={locale} />
    </div>
  );
}
