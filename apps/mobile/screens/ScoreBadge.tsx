import { useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useLocale } from "../lib/locale-context";
import { useTheme, radius, spacing, type ThemeColors } from "../lib/theme";

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

function ProgressBar({ value, max, colors }: { value: number; max: number; colors: ThemeColors }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  const tone = pct >= 70 ? colors.positive : pct >= 40 ? colors.warning : colors.negative;
  return (
    <View style={{ height: 6, borderRadius: radius.full, backgroundColor: colors.surfaceHover, overflow: "hidden" }}>
      <View style={{ height: "100%", width: `${pct}%`, borderRadius: radius.full, backgroundColor: tone }} />
    </View>
  );
}

export function ScoreBadge({ symbol, exchange }: { symbol: string; exchange: string }) {
  const { messages } = useLocale();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const labelTone: Record<string, { bg: string; fg: string }> = {
    Al: { bg: colors.positive + "26", fg: colors.positive },
    Sat: { bg: colors.negative + "26", fg: colors.negative },
    Nötr: { bg: colors.warning + "26", fg: colors.warning },
  };
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
  const tone = score ? labelTone[score.label] : undefined;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{messages.score.title}</Text>
      {fetchFailed || !score ? (
        <Text style={styles.noData}>{messages.score.noData}</Text>
      ) : (
        <>
          <View style={styles.scoreRow}>
            <Text style={styles.scoreValue}>
              {score.value}
              <Text style={styles.scoreOutOf}> {messages.score.outOf}</Text>
            </Text>
            <View style={[styles.badge, tone && { backgroundColor: tone.bg }]}>
              <Text style={[styles.badgeText, tone && { color: tone.fg }]}>{score.label}</Text>
            </View>
          </View>
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
                <View key={factor.name} style={styles.factorRow}>
                  <View style={styles.factorHeader}>
                    <Text style={styles.factorName}>{factor.name}</Text>
                    <Text style={styles.factorPoints}>
                      {factor.points} / {factor.max_points}
                    </Text>
                  </View>
                  <ProgressBar value={factor.points} max={factor.max_points} colors={colors} />
                </View>
              ))}
            </View>
          )}
        </>
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
      marginBottom: spacing[3],
      gap: spacing[1],
    },
    title: {
      fontSize: 11,
      fontWeight: "600",
      textTransform: "uppercase",
      letterSpacing: 0.4,
      color: colors.textTertiary,
      marginBottom: spacing[1],
    },
    scoreRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing[3],
    },
    scoreValue: {
      fontSize: 30,
      fontWeight: "700",
      color: colors.textPrimary,
    },
    scoreOutOf: {
      fontSize: 15,
      fontWeight: "400",
      color: colors.textTertiary,
    },
    badge: {
      paddingHorizontal: spacing[3],
      paddingVertical: spacing[1],
      borderRadius: radius.full,
      backgroundColor: colors.surfaceHover,
    },
    badgeText: {
      fontSize: 12,
      fontWeight: "700",
      color: colors.textSecondary,
    },
    rationale: {
      color: colors.textSecondary,
      marginTop: spacing[2],
      fontSize: 13,
    },
    consensus: {
      color: colors.textTertiary,
      fontSize: 12,
      marginTop: spacing[2],
    },
    toggle: {
      color: colors.accent,
      fontSize: 12,
      fontWeight: "600",
      marginTop: spacing[3],
    },
    factors: {
      gap: spacing[2],
      marginTop: spacing[3],
    },
    factorRow: {
      gap: spacing[1],
    },
    factorHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
    },
    factorName: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    factorPoints: {
      fontSize: 12,
      color: colors.textPrimary,
    },
    noData: {
      color: colors.textTertiary,
    },
  });
}
