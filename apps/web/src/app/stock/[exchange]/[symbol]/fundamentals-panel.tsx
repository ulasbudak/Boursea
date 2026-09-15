"use client";

import { useEffect, useState } from "react";
import { formatCompactNumber, formatRatio, type Locale, type Messages } from "@trendus/shared";

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

type FundamentalsResponse = {
  fundamentals: FundamentalsSnapshot | null;
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
  const warnings = data?.warnings ?? [];

  const rows: { label: string; value: number | null; format: (v: number) => string }[] = [
    { label: t.fundamentals.peRatio, value: snapshot?.pe_ratio ?? null, format: (v) => formatRatio(v, locale) },
    { label: t.fundamentals.pbRatio, value: snapshot?.pb_ratio ?? null, format: (v) => formatRatio(v, locale) },
    { label: t.fundamentals.roe, value: snapshot?.roe ?? null, format: (v) => formatRatio(v, locale) },
    { label: t.fundamentals.roa, value: snapshot?.roa ?? null, format: (v) => formatRatio(v, locale) },
    { label: t.fundamentals.eps, value: snapshot?.eps ?? null, format: (v) => formatRatio(v, locale) },
    {
      label: t.fundamentals.epsGrowth,
      value: snapshot?.eps_growth ?? null,
      format: (v) => formatRatio(v, locale),
    },
    {
      label: t.fundamentals.dividendYield,
      value: snapshot?.dividend_yield ?? null,
      format: (v) => formatRatio(v, locale),
    },
    {
      label: t.fundamentals.debtToEquity,
      value: snapshot?.debt_to_equity ?? null,
      format: (v) => formatRatio(v, locale),
    },
    {
      label: t.fundamentals.grossMargin,
      value: snapshot?.gross_margin ?? null,
      format: (v) => formatRatio(v, locale),
    },
    {
      label: t.fundamentals.netMargin,
      value: snapshot?.net_margin ?? null,
      format: (v) => formatRatio(v, locale),
    },
    {
      label: t.fundamentals.ebitdaMargin,
      value: snapshot?.ebitda_margin ?? null,
      format: (v) => formatRatio(v, locale),
    },
    {
      label: t.fundamentals.freeCashFlow,
      value: snapshot?.free_cash_flow ?? null,
      format: (v) => formatCompactNumber(v, locale),
    },
    {
      label: t.fundamentals.marketCap,
      value: snapshot?.market_cap ?? null,
      format: (v) => formatCompactNumber(v, locale),
    },
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
          {rows.map((row) => (
            <div key={row.label}>
              <dt>{row.label}</dt>
              <dd>{row.value != null ? row.format(row.value) : t.common.noData}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
