"use client";

import { useEffect, useState } from "react";
import {
  formatCompactNumber,
  formatRatio,
  formatSignedPercent,
  type Locale,
  type Messages,
} from "@trendus/shared";
import { HistoricalPerformanceChart } from "./historical-performance-chart";

type FundamentalsSnapshot = {
  symbol: string;
  exchange: string;
  pe_ratio: number | null;
  pb_ratio: number | null;
  roe: number | null;
  roa: number | null;
  eps: number | null;
  eps_growth: number | null;
  dividend_yield: number | null;
  debt_to_equity: number | null;
  gross_margin: number | null;
  net_margin: number | null;
  ebitda_margin: number | null;
  free_cash_flow: number | null;
  market_cap: number | null;
};

type MetricKey = Exclude<keyof FundamentalsSnapshot, "symbol" | "exchange">;

type MetricComparison = {
  value: number | null;
  sector_average: number | null;
  diff_pct: number | null;
};

type SectorComparison = { peer_count: number } & Record<MetricKey, MetricComparison | null>;

type FundamentalsResponse = {
  fundamentals: FundamentalsSnapshot | null;
  sector_comparison: SectorComparison | null;
  warnings: string[];
};

export function FundamentalsPanel({
  exchange,
  symbol,
  locale,
  messages,
}: {
  exchange: string;
  symbol: string;
  locale: Locale;
  messages: Messages;
}) {
  const [data, setData] = useState<FundamentalsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchFailed, setFetchFailed] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setFetchFailed(false);
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL;
        const response = await fetch(
          `${apiUrl}/fundamentals?symbol=${encodeURIComponent(symbol)}&exchange=${encodeURIComponent(exchange)}`,
          { signal: controller.signal, cache: "no-store" }
        );
        if (!response.ok) {
          throw new Error("Fundamentals request failed");
        }
        setData(await response.json());
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setFetchFailed(true);
      } finally {
        setLoading(false);
      }
    }

    load();
    return () => controller.abort();
  }, [exchange, symbol]);

  const t = messages;
  const snapshot = data?.fundamentals ?? null;
  const sectorComparison = data?.sector_comparison ?? null;
  const warnings = data?.warnings ?? [];

  const rows: { key: MetricKey; label: string; format: (v: number) => string }[] = [
    { key: "pe_ratio", label: t.fundamentals.peRatio, format: (v) => formatRatio(v, locale) },
    { key: "pb_ratio", label: t.fundamentals.pbRatio, format: (v) => formatRatio(v, locale) },
    { key: "roe", label: t.fundamentals.roe, format: (v) => formatRatio(v, locale) },
    { key: "roa", label: t.fundamentals.roa, format: (v) => formatRatio(v, locale) },
    { key: "eps", label: t.fundamentals.eps, format: (v) => formatRatio(v, locale) },
    { key: "eps_growth", label: t.fundamentals.epsGrowth, format: (v) => formatRatio(v, locale) },
    { key: "dividend_yield", label: t.fundamentals.dividendYield, format: (v) => formatRatio(v, locale) },
    { key: "debt_to_equity", label: t.fundamentals.debtToEquity, format: (v) => formatRatio(v, locale) },
    { key: "gross_margin", label: t.fundamentals.grossMargin, format: (v) => formatRatio(v, locale) },
    { key: "net_margin", label: t.fundamentals.netMargin, format: (v) => formatRatio(v, locale) },
    { key: "ebitda_margin", label: t.fundamentals.ebitdaMargin, format: (v) => formatRatio(v, locale) },
    { key: "free_cash_flow", label: t.fundamentals.freeCashFlow, format: (v) => formatCompactNumber(v, locale) },
    { key: "market_cap", label: t.fundamentals.marketCap, format: (v) => formatCompactNumber(v, locale) },
  ];

  if (loading) {
    return <p>{t.common.loading}</p>;
  }

  return (
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
          {rows.map((row) => {
            const value = snapshot?.[row.key] ?? null;
            const comparison = sectorComparison?.[row.key] ?? null;
            return (
              <div key={row.key}>
                <dt>{row.label}</dt>
                <dd>{value != null ? row.format(value) : t.common.noData}</dd>
                <dd>
                  {comparison?.sector_average != null ? (
                    <>
                      {t.fundamentals.sectorAverage}: {row.format(comparison.sector_average)}
                      {comparison.diff_pct != null && (
                        <> ({formatSignedPercent(comparison.diff_pct, locale)})</>
                      )}
                    </>
                  ) : (
                    t.fundamentals.noSectorData
                  )}
                </dd>
              </div>
            );
          })}
        </dl>
      )}

      <HistoricalPerformanceChart exchange={exchange} symbol={symbol} locale={locale} messages={t} />
    </div>
  );
}
