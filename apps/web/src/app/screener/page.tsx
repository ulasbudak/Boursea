import { redirect } from "next/navigation";
import { messages } from "@boursea/shared";
import { createClient } from "@/lib/supabase/server";
import { getLocale } from "@/lib/i18n/locale";
import { PageHeader } from "@/components/ui/page-header";
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
    <div className="mx-auto max-w-4xl px-4 py-8">
      <PageHeader backHref="/dashboard" backLabel={t.screener.backToDashboard} title={t.screener.title} />
      <ScreenerForm messages={t.screener} locale={locale} />
    </div>
  );
}
