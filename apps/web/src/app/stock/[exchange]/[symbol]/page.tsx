import { redirect } from "next/navigation";
import { formatChange, formatMarketCap, formatPrice, messages } from "@boursea/shared";
import { createClient } from "@/lib/supabase/server";
import { getLocale } from "@/lib/i18n/locale";
import { PageHeader } from "@/components/ui/page-header";
import { Badge, ChangeValue } from "@/components/ui/change-value";
import { StatTable, type StatRow } from "@/components/ui/stat-table";
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

  const statRows: StatRow[] = [
    {
      key: "price",
      label: t.stock.price,
      value:
        overview?.price != null ? formatPrice(overview.price, overview.currency, locale) : t.common.noData,
    },
    {
      key: "change",
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
      key: "market_cap",
      label: t.stock.marketCap,
      value:
        overview?.market_cap != null
          ? formatMarketCap(overview.market_cap, overview.currency, locale)
          : t.common.noData,
    },
    { key: "sector", label: t.stock.sector, value: overview?.sector ?? t.common.noData },
    { key: "industry", label: t.stock.industry, value: overview?.industry ?? t.common.noData },
  ];

  const overviewContent = (
    <div className="flex flex-col gap-4">
      <ScoreBadge exchange={exchange} symbol={symbol} messages={t} />

      <DataDelayDisclosure messages={t.billing} />

      {fetchFailed && (
        <p role="alert" className="rounded-md border border-negative/30 bg-negative/10 px-3 py-2 text-sm text-negative">
          {t.common.dataUnavailable}
        </p>
      )}
      {!fetchFailed &&
        warnings.map((warning) => (
          <p key={warning} className="text-xs text-warning">
            {warning}
          </p>
        ))}

      {!fetchFailed && <StatTable rows={statRows} />}

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
