import { useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useLocale } from "../lib/locale-context";
import { useTheme, radius, spacing, type ThemeColors } from "../lib/theme";
import { fetchEntitlement } from "../lib/entitlements-client";
import {
  fetchFundamentalAIReport,
  fetchTechnicalAIReport,
  type FundamentalAIReport,
  type TechnicalAIReport,
} from "../lib/ai-reports-client";
import { ScoreBadge } from "./ScoreBadge";

type ReportState<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "loaded"; report: T };

function ReportCard<T extends { report: string; cached: boolean }>({
  title,
  disclaimer,
  fetcher,
}: {
  title: string;
  disclaimer: string;
  fetcher: () => Promise<{ report: T | null; warnings: string[] }>;
}) {
  const { messages } = useLocale();
  const t = messages.aiAnalysis;
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [state, setState] = useState<ReportState<T>>({ status: "idle" });

  async function generate() {
    setState({ status: "loading" });
    try {
      const data = await fetcher();
      if (data.report) {
        setState({ status: "loaded", report: data.report });
      } else {
        setState({ status: "error", message: data.warnings[0] ?? t.unavailableMessage });
      }
    } catch (err) {
      setState({
        status: "error",
        message: err instanceof Error ? err.message : t.unavailableMessage,
      });
    }
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      {state.status === "idle" && (
        <TouchableOpacity style={styles.button} onPress={generate}>
          <Text style={styles.buttonText}>{t.generateButton}</Text>
        </TouchableOpacity>
      )}
      {state.status === "loading" && <Text style={styles.hint}>{t.generating}</Text>}
      {state.status === "error" && <Text style={styles.error}>{state.message}</Text>}
      {state.status === "loaded" && (
        <>
          <Text style={styles.reportText}>{state.report.report}</Text>
          {state.report.cached && <Text style={styles.hint}>{t.cachedNote}</Text>}
          <Text style={styles.disclaimer}>{disclaimer}</Text>
          <TouchableOpacity style={[styles.button, styles.buttonSecondary]} onPress={generate}>
            <Text style={styles.buttonSecondaryText}>{t.generateButton}</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

export function AIAnalysisPanel({ symbol, exchange }: { symbol: string; exchange: string }) {
  const { messages } = useLocale();
  const t = messages.aiAnalysis;
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [locked, setLocked] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function initialLoad() {
      try {
        const entitlement = await fetchEntitlement();
        if (!cancelled) setLocked(!entitlement.ai_reports);
      } catch {
        if (!cancelled) setLocked(true);
      }
    }

    initialLoad();
    return () => {
      cancelled = true;
    };
  }, []);

  if (locked === null) return null;

  if (locked) {
    return (
      <View style={styles.card}>
        <Text style={styles.reportText}>{t.lockedMessage}</Text>
      </View>
    );
  }

  return (
    <View style={{ gap: spacing[3] }}>
      <ScoreBadge symbol={symbol} exchange={exchange} />
      <ReportCard
        title={t.technicalTitle}
        disclaimer={t.technicalDisclaimer}
        fetcher={(): Promise<{ report: TechnicalAIReport | null; warnings: string[] }> =>
          fetchTechnicalAIReport(symbol, exchange)
        }
      />
      <ReportCard
        title={t.fundamentalTitle}
        disclaimer={t.fundamentalDisclaimer}
        fetcher={(): Promise<{ report: FundamentalAIReport | null; warnings: string[] }> =>
          fetchFundamentalAIReport(symbol, exchange)
        }
      />
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
      gap: spacing[2],
    },
    title: {
      fontSize: 11,
      fontWeight: "700",
      textTransform: "uppercase",
      color: colors.textTertiary,
    },
    button: {
      backgroundColor: colors.accent,
      borderRadius: radius.md,
      paddingHorizontal: spacing[4],
      paddingVertical: spacing[2],
      alignSelf: "flex-start",
    },
    buttonSecondary: {
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.borderDefault,
    },
    buttonText: {
      color: colors.accentText,
      fontWeight: "600",
      fontSize: 13,
    },
    buttonSecondaryText: {
      color: colors.textPrimary,
      fontWeight: "600",
      fontSize: 13,
    },
    hint: {
      color: colors.textTertiary,
      fontSize: 12,
    },
    error: {
      color: colors.negative,
      fontSize: 13,
    },
    reportText: {
      color: colors.textSecondary,
      fontSize: 13,
      lineHeight: 19,
    },
    disclaimer: {
      color: colors.textTertiary,
      fontSize: 11,
    },
  });
}
