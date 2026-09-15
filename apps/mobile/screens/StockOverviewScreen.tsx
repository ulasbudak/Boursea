import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { formatChange, formatMarketCap, formatPrice } from "@trendus/shared";
import { useLocale } from "../lib/locale-context";
import { FundamentalsPanel } from "./FundamentalsPanel";
import { PriceChartWebView } from "./PriceChartWebView";

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
    <ScrollView style={styles.container}>
      <TouchableOpacity onPress={onBack}>
        <Text style={styles.backLink}>{messages.stock.backToSearch}</Text>
      </TouchableOpacity>

      <Text style={styles.title}>
        {overview?.name ?? symbol} ({exchange.toUpperCase()})
      </Text>

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
          {loading && <ActivityIndicator />}

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
            <View style={styles.metrics}>
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
                <Text style={styles.value}>
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
              <View style={styles.row}>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backLink: {
    color: "#111",
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 12,
  },
  tabRow: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  tabLabel: {
    paddingBottom: 8,
    color: "#888",
    fontWeight: "600",
  },
  tabLabelActive: {
    color: "#111",
    borderBottomWidth: 2,
    borderBottomColor: "#111",
  },
  warning: {
    color: "#8a6d3b",
    marginBottom: 8,
  },
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
  disclaimer: {
    marginTop: 16,
    fontSize: 12,
    color: "#888",
  },
});
