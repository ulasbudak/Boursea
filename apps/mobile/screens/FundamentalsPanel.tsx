import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { formatCompactNumber, formatRatio } from "@trendus/shared";
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

type FundamentalsResponse = {
  fundamentals: FundamentalsSnapshot | null;
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
  const warnings = data?.warnings ?? [];

  const rows: { label: string; value: number | null; format: (v: number) => string }[] = [
    { label: messages.fundamentals.peRatio, value: snapshot?.pe_ratio ?? null, format: (v) => formatRatio(v, locale) },
    { label: messages.fundamentals.pbRatio, value: snapshot?.pb_ratio ?? null, format: (v) => formatRatio(v, locale) },
    { label: messages.fundamentals.roe, value: snapshot?.roe ?? null, format: (v) => formatRatio(v, locale) },
    { label: messages.fundamentals.roa, value: snapshot?.roa ?? null, format: (v) => formatRatio(v, locale) },
    { label: messages.fundamentals.eps, value: snapshot?.eps ?? null, format: (v) => formatRatio(v, locale) },
    {
      label: messages.fundamentals.epsGrowth,
      value: snapshot?.eps_growth ?? null,
      format: (v) => formatRatio(v, locale),
    },
    {
      label: messages.fundamentals.dividendYield,
      value: snapshot?.dividend_yield ?? null,
      format: (v) => formatRatio(v, locale),
    },
    {
      label: messages.fundamentals.debtToEquity,
      value: snapshot?.debt_to_equity ?? null,
      format: (v) => formatRatio(v, locale),
    },
    {
      label: messages.fundamentals.grossMargin,
      value: snapshot?.gross_margin ?? null,
      format: (v) => formatRatio(v, locale),
    },
    {
      label: messages.fundamentals.netMargin,
      value: snapshot?.net_margin ?? null,
      format: (v) => formatRatio(v, locale),
    },
    {
      label: messages.fundamentals.ebitdaMargin,
      value: snapshot?.ebitda_margin ?? null,
      format: (v) => formatRatio(v, locale),
    },
    {
      label: messages.fundamentals.freeCashFlow,
      value: snapshot?.free_cash_flow ?? null,
      format: (v) => formatCompactNumber(v, locale),
    },
    {
      label: messages.fundamentals.marketCap,
      value: snapshot?.market_cap ?? null,
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
      {rows.map((row) => (
        <View key={row.label} style={styles.row}>
          <Text style={styles.label}>{row.label}</Text>
          <Text style={styles.value}>
            {row.value != null ? row.format(row.value) : messages.common.noData}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  metrics: {
    gap: 8,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  label: {
    color: "#555",
  },
  value: {
    fontWeight: "600",
  },
  warning: {
    color: "#8a6d3b",
    marginBottom: 8,
  },
});
