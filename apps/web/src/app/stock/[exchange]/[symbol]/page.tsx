import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { formatChange, formatMarketCap, formatPrice, messages } from "@trendus/shared";
import { createClient } from "@/lib/supabase/server";
import { getLocale } from "@/lib/i18n/locale";
import { PageHeader } from "@/components/ui/page-header";
import { Badge, ChangeValue } from "@/components/ui/change-value";
import { StockTabs } from "./stock-tabs";
import { ScoreBadge } from "./score-badge";
import { AddToWatchlistButton } from "./add-to-watchlist-button";
import { CreatePriceAlertButton } from "./create-price-alert-button";
import { CreateSignalAlertButton } from "./create-signal-alert-button";
import { StockNoteCard } from "./stock-note-card";
import { DataDelayDisclosure } from "./data-delay-disclosure";

type StockOverview = {
  symbol: string;
  exchange: string;
  name: string;
  price: number | null;
  change_abs: number | null;
  change_pct: number | null;
  market_cap: number | null;
  currency: string | null;
  sector: string | null;
  industry: string | null;
};

type OverviewResponse = {
  overview: StockOverview | null;
  warnings: string[];
};

export default async function StockDetailPage({
  params,
}: {
  params: Promise<{ exchange: string; symbol: string }>;
}) {
  const { exchange, symbol } = await params;
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  if (!data?.claims) {
    redirect("/login");
  }

  const locale = await getLocale();
  const t = messages[locale];

  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  let overviewData: OverviewResponse | null = null;
  let fetchFailed = false;

  try {
    const response = await fetch(
      `${apiUrl}/symbols/overview?symbol=${encodeURIComponent(symbol)}&exchange=${encodeURIComponent(exchange)}`,
      { cache: "no-store" }
    );
    if (!response.ok) {
      throw new Error("Overview request failed");
    }
    overviewData = await response.json();
  } catch {
    fetchFailed = true;
  }

  const overview = overviewData?.overview ?? null;
  const warnings = overviewData?.warnings ?? [];

  const statRows: { label: string; value: ReactNode }[] = [
    {
      label: t.stock.price,
      value:
        overview?.price != null ? formatPrice(overview.price, overview.currency, locale) : t.common.noData,
    },
    {
      label: t.stock.change,
      value:
        overview?.change_abs != null && overview?.change_pct != null ? (
          <ChangeValue value={overview.change_abs}>
            {formatChange(overview.change_abs, overview.change_pct, overview.currency, locale)}
          </ChangeValue>
        ) : (
          t.common.noData
        ),
    },
    {
      label: t.stock.marketCap,
      value:
        overview?.market_cap != null
          ? formatMarketCap(overview.market_cap, overview.currency, locale)
          : t.common.noData,
    },
    { label: t.stock.sector, value: overview?.sector ?? t.common.noData },
    { label: t.stock.industry, value: overview?.industry ?? t.common.noData },
  ];

  const overviewContent = (
    <div className="flex flex-col gap-4">
      <ScoreBadge exchange={exchange} symbol={symbol} messages={t} />

      <DataDelayDisclosure messages={t.billing} />

      {fetchFailed && <p className="text-sm text-negative">{t.common.dataUnavailable}</p>}
      {!fetchFailed &&
        warnings.map((warning) => (
          <p key={warning} className="text-xs text-warning">
            {warning}
          </p>
        ))}

      {!fetchFailed && (
        <div className="overflow-hidden rounded-lg border border-border-subtle bg-surface">
          <dl className="grid grid-cols-1 divide-y divide-border-subtle sm:grid-cols-2 sm:divide-x sm:divide-y-0">
            {statRows.map((row) => (
              <div key={row.label} className="flex items-center justify-between px-4 py-3">
                <dt className="text-sm text-text-secondary">{row.label}</dt>
                <dd className="tabular-nums font-medium text-text-primary">{row.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      <StockNoteCard symbol={symbol.toUpperCase()} exchange={exchange.toUpperCase()} messages={t.notes} />
    </div>
  );

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <PageHeader
        backHref="/dashboard"
        backLabel={t.stock.backToDashboard}
        title={
          <span className="flex items-center gap-2">
            {overview?.name ?? symbol}
            <Badge>{exchange.toUpperCase()}</Badge>
          </span>
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <AddToWatchlistButton
              symbol={symbol.toUpperCase()}
              exchange={exchange.toUpperCase()}
              name={overview?.name ?? null}
              messages={t.watchlist}
            />
            <CreatePriceAlertButton
              symbol={symbol.toUpperCase()}
              exchange={exchange.toUpperCase()}
              name={overview?.name ?? null}
              messages={t.alerts}
            />
            <CreateSignalAlertButton
              symbol={symbol.toUpperCase()}
              exchange={exchange.toUpperCase()}
              name={overview?.name ?? null}
              messages={t.signalAlerts}
            />
          </div>
        }
      />

      <StockTabs exchange={exchange} symbol={symbol} locale={locale} messages={t} overviewContent={overviewContent} />

      <p className="mt-8 text-center text-xs text-text-tertiary">{t.common.disclaimer}</p>
    </div>
  );
}
