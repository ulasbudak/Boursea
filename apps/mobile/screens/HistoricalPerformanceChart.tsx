import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useLocale } from "../lib/locale-context";
import { useTheme, radius, spacing, type ThemeColors } from "../lib/theme";

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

const CHART_HEIGHT = 100;

function MiniBarChart({
  label,
  points,
  metricKey,
  noData,
  colors,
}: {
  label: string;
  points: HistoricalDataPoint[];
  metricKey: MetricKey;
  noData: string;
  colors: ThemeColors;
}) {
  const styles = makeStyles(colors);
  const values = points.map((p) => p[metricKey]).filter((v): v is number => v != null);
  if (values.length === 0) {
    return (
      <View style={styles.chartBlock}>
        <Text style={styles.chartLabel}>{label}</Text>
        <Text style={styles.noData}>{noData}</Text>
      </View>
    );
  }

  const maxValue = Math.max(...values, 0);
  const minValue = Math.min(...values, 0);
  const range = maxValue - minValue || 1;

  return (
    <View style={styles.chartBlock}>
      <Text style={styles.chartLabel}>{label}</Text>
      <View style={styles.barRow}>
        {points.map((point) => {
          const value = point[metricKey];
          const heightPct = value != null ? ((value - minValue) / range) * 100 : 0;
          return (
            <View key={point.period} style={styles.barColumn}>
              <View
                style={[
                  styles.bar,
                  {
                    height: Math.max((heightPct / 100) * CHART_HEIGHT, value != null ? 2 : 0),
                    backgroundColor: value != null ? colors.accent : "transparent",
                  },
                ]}
              />
            </View>
          );
        })}
      </View>
    </View>
  );
}

export function HistoricalPerformanceChart({ symbol, exchange }: { symbol: string; exchange: string }) {
  const { messages } = useLocale();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
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
        const apiUrl = process.env.EXPO_PUBLIC_API_URL;
        const response = await fetch(
          `${apiUrl}/fundamentals/history?symbol=${encodeURIComponent(symbol)}&exchange=${encodeURIComponent(exchange)}`,
          { signal: controller.signal }
        );
        if (!response.ok) {
          throw new Error("History request failed");
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

  const history = data?.history ?? null;
  const warnings = data?.warnings ?? [];
  const points = period === "annual" ? (history?.annual ?? []) : (history?.quarterly ?? []);

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{messages.history.title}</Text>
      {warnings.map((warning) => (
        <Text key={warning} style={styles.warning}>
          {warning}
        </Text>
      ))}

      <View style={styles.periodRow}>
        <TouchableOpacity
          style={[styles.periodChip, period === "annual" && styles.periodChipActive]}
          onPress={() => setPeriod("annual")}
        >
          <Text style={[styles.periodLabel, period === "annual" && styles.periodLabelActive]}>
            {messages.history.annual}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.periodChip, period === "quarterly" && styles.periodChipActive]}
          onPress={() => setPeriod("quarterly")}
        >
          <Text style={[styles.periodLabel, period === "quarterly" && styles.periodLabelActive]}>
            {messages.history.quarterly}
          </Text>
        </TouchableOpacity>
      </View>

      {points.length === 0 ? (
        <Text style={styles.noData}>{messages.common.dataUnavailable}</Text>
      ) : (
        <View style={styles.charts}>
          <MiniBarChart
            label={messages.history.revenuePerShare}
            points={points}
            metricKey="revenue_per_share"
            noData={messages.common.noData}
            colors={colors}
          />
          <MiniBarChart
            label={messages.history.netIncomePerShare}
            points={points}
            metricKey="net_income_per_share"
            noData={messages.common.noData}
            colors={colors}
          />
          <MiniBarChart
            label={messages.history.eps}
            points={points}
            metricKey="eps"
            noData={messages.common.noData}
            colors={colors}
          />
        </View>
      )}
    </View>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      borderRadius: radius.lg,
      padding: spacing[4],
      marginTop: spacing[4],
      gap: spacing[3],
    },
    title: {
      fontSize: 11,
      fontWeight: "600",
      textTransform: "uppercase",
      letterSpacing: 0.4,
      color: colors.textTertiary,
    },
    periodRow: {
      flexDirection: "row",
      gap: spacing[2],
    },
    periodChip: {
      paddingHorizontal: spacing[3],
      paddingVertical: spacing[1],
      borderRadius: radius.full,
      borderWidth: 1,
      borderColor: colors.borderDefault,
      backgroundColor: colors.surfaceElevated,
    },
    periodChipActive: {
      borderColor: colors.accent,
      backgroundColor: colors.accent + "26",
    },
    periodLabel: {
      fontSize: 12,
      fontWeight: "500",
      color: colors.textSecondary,
    },
    periodLabelActive: {
      color: colors.accent,
      fontWeight: "600",
    },
    charts: {
      gap: spacing[3],
    },
    chartBlock: {
      gap: spacing[1],
    },
    chartLabel: {
      color: colors.textSecondary,
      fontSize: 12,
    },
    barRow: {
      flexDirection: "row",
      alignItems: "flex-end",
      gap: 2,
      height: CHART_HEIGHT,
    },
    barColumn: {
      flex: 1,
      alignItems: "center",
      justifyContent: "flex-end",
      height: CHART_HEIGHT,
    },
    bar: {
      width: "100%",
      borderRadius: 2,
    },
    noData: {
      color: colors.textTertiary,
      fontSize: 13,
    },
    warning: {
      color: colors.warning,
      fontSize: 13,
    },
  });
}
