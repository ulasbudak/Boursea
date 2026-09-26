import { redirect } from "next/navigation";
import { messages } from "@borocean/shared";
import { createClient } from "@/lib/supabase/server";
import { getLocale } from "@/lib/i18n/locale";
import { PageHeader } from "@/components/ui/page-header";
import { PortfolioView } from "./portfolio-view";

export default async function PortfolioPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  if (!data?.claims) {
    redirect("/login");
  }

  const locale = await getLocale();
  const t = messages[locale];

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <PageHeader
        backHref="/dashboard"
        backLabel={t.portfolio.backToDashboard}
        title={t.portfolio.title}
      />
      <PortfolioView messages={t.portfolio} locale={locale} />
    </div>
  );
}
