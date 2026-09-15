import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useLocale } from "../lib/locale-context";

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
    return <ActivityIndicator />;
  }

  const signals = data?.signals ?? [];
  const warnings = data?.warnings ?? [];

  return (
    <View style={styles.container}>
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
        signals.map((signal, index) => (
          <View key={`${signal.rule_id}-${signal.triggered_at}-${index}`} style={styles.row}>
            <Text style={signal.direction === "bullish" ? styles.bullish : styles.bearish}>
              {signal.direction === "bullish" ? messages.signals.bullish : messages.signals.bearish}
            </Text>
            <Text style={styles.ruleName}>{signal.rule_name}</Text>
            <Text style={styles.date}>{new Date(signal.triggered_at * 1000).toLocaleDateString()}</Text>
          </View>
        ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
  },
  row: {
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    gap: 2,
  },
  bullish: {
    color: "#2e7d32",
    fontWeight: "700",
  },
  bearish: {
    color: "#c0392b",
    fontWeight: "700",
  },
  ruleName: {
    color: "#333",
  },
  date: {
    fontSize: 12,
    color: "#888",
  },
  noData: {
    color: "#888",
  },
  warning: {
    color: "#8a6d3b",
  },
});
