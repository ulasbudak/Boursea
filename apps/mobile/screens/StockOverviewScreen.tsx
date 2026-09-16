import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { formatChange, formatMarketCap, formatPrice, signColor } from "@trendus/shared";
import { useLocale } from "../lib/locale-context";
import { useTheme, radius, spacing, type ThemeColors } from "../lib/theme";
import { FundamentalsPanel } from "./FundamentalsPanel";
import { PriceChartWebView } from "./PriceChartWebView";
import { ScoreBadge } from "./ScoreBadge";
import { AddToWatchlistButton } from "./AddToWatchlistButton";
import { CreatePriceAlertButton } from "./CreatePriceAlertButton";
import { CreateSignalAlertButton } from "./CreateSignalAlertButton";

type StockOverview = {
  symbol: string;
  exchange: string;
  name: string;
  price: number | null;
  change_abs: number | null;
  change_pct: number | null;
  market_cap: number | null;
  currency: string | null;
  sector: string | null;
  industry: string | null;
};

type OverviewResponse = {
  overview: StockOverview | null;
  warnings: string[];
};

export function StockOverviewScreen({
  symbol,
  exchange,
  onBack,
}: {
  symbol: string;
  exchange: string;
  onBack: () => void;
}) {
  const { locale, messages } = useLocale();
  const { mode, colors } = useTheme();
  const styles = makeStyles(colors);
  const [overview, setOverview] = useState<StockOverview | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchFailed, setFetchFailed] = useState(false);
  const [tab, setTab] = useState<"overview" | "fundamentals" | "technical">("overview");

  useEffect(() => {
    const controller = new AbortController();

    async function loadOverview() {
      setLoading(true);
      setFetchFailed(false);
      try {
        const apiUrl = process.env.EXPO_PUBLIC_API_URL;
        const response = await fetch(
          `${apiUrl}/symbols/overview?symbol=${encodeURIComponent(symbol)}&exchange=${encodeURIComponent(exchange)}`,
          { signal: controller.signal }
        );
        if (!response.ok) {
          throw new Error("Overview request failed");
        }
        const data: OverviewResponse = await response.json();
        setOverview(data.overview);
        setWarnings(data.warnings);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
        setFetchFailed(true);
      } finally {
        setLoading(false);
      }
    }

    loadOverview();
    return () => controller.abort();
  }, [symbol, exchange]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TouchableOpacity onPress={onBack}>
        <Text style={styles.backLink}>{messages.stock.backToSearch}</Text>
      </TouchableOpacity>

      <Text style={styles.title}>
        {overview?.name ?? symbol} ({exchange.toUpperCase()})
      </Text>

      <View style={styles.actionsRow}>
        <AddToWatchlistButton
          symbol={symbol.toUpperCase()}
          exchange={exchange.toUpperCase()}
          name={overview?.name ?? null}
        />
        <CreatePriceAlertButton
          symbol={symbol.toUpperCase()}
          exchange={exchange.toUpperCase()}
          name={overview?.name ?? null}
        />
        <CreateSignalAlertButton
          symbol={symbol.toUpperCase()}
          exchange={exchange.toUpperCase()}
          name={overview?.name ?? null}
        />
      </View>

      <View style={styles.tabRow}>
        <TouchableOpacity onPress={() => setTab("overview")}>
          <Text style={[styles.tabLabel, tab === "overview" && styles.tabLabelActive]}>
            {messages.stock.overviewTab}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setTab("fundamentals")}>
          <Text style={[styles.tabLabel, tab === "fundamentals" && styles.tabLabelActive]}>
            {messages.stock.fundamentalsTab}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setTab("technical")}>
          <Text style={[styles.tabLabel, tab === "technical" && styles.tabLabelActive]}>
            {messages.stock.technicalTab}
          </Text>
        </TouchableOpacity>
      </View>

      {tab === "overview" && (
        <>
          <ScoreBadge symbol={symbol} exchange={exchange} />

          {loading && <ActivityIndicator color={colors.accent} />}

          {!loading && fetchFailed && (
            <Text style={styles.warning}>{messages.common.dataUnavailable}</Text>
          )}

          {!loading &&
            !fetchFailed &&
            warnings.map((warning) => (
              <Text key={warning} style={styles.warning}>
                {warning}
              </Text>
            ))}

          {!loading && !fetchFailed && (
            <View style={styles.card}>
              <View style={styles.row}>
                <Text style={styles.label}>{messages.stock.price}</Text>
                <Text style={styles.value}>
                  {overview?.price != null
                    ? formatPrice(overview.price, overview.currency, locale)
                    : messages.common.noData}
                </Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>{messages.stock.change}</Text>
                <Text
                  style={[
                    styles.value,
                    { color: signColor(overview?.change_abs, mode) },
                  ]}
                >
                  {overview?.change_abs != null && overview?.change_pct != null
                    ? formatChange(overview.change_abs, overview.change_pct, overview.currency, locale)
                    : messages.common.noData}
                </Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>{messages.stock.marketCap}</Text>
                <Text style={styles.value}>
                  {overview?.market_cap != null
                    ? formatMarketCap(overview.market_cap, overview.currency, locale)
                    : messages.common.noData}
                </Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>{messages.stock.sector}</Text>
                <Text style={styles.value}>{overview?.sector ?? messages.common.noData}</Text>
              </View>
              <View style={[styles.row, styles.rowLast]}>
                <Text style={styles.label}>{messages.stock.industry}</Text>
                <Text style={styles.value}>{overview?.industry ?? messages.common.noData}</Text>
              </View>
            </View>
          )}
        </>
      )}

      {tab === "fundamentals" && <FundamentalsPanel symbol={symbol} exchange={exchange} />}
      {tab === "technical" && <PriceChartWebView symbol={symbol} exchange={exchange} />}

      <Text style={styles.disclaimer}>{messages.common.disclaimer}</Text>
    </ScrollView>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.canvas,
    },
    content: {
      gap: spacing[1],
    },
    backLink: {
      color: colors.accent,
      fontWeight: "600",
      marginBottom: spacing[3],
    },
    title: {
      fontSize: 20,
      fontWeight: "700",
      color: colors.textPrimary,
      marginBottom: spacing[3],
    },
    actionsRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing[2],
    },
    tabRow: {
      flexDirection: "row",
      gap: spacing[4],
      marginBottom: spacing[3],
      borderBottomWidth: 1,
      borderBottomColor: colors.borderSubtle,
    },
    tabLabel: {
      paddingBottom: spacing[2],
      color: colors.textTertiary,
      fontWeight: "600",
    },
    tabLabelActive: {
      color: colors.textPrimary,
      borderBottomWidth: 2,
      borderBottomColor: colors.accent,
    },
    warning: {
      color: colors.warning,
      marginBottom: spacing[2],
    },
    card: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      borderRadius: radius.lg,
      paddingHorizontal: spacing[4],
    },
    row: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingVertical: spacing[3],
      borderBottomWidth: 1,
      borderBottomColor: colors.borderSubtle,
    },
    rowLast: {
      borderBottomWidth: 0,
    },
    label: {
      color: colors.textSecondary,
    },
    value: {
      fontWeight: "600",
      color: colors.textPrimary,
    },
    disclaimer: {
      marginTop: spacing[4],
      fontSize: 12,
      color: colors.textTertiary,
    },
  });
}
