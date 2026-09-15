import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { formatCompactNumber, formatRatio, formatSignedPercent } from "@trendus/shared";
import { useLocale } from "../lib/locale-context";

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

export function FundamentalsPanel({ symbol, exchange }: { symbol: string; exchange: string }) {
  const { locale, messages } = useLocale();
  const [data, setData] = useState<FundamentalsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchFailed, setFetchFailed] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setFetchFailed(false);
      try {
        const apiUrl = process.env.EXPO_PUBLIC_API_URL;
        const response = await fetch(
          `${apiUrl}/fundamentals?symbol=${encodeURIComponent(symbol)}&exchange=${encodeURIComponent(exchange)}`,
          { signal: controller.signal }
        );
        if (!response.ok) {
          throw new Error("Fundamentals request failed");
        }
        setData(await response.json());
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
        setFetchFailed(true);
      } finally {
        setLoading(false);
      }
    }

    load();
    return () => controller.abort();
  }, [symbol, exchange]);

  if (loading) {
    return <ActivityIndicator />;
  }

  if (fetchFailed) {
    return <Text style={styles.warning}>{messages.common.dataUnavailable}</Text>;
  }

  const snapshot = data?.fundamentals ?? null;
  const sectorComparison = data?.sector_comparison ?? null;
  const warnings = data?.warnings ?? [];

  const rows: { key: MetricKey; label: string; format: (v: number) => string }[] = [
    { key: "pe_ratio", label: messages.fundamentals.peRatio, format: (v) => formatRatio(v, locale) },
    { key: "pb_ratio", label: messages.fundamentals.pbRatio, format: (v) => formatRatio(v, locale) },
    { key: "roe", label: messages.fundamentals.roe, format: (v) => formatRatio(v, locale) },
    { key: "roa", label: messages.fundamentals.roa, format: (v) => formatRatio(v, locale) },
    { key: "eps", label: messages.fundamentals.eps, format: (v) => formatRatio(v, locale) },
    { key: "eps_growth", label: messages.fundamentals.epsGrowth, format: (v) => formatRatio(v, locale) },
    {
      key: "dividend_yield",
      label: messages.fundamentals.dividendYield,
      format: (v) => formatRatio(v, locale),
    },
    {
      key: "debt_to_equity",
      label: messages.fundamentals.debtToEquity,
      format: (v) => formatRatio(v, locale),
    },
    {
      key: "gross_margin",
      label: messages.fundamentals.grossMargin,
      format: (v) => formatRatio(v, locale),
    },
    { key: "net_margin", label: messages.fundamentals.netMargin, format: (v) => formatRatio(v, locale) },
    {
      key: "ebitda_margin",
      label: messages.fundamentals.ebitdaMargin,
      format: (v) => formatRatio(v, locale),
    },
    {
      key: "free_cash_flow",
      label: messages.fundamentals.freeCashFlow,
      format: (v) => formatCompactNumber(v, locale),
    },
    {
      key: "market_cap",
      label: messages.fundamentals.marketCap,
      format: (v) => formatCompactNumber(v, locale),
    },
  ];

  return (
    <View style={styles.metrics}>
      {warnings.map((warning) => (
        <Text key={warning} style={styles.warning}>
          {warning}
        </Text>
      ))}
      {rows.map((row) => {
        const value = snapshot?.[row.key] ?? null;
        const comparison = sectorComparison?.[row.key] ?? null;
        return (
          <View key={row.key} style={styles.row}>
            <View style={styles.rowHeader}>
              <Text style={styles.label}>{row.label}</Text>
              <Text style={styles.value}>
                {value != null ? row.format(value) : messages.common.noData}
              </Text>
            </View>
            <Text style={styles.comparison}>
              {comparison?.sector_average != null
                ? `${messages.fundamentals.sectorAverage}: ${row.format(comparison.sector_average)}${
                    comparison.diff_pct != null ? ` (${formatSignedPercent(comparison.diff_pct, locale)})` : ""
                  }`
                : messages.fundamentals.noSectorData}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  metrics: {
    gap: 8,
  },
  row: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    gap: 2,
  },
  rowHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  label: {
    color: "#555",
  },
  value: {
    fontWeight: "600",
  },
  comparison: {
    fontSize: 12,
    color: "#888",
  },
  warning: {
    color: "#8a6d3b",
    marginBottom: 8,
  },
});
