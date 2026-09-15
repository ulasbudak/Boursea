import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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

function formatPrice(price: number, currency: string | null) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: currency ?? "USD",
    maximumFractionDigits: 2,
  }).format(price);
}

function formatChange(changeAbs: number, changePct: number, currency: string | null) {
  const sign = changeAbs >= 0 ? "+" : "";
  return `${sign}${formatPrice(changeAbs, currency)} (${sign}${changePct.toFixed(2)}%)`;
}

function formatMarketCap(marketCap: number, currency: string | null) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: currency ?? "USD",
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(marketCap);
}

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

  return (
    <div>
      <p>
        <Link href="/dashboard">← Panele dön</Link>
      </p>
      <h1>
        {overview?.name ?? symbol} <span>({exchange.toUpperCase()})</span>
      </h1>

      {fetchFailed && <p role="alert">Veri şu an güncellenemiyor.</p>}
      {!fetchFailed &&
        warnings.map((warning) => (
          <p key={warning} role="status">
            {warning}
          </p>
        ))}

      {!fetchFailed && (
        <dl>
          <div>
            <dt>Güncel Fiyat</dt>
            <dd>
              {overview?.price != null
                ? formatPrice(overview.price, overview.currency)
                : "Veri yok"}
            </dd>
          </div>
          <div>
            <dt>Günlük Değişim</dt>
            <dd>
              {overview?.change_abs != null && overview?.change_pct != null
                ? formatChange(overview.change_abs, overview.change_pct, overview.currency)
                : "Veri yok"}
            </dd>
          </div>
          <div>
            <dt>Piyasa Değeri</dt>
            <dd>
              {overview?.market_cap != null
                ? formatMarketCap(overview.market_cap, overview.currency)
                : "Veri yok"}
            </dd>
          </div>
          <div>
            <dt>Sektör</dt>
            <dd>{overview?.sector ?? "Veri yok"}</dd>
          </div>
          <div>
            <dt>Endüstri</dt>
            <dd>{overview?.industry ?? "Veri yok"}</dd>
          </div>
        </dl>
      )}

      <p>Bu sayfadaki bilgiler yatırım tavsiyesi değildir.</p>
    </div>
  );
}
