import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

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

function formatPrice(price: number, currency: string | null) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: currency ?? "USD",
    maximumFractionDigits: 2,
  }).format(price);
}

function formatChange(changeAbs: number, changePct: number, currency: string | null) {
  const sign = changeAbs >= 0 ? "+" : "";
  return `${sign}${formatPrice(changeAbs, currency)} (${sign}${changePct.toFixed(2)}%)`;
}

function formatMarketCap(marketCap: number, currency: string | null) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: currency ?? "USD",
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(marketCap);
}

export function StockOverviewScreen({
  symbol,
  exchange,
  onBack,
}: {
  symbol: string;
  exchange: string;
  onBack: () => void;
}) {
  const [overview, setOverview] = useState<StockOverview | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchFailed, setFetchFailed] = useState(false);

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
        <Text style={styles.backLink}>← Aramaya dön</Text>
      </TouchableOpacity>

      <Text style={styles.title}>
        {overview?.name ?? symbol} ({exchange.toUpperCase()})
      </Text>

      {loading && <ActivityIndicator />}

      {!loading && fetchFailed && (
        <Text style={styles.warning}>Veri şu an güncellenemiyor.</Text>
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
            <Text style={styles.label}>Güncel Fiyat</Text>
            <Text style={styles.value}>
              {overview?.price != null
                ? formatPrice(overview.price, overview.currency)
                : "Veri yok"}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Günlük Değişim</Text>
            <Text style={styles.value}>
              {overview?.change_abs != null && overview?.change_pct != null
                ? formatChange(overview.change_abs, overview.change_pct, overview.currency)
                : "Veri yok"}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Piyasa Değeri</Text>
            <Text style={styles.value}>
              {overview?.market_cap != null
                ? formatMarketCap(overview.market_cap, overview.currency)
                : "Veri yok"}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Sektör</Text>
            <Text style={styles.value}>{overview?.sector ?? "Veri yok"}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Endüstri</Text>
            <Text style={styles.value}>{overview?.industry ?? "Veri yok"}</Text>
          </View>
        </View>
      )}

      <Text style={styles.disclaimer}>
        Bu sayfadaki bilgiler yatırım tavsiyesi değildir.
      </Text>
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
