"use client";

import { useEffect, useState } from "react";
import { formatRatio, type Locale, type Messages } from "@trendus/shared";

type HistoricalDataPoint = {
  period: string;
  revenue_per_share: number | null;
  net_income_per_share: number | null;
  eps: number | null;
};

type HistoricalPerformance = {
  symbol: string;
  exchange: string;
  annual: HistoricalDataPoint[];
  quarterly: HistoricalDataPoint[];
};

type HistoryResponse = {
  history: HistoricalPerformance | null;
  warnings: string[];
};

type MetricKey = "revenue_per_share" | "net_income_per_share" | "eps";

function MiniBarChart({
  label,
  points,
  metricKey,
  locale,
  noData,
}: {
  label: string;
  points: HistoricalDataPoint[];
  metricKey: MetricKey;
  locale: Locale;
  noData: string;
}) {
  const values = points.map((p) => p[metricKey]).filter((v): v is number => v != null);
  const maxValue = values.length ? Math.max(...values, 0) : 0;
  const minValue = values.length ? Math.min(...values, 0) : 0;
  const range = maxValue - minValue || 1;

  return (
    <div>
      <p>{label}</p>
      {values.length === 0 ? (
        <p>{noData}</p>
      ) : (
        <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 120 }}>
          {points.map((point) => {
            const value = point[metricKey];
            const heightPct = value != null ? ((value - minValue) / range) * 100 : 0;
            return (
              <div
                key={point.period}
                title={value != null ? `${point.period}: ${formatRatio(value, locale)}` : point.period}
                style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}
              >
                <div
                  style={{
                    width: "100%",
                    height: `${Math.max(heightPct, value != null ? 2 : 0)}%`,
                    backgroundColor: value != null ? "#111" : "transparent",
                  }}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function HistoricalPerformanceChart({
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
  const [data, setData] = useState<HistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchFailed, setFetchFailed] = useState(false);
  const [period, setPeriod] = useState<"annual" | "quarterly">("annual");

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setFetchFailed(false);
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL;
        const response = await fetch(
          `${apiUrl}/fundamentals/history?symbol=${encodeURIComponent(symbol)}&exchange=${encodeURIComponent(exchange)}`,
          { signal: controller.signal, cache: "no-store" }
        );
        if (!response.ok) {
          throw new Error("History request failed");
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

  if (loading) {
    return <p>{t.common.loading}</p>;
  }

  if (fetchFailed) {
    return <p role="alert">{t.common.dataUnavailable}</p>;
  }

  const history = data?.history ?? null;
  const warnings = data?.warnings ?? [];
  const points = period === "annual" ? (history?.annual ?? []) : (history?.quarterly ?? []);
  const hasAnyData = points.length > 0;

  return (
    <div>
      <h2>{t.history.title}</h2>
      {warnings.map((warning) => (
        <p key={warning} role="status">
          {warning}
        </p>
      ))}

      <div role="tablist" aria-label={t.history.title}>
        <button
          type="button"
          role="tab"
          aria-selected={period === "annual"}
          onClick={() => setPeriod("annual")}
        >
          {t.history.annual}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={period === "quarterly"}
          onClick={() => setPeriod("quarterly")}
        >
          {t.history.quarterly}
        </button>
      </div>

      {!hasAnyData ? (
        <p>{t.common.dataUnavailable}</p>
      ) : (
        <>
          <MiniBarChart
            label={t.history.revenuePerShare}
            points={points}
            metricKey="revenue_per_share"
            locale={locale}
            noData={t.common.noData}
          />
          <MiniBarChart
            label={t.history.netIncomePerShare}
            points={points}
            metricKey="net_income_per_share"
            locale={locale}
            noData={t.common.noData}
          />
          <MiniBarChart
            label={t.history.eps}
            points={points}
            metricKey="eps"
            locale={locale}
            noData={t.common.noData}
          />
        </>
      )}
    </div>
  );
}
