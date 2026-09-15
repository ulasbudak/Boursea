import { redirect } from "next/navigation";
import { messages } from "@trendus/shared";
import { createClient } from "@/lib/supabase/server";
import { getLocale } from "@/lib/i18n/locale";
import { PageHeader } from "@/components/ui/page-header";
import { WatchlistView } from "./watchlist-view";

export default async function WatchlistPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  if (!data?.claims) {
    redirect("/login");
  }

  const locale = await getLocale();
  const t = messages[locale];

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <PageHeader backHref="/dashboard" backLabel={t.watchlist.backToDashboard} title={t.watchlist.title} />
      <WatchlistView messages={t.watchlist} />
    </div>
  );
}
