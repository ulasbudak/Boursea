import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useLocale } from "../lib/locale-context";
import { useTheme, radius, spacing, type ThemeColors } from "../lib/theme";

type SignalRecord = {
  rule_id: string;
  rule_name: string;
  direction: string;
  triggered_at: number;
};

type SignalsResponse = {
  signals: SignalRecord[];
  warnings: string[];
};

export function SignalList({ symbol, exchange }: { symbol: string; exchange: string }) {
  const { messages } = useLocale();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [data, setData] = useState<SignalsResponse | null>(null);
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
          `${apiUrl}/symbols/signals?symbol=${encodeURIComponent(symbol)}&exchange=${encodeURIComponent(exchange)}`,
          { signal: controller.signal }
        );
        if (!response.ok) {
          throw new Error("Signals request failed");
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
    return <ActivityIndicator color={colors.accent} />;
  }

  const signals = data?.signals ?? [];
  const warnings = data?.warnings ?? [];

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{messages.signals.title}</Text>
      {fetchFailed && <Text style={styles.warning}>{messages.common.dataUnavailable}</Text>}
      {!fetchFailed &&
        warnings.map((warning) => (
          <Text key={warning} style={styles.warning}>
            {warning}
          </Text>
        ))}
      {!fetchFailed && signals.length === 0 && <Text style={styles.noData}>{messages.signals.noSignals}</Text>}
      {!fetchFailed &&
        signals.map((signal, index) => {
          const bullish = signal.direction === "bullish";
          const tone = bullish ? colors.positive : colors.negative;
          return (
            <View
              key={`${signal.rule_id}-${signal.triggered_at}-${index}`}
              style={[styles.row, index === signals.length - 1 && styles.rowLast]}
            >
              <View style={[styles.iconBadge, { backgroundColor: tone + "26" }]}>
                <Text style={[styles.iconGlyph, { color: tone }]}>{bullish ? "▲" : "▼"}</Text>
              </View>
              <Text style={styles.rowText}>
                <Text style={[styles.direction, { color: tone }]}>
                  {bullish ? messages.signals.bullish : messages.signals.bearish}
                </Text>{" "}
                <Text style={styles.ruleName}>{signal.rule_name}</Text>
              </Text>
              <Text style={styles.date}>{new Date(signal.triggered_at * 1000).toLocaleDateString()}</Text>
            </View>
          );
        })}
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
    },
    title: {
      fontSize: 11,
      fontWeight: "600",
      textTransform: "uppercase",
      letterSpacing: 0.4,
      color: colors.textTertiary,
      marginBottom: spacing[2],
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing[2],
      paddingVertical: spacing[2],
      borderBottomWidth: 1,
      borderBottomColor: colors.borderSubtle,
    },
    rowLast: {
      borderBottomWidth: 0,
    },
    iconBadge: {
      width: 24,
      height: 24,
      borderRadius: radius.full,
      alignItems: "center",
      justifyContent: "center",
    },
    iconGlyph: {
      fontSize: 10,
    },
    rowText: {
      flex: 1,
      fontSize: 13,
    },
    direction: {
      fontWeight: "700",
    },
    ruleName: {
      color: colors.textPrimary,
    },
    date: {
      fontSize: 11,
      color: colors.textTertiary,
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
