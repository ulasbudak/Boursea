import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { formatCompactNumber, formatRatio, formatSignedPercent, signColor } from "@trendus/shared";
import { useLocale } from "../lib/locale-context";
import { useTheme, radius, spacing, type ThemeColors } from "../lib/theme";
import { HistoricalPerformanceChart } from "./HistoricalPerformanceChart";

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
  const { mode, colors } = useTheme();
  const styles = makeStyles(colors);
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
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    load();
    return () => controller.abort();
  }, [symbol, exchange]);

  if (loading) {
    return <ActivityIndicator color={colors.accent} />;
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
      <View style={styles.card}>
        {rows.map((row, i) => {
          const value = snapshot?.[row.key] ?? null;
          const comparison = sectorComparison?.[row.key] ?? null;
          return (
            <View key={row.key} style={[styles.row, i === rows.length - 1 && styles.rowLast]}>
              <View style={styles.rowHeader}>
                <Text style={styles.label}>{row.label}</Text>
                <Text style={styles.value}>
                  {value != null ? row.format(value) : messages.common.noData}
                </Text>
              </View>
              {comparison?.sector_average != null ? (
                <Text style={styles.comparison}>
                  {messages.fundamentals.sectorAverage}: {row.format(comparison.sector_average)}
                  {comparison.diff_pct != null && (
                    <Text style={{ color: signColor(comparison.diff_pct, mode) }}>
                      {" "}
                      ({formatSignedPercent(comparison.diff_pct, locale)})
                    </Text>
                  )}
                </Text>
              ) : (
                <Text style={styles.comparison}>{messages.fundamentals.noSectorData}</Text>
              )}
            </View>
          );
        })}
      </View>
      <HistoricalPerformanceChart symbol={symbol} exchange={exchange} />
    </View>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    metrics: {
      gap: spacing[3],
    },
    card: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      borderRadius: radius.lg,
      paddingHorizontal: spacing[4],
    },
    row: {
      paddingVertical: spacing[3],
      borderBottomWidth: 1,
      borderBottomColor: colors.borderSubtle,
      gap: 2,
    },
    rowLast: {
      borderBottomWidth: 0,
    },
    rowHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
    },
    label: {
      color: colors.textSecondary,
    },
    value: {
      fontWeight: "600",
      color: colors.textPrimary,
    },
    comparison: {
      fontSize: 12,
      color: colors.textTertiary,
    },
    warning: {
      color: colors.warning,
      marginBottom: spacing[2],
    },
  });
}
