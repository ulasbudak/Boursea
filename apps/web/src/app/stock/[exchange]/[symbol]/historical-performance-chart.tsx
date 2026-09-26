"use client";

import { useEffect, useState } from "react";
import { formatRatio, type Locale, type Messages } from "@borocean/shared";
import { Card } from "@/components/ui/card";
import { ToggleChip } from "@/components/ui/toggle-chip";
import { Skeleton } from "@/components/ui/skeleton";

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
      <p className="mb-2 text-xs font-medium text-text-secondary">{label}</p>
      {values.length === 0 ? (
        <p className="text-xs text-text-tertiary">{noData}</p>
      ) : (
        <div className="flex h-28 items-end gap-1">
          {points.map((point) => {
            const value = point[metricKey];
            const heightPct = value != null ? ((value - minValue) / range) * 100 : 0;
            return (
              <div
                key={point.period}
                title={value != null ? `${point.period}: ${formatRatio(value, locale)}` : point.period}
                className="flex flex-1 flex-col items-center justify-end"
              >
                <div
                  className={`w-full rounded-sm transition-all ${value != null ? "bg-accent" : "bg-transparent"}`}
                  style={{ height: `${Math.max(heightPct, value != null ? 3 : 0)}%` }}
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
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    load();
    return () => controller.abort();
  }, [exchange, symbol]);

  const t = messages;

  if (loading) {
    return (
      <Card>
        <Skeleton className="mb-3 h-4 w-40" />
        <Skeleton className="h-40 w-full" />
      </Card>
    );
  }

  if (fetchFailed) {
    return (
      <Card>
        <p role="alert" className="rounded-md border border-negative/30 bg-negative/10 px-3 py-2 text-sm text-negative">
          {t.common.dataUnavailable}
        </p>
      </Card>
    );
  }

  const history = data?.history ?? null;
  const warnings = data?.warnings ?? [];
  const points = period === "annual" ? (history?.annual ?? []) : (history?.quarterly ?? []);
  const hasAnyData = points.length > 0;

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-text-tertiary">{t.history.title}</p>
        <div role="tablist" aria-label={t.history.title} className="flex gap-1.5">
          <ToggleChip active={period === "annual"} onClick={() => setPeriod("annual")}>
            {t.history.annual}
          </ToggleChip>
          <ToggleChip active={period === "quarterly"} onClick={() => setPeriod("quarterly")}>
            {t.history.quarterly}
          </ToggleChip>
        </div>
      </div>

      {warnings.map((warning) => (
        <p key={warning} className="mb-2 text-xs text-warning">
          {warning}
        </p>
      ))}

      {!hasAnyData ? (
        <p className="text-sm text-text-tertiary">{t.common.dataUnavailable}</p>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
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
        </div>
      )}
    </Card>
  );
}
