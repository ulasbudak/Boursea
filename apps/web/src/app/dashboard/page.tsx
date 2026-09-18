import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Bell,
  Bookmark,
  Columns3,
  LogOut,
  Radio,
  Settings as SettingsIcon,
  SlidersHorizontal,
  Wallet,
} from "lucide-react";
import { messages } from "@trendus/shared";
import { createClient } from "@/lib/supabase/server";
import { getLocale } from "@/lib/i18n/locale";
import { Card } from "@/components/ui/card";
import { Logo } from "@/components/ui/logo";
import { signOut } from "./actions";
import { SearchBox } from "./search-box";
import { Highlights } from "./highlights";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;

  if (!claims) {
    redirect("/login");
  }

  const locale = await getLocale();
  const t = messages[locale];
  const email = claims.email ?? "";
  const initial = email.charAt(0).toUpperCase() || "?";

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-8">
      <header className="flex items-center justify-between">
        <Logo size="sm" />
        <div className="flex items-center gap-3">
          <div
            title={email}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-elevated text-xs font-semibold text-text-secondary ring-1 ring-border-default"
          >
            {initial}
          </div>
          <form action={signOut}>
            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-md border border-border-default px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:border-negative/40 hover:bg-negative/10 hover:text-negative"
            >
              <LogOut size={14} />
              {t.dashboard.signOut}
            </button>
          </form>
        </div>
      </header>

      <div>
        <p className="mb-2 text-sm text-text-secondary">
          {t.dashboard.loggedInAs}: <span className="text-text-primary">{email}</span>
        </p>
      </div>

      <section>
        <p className="mb-3 text-xs font-medium uppercase tracking-wide text-text-tertiary">
          {t.search.label}
        </p>
        <Card className="shadow-lg shadow-black/20">
          <SearchBox messages={t.search} />
        </Card>
      </section>

      <section>
        <p className="mb-3 text-xs font-medium uppercase tracking-wide text-text-tertiary">
          {t.highlights.title}
        </p>
        <Highlights messages={t.highlights} locale={locale} />
      </section>

      <section>
        <p className="mb-3 text-xs font-medium uppercase tracking-wide text-text-tertiary">
          {t.dashboard.quickAccess}
        </p>
        <nav className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Link
            href="/watchlist"
            className="group flex flex-col gap-3 rounded-lg border border-border-subtle bg-surface p-4 transition-all hover:-translate-y-0.5 hover:border-accent/50 hover:shadow-lg hover:shadow-black/20"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-accent/15 text-accent">
              <Bookmark size={18} />
            </div>
            <span className="text-sm font-medium text-text-primary">{t.watchlist.title}</span>
          </Link>
          <Link
            href="/portfolio"
            className="group flex flex-col gap-3 rounded-lg border border-border-subtle bg-surface p-4 transition-all hover:-translate-y-0.5 hover:border-accent/50 hover:shadow-lg hover:shadow-black/20"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-surface-hover text-text-secondary">
              <Wallet size={18} />
            </div>
            <span className="text-sm font-medium text-text-primary">{t.portfolio.title}</span>
          </Link>
          <Link
            href="/alerts"
            className="group flex flex-col gap-3 rounded-lg border border-border-subtle bg-surface p-4 transition-all hover:-translate-y-0.5 hover:border-accent/50 hover:shadow-lg hover:shadow-black/20"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-surface-hover text-text-secondary">
              <Bell size={18} />
            </div>
            <span className="text-sm font-medium text-text-primary">{t.alerts.title}</span>
          </Link>
          <Link
            href="/signal-alerts"
            className="group flex flex-col gap-3 rounded-lg border border-border-subtle bg-surface p-4 transition-all hover:-translate-y-0.5 hover:border-accent/50 hover:shadow-lg hover:shadow-black/20"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-surface-hover text-text-secondary">
              <Radio size={18} />
            </div>
            <span className="text-sm font-medium text-text-primary">{t.signalAlerts.title}</span>
          </Link>
          <Link
            href="/screener"
            className="group flex flex-col gap-3 rounded-lg border border-border-subtle bg-surface p-4 transition-all hover:-translate-y-0.5 hover:border-accent/50 hover:shadow-lg hover:shadow-black/20"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-surface-hover text-text-secondary">
              <SlidersHorizontal size={18} />
            </div>
            <span className="text-sm font-medium text-text-primary">{t.screener.title}</span>
          </Link>
          <Link
            href="/compare"
            className="group flex flex-col gap-3 rounded-lg border border-border-subtle bg-surface p-4 transition-all hover:-translate-y-0.5 hover:border-accent/50 hover:shadow-lg hover:shadow-black/20"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-surface-hover text-text-secondary">
              <Columns3 size={18} />
            </div>
            <span className="text-sm font-medium text-text-primary">{t.comparison.title}</span>
          </Link>
          <Link
            href="/settings"
            className="group flex flex-col gap-3 rounded-lg border border-border-subtle bg-surface p-4 transition-all hover:-translate-y-0.5 hover:border-accent/50 hover:shadow-lg hover:shadow-black/20"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-surface-hover text-text-secondary">
              <SettingsIcon size={18} />
            </div>
            <span className="text-sm font-medium text-text-primary">{t.dashboard.settingsLink}</span>
          </Link>
        </nav>
      </section>
    </div>
  );
}
