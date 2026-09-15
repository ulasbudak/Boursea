import Link from "next/link";
import { redirect } from "next/navigation";
import { formatChange, formatMarketCap, formatPrice, messages } from "@trendus/shared";
import { createClient } from "@/lib/supabase/server";
import { getLocale } from "@/lib/i18n/locale";
import { StockTabs } from "./stock-tabs";

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

  const overviewContent = (
    <div>
      {fetchFailed && <p role="alert">{t.common.dataUnavailable}</p>}
      {!fetchFailed &&
        warnings.map((warning) => (
          <p key={warning} role="status">
            {warning}
          </p>
        ))}

      {!fetchFailed && (
        <dl>
          <div>
            <dt>{t.stock.price}</dt>
            <dd>
              {overview?.price != null
                ? formatPrice(overview.price, overview.currency, locale)
                : t.common.noData}
            </dd>
          </div>
          <div>
            <dt>{t.stock.change}</dt>
            <dd>
              {overview?.change_abs != null && overview?.change_pct != null
                ? formatChange(overview.change_abs, overview.change_pct, overview.currency, locale)
                : t.common.noData}
            </dd>
          </div>
          <div>
            <dt>{t.stock.marketCap}</dt>
            <dd>
              {overview?.market_cap != null
                ? formatMarketCap(overview.market_cap, overview.currency, locale)
                : t.common.noData}
            </dd>
          </div>
          <div>
            <dt>{t.stock.sector}</dt>
            <dd>{overview?.sector ?? t.common.noData}</dd>
          </div>
          <div>
            <dt>{t.stock.industry}</dt>
            <dd>{overview?.industry ?? t.common.noData}</dd>
          </div>
        </dl>
      )}
    </div>
  );

  return (
    <div>
      <p>
        <Link href="/dashboard">{t.stock.backToDashboard}</Link>
      </p>
      <h1>
        {overview?.name ?? symbol} <span>({exchange.toUpperCase()})</span>
      </h1>

      <StockTabs exchange={exchange} symbol={symbol} locale={locale} messages={t} overviewContent={overviewContent} />

      <p>{t.common.disclaimer}</p>
    </div>
  );
}
