import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useLocale } from "../lib/locale-context";
import { useTheme, radius, spacing, type ThemeColors } from "../lib/theme";
import { deleteAlert, fetchAlerts, type PriceAlert } from "../lib/alerts-client";

type SymbolResult = { symbol: string; name: string; exchange: string };

export function AlertsScreen({
  onBack,
  onSelectResult,
}: {
  onBack: () => void;
  onSelectResult: (result: SymbolResult) => void;
}) {
  const { messages } = useLocale();
  const t = messages.alerts;
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  const [alerts, setAlerts] = useState<PriceAlert[] | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const data = await fetchAlerts();
      setAlerts(data.alerts);
      setWarnings(data.warnings);
      setError(null);
    } catch {
      setError(t.loadError);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function initialLoad() {
      try {
        const data = await fetchAlerts();
        if (!cancelled) {
          setAlerts(data.alerts);
          setWarnings(data.warnings);
          setError(null);
        }
      } catch {
        if (!cancelled) setError(t.loadError);
      }
    }

    initialLoad();
    return () => {
      cancelled = true;
    };
  }, [t.loadError]);

  async function handleDelete(id: string) {
    setAlerts((prev) => prev?.filter((a) => a.id !== id) ?? null);
    try {
      await deleteAlert(id);
    } catch {
      await load();
    }
  }

  function statusLabel(alert: PriceAlert): string {
    if (alert.status === "triggered") return t.statusTriggered;
    if (alert.unavailable) return t.statusUnavailable;
    return t.statusActive;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TouchableOpacity onPress={onBack}>
        <Text style={styles.backLink}>{t.backToDashboard}</Text>
      </TouchableOpacity>
      <Text style={styles.title}>{t.title}</Text>

      {error && <Text style={styles.error}>{error}</Text>}
      {warnings.map((warning) => (
        <Text key={warning} style={styles.warning}>
          {warning}
        </Text>
      ))}
      {alerts === null && !error && <ActivityIndicator color={colors.accent} />}

      {alerts !== null && alerts.length === 0 && (
        <View style={styles.card}>
          <Text style={styles.emptyText}>{t.emptyList}</Text>
        </View>
      )}

      {alerts?.map((alert) => (
        <TouchableOpacity
          key={alert.id}
          style={styles.card}
          onPress={() =>
            onSelectResult({
              symbol: alert.symbol,
              name: alert.name ?? alert.symbol,
              exchange: alert.exchange,
            })
          }
        >
          <View style={styles.row}>
            <Text style={styles.exchangeBadge}>{alert.exchange}</Text>
            <Text style={styles.symbol}>{alert.symbol}</Text>
            <Text style={styles.condition}>
              {alert.direction === "above" ? t.directionAbove : t.directionBelow} {alert.threshold}
            </Text>
            <Text
              style={[
                styles.status,
                alert.status === "triggered" && styles.statusTriggered,
              ]}
            >
              {statusLabel(alert)}
            </Text>
            <TouchableOpacity onPress={() => handleDelete(alert.id)} hitSlop={8}>
              <Text style={styles.deleteLink}>{t.deleteButton}</Text>
            </TouchableOpacity>
          </View>
          {alert.unavailable && alert.exchange === "BIST" && (
            <Text style={styles.hint}>{t.bistUnavailableHint}</Text>
          )}
          {alert.unavailable && alert.exchange === "US" && (
            <Text style={styles.hint}>{t.usUnavailableHint}</Text>
          )}
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    content: {
      gap: spacing[3],
    },
    backLink: {
      color: colors.accent,
      fontWeight: "600",
    },
    title: {
      fontSize: 20,
      fontWeight: "700",
      color: colors.textPrimary,
    },
    error: {
      color: colors.negative,
      fontSize: 13,
    },
    warning: {
      color: colors.warning,
      fontSize: 13,
    },
    card: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      borderRadius: radius.lg,
      padding: spacing[4],
      gap: spacing[1],
    },
    emptyText: {
      color: colors.textTertiary,
      fontSize: 13,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing[2],
    },
    exchangeBadge: {
      fontSize: 10,
      fontWeight: "700",
      color: colors.textTertiary,
      backgroundColor: colors.surfaceHover,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
    },
    symbol: {
      fontWeight: "700",
      color: colors.textPrimary,
    },
    condition: {
      flex: 1,
      color: colors.textSecondary,
      fontSize: 13,
    },
    status: {
      fontSize: 11,
      fontWeight: "600",
      color: colors.textTertiary,
    },
    statusTriggered: {
      color: colors.positive,
    },
    deleteLink: {
      color: colors.textTertiary,
      fontSize: 12,
      paddingHorizontal: spacing[1],
    },
    hint: {
      color: colors.textTertiary,
      fontSize: 11,
    },
  });
}
