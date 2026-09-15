import { useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useLocale } from "../lib/locale-context";

type ScoreFactor = {
  name: string;
  points: number;
  max_points: number;
};

type TechnicalConsensus = {
  bullish: number;
  bearish: number;
  neutral: number;
  total: number;
};

type StockScore = {
  value: number;
  label: string;
  factors: ScoreFactor[];
  consensus: TechnicalConsensus;
  rationale: string;
};

type ScoreResponse = {
  score: StockScore | null;
  warnings: string[];
};

export function ScoreBadge({ symbol, exchange }: { symbol: string; exchange: string }) {
  const { messages } = useLocale();
  const [data, setData] = useState<ScoreResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchFailed, setFetchFailed] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setFetchFailed(false);
      try {
        const apiUrl = process.env.EXPO_PUBLIC_API_URL;
        const response = await fetch(
          `${apiUrl}/symbols/score?symbol=${encodeURIComponent(symbol)}&exchange=${encodeURIComponent(exchange)}`,
          { signal: controller.signal }
        );
        if (!response.ok) {
          throw new Error("Score request failed");
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
    return null;
  }

  const score = data?.score ?? null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{messages.score.title}</Text>
      {fetchFailed || !score ? (
        <Text style={styles.noData}>{messages.score.noData}</Text>
      ) : (
        <>
          <Text style={styles.scoreLine}>
            <Text style={styles.scoreValue}>
              {score.value} {messages.score.outOf}
            </Text>{" "}
            — <Text style={styles.scoreLabel}>{score.label}</Text>
          </Text>
          <Text style={styles.rationale}>{score.rationale}</Text>
          <Text style={styles.consensus}>
            {messages.score.consensusLabel}: {score.consensus.bullish}/{score.consensus.total}{" "}
            {messages.score.consensusOutOf}
          </Text>
          <TouchableOpacity onPress={() => setShowExplanation((v) => !v)}>
            <Text style={styles.toggle}>{messages.score.explanationToggle}</Text>
          </TouchableOpacity>
          {showExplanation && (
            <View style={styles.factors}>
              {score.factors.map((factor) => (
                <Text key={factor.name} style={styles.factorRow}>
                  {factor.name}: {factor.points} / {factor.max_points}
                </Text>
              ))}
            </View>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    gap: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
  },
  scoreLine: {
    fontSize: 16,
  },
  scoreValue: {
    fontWeight: "700",
  },
  scoreLabel: {
    fontWeight: "700",
  },
  rationale: {
    color: "#333",
  },
  consensus: {
    color: "#555",
    fontSize: 13,
  },
  toggle: {
    color: "#2962FF",
  },
  factors: {
    gap: 2,
    marginTop: 4,
  },
  factorRow: {
    color: "#555",
    fontSize: 13,
  },
  noData: {
    color: "#888",
  },
});
