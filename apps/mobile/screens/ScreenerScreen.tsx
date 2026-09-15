import { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { formatCompactNumber, formatRatio } from "@trendus/shared";
import { useLocale } from "../lib/locale-context";

type ScreenerResult = {
  symbol: string;
  exchange: string;
  name: string;
  sector: string | null;
  pe_ratio: number | null;
  market_cap: number | null;
  roe: number | null;
  rsi: number | null;
  volume: number | null;
};

type ScreenerResponse = {
  results: ScreenerResult[];
  warnings: string[];
};

type Criteria = {
  exchange: "ALL" | "US" | "BIST";
  market_cap_min: string;
  pe_max: string;
  sector: string;
};

const EMPTY_CRITERIA: Criteria = {
  exchange: "ALL",
  market_cap_min: "",
  pe_max: "",
  sector: "",
};

type SymbolResult = { symbol: string; name: string; exchange: string };

export function ScreenerScreen({
  onBack,
  onSelectResult,
}: {
  onBack: () => void;
  onSelectResult: (result: SymbolResult) => void;
}) {
  const { locale, messages } = useLocale();
  const t = messages.screener;
  const [criteria, setCriteria] = useState<Criteria>(EMPTY_CRITERIA);
  const [results, setResults] = useState<ScreenerResult[] | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  function update<K extends keyof Criteria>(key: K, value: Criteria[K]) {
    setCriteria((prev) => ({ ...prev, [key]: value }));
  }

  async function runScreen() {
    setLoading(true);
    try {
      const apiUrl = process.env.EXPO_PUBLIC_API_URL;
      const params = new URLSearchParams();
      params.set("exchange", criteria.exchange);
      if (criteria.market_cap_min.trim()) {
        params.set("market_cap_min", criteria.market_cap_min.trim());
      }
      if (criteria.pe_max.trim()) {
        params.set("pe_max", criteria.pe_max.trim());
      }
      if (criteria.sector.trim()) {
        params.set("sector", criteria.sector.trim());
      }
      const response = await fetch(`${apiUrl}/screener/run?${params.toString()}`);
      const data: ScreenerResponse = await response.json();
      setResults(data.results);
      setWarnings(data.warnings);
    } catch {
      setWarnings([messages.common.dataUnavailable]);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  function renderExchangeOption(value: Criteria["exchange"], label: string) {
    const isActive = criteria.exchange === value;
    return (
      <TouchableOpacity
        style={[styles.option, isActive && styles.optionActive]}
        onPress={() => update("exchange", value)}
      >
        <Text style={[styles.optionText, isActive && styles.optionTextActive]}>{label}</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={onBack}>
        <Text style={styles.backLink}>{t.backToDashboard}</Text>
      </TouchableOpacity>
      <Text style={styles.title}>{t.title}</Text>

      <Text style={styles.label}>{t.exchangeLabel}</Text>
      <View style={styles.optionRow}>
        {renderExchangeOption("ALL", t.exchangeAll)}
        {renderExchangeOption("US", t.exchangeUs)}
        {renderExchangeOption("BIST", t.exchangeBist)}
      </View>

      <Text style={styles.label}>{t.marketCapMinLabel}</Text>
      <TextInput
        style={styles.input}
        keyboardType="numeric"
        value={criteria.market_cap_min}
        onChangeText={(v) => update("market_cap_min", v)}
      />

      <Text style={styles.label}>{t.peMaxLabel}</Text>
      <TextInput
        style={styles.input}
        keyboardType="numeric"
        value={criteria.pe_max}
        onChangeText={(v) => update("pe_max", v)}
      />

      <Text style={styles.label}>{t.sectorLabel}</Text>
      <TextInput
        style={styles.input}
        placeholder={t.sectorPlaceholder}
        value={criteria.sector}
        onChangeText={(v) => update("sector", v)}
      />

      <TouchableOpacity style={styles.button} onPress={runScreen} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? t.running : t.runButton}</Text>
      </TouchableOpacity>

      {loading && <ActivityIndicator />}

      {warnings.map((warning) => (
        <Text key={warning} style={styles.warning}>
          {warning}
        </Text>
      ))}

      {results !== null && !loading && (
        <View style={styles.results}>
          <Text style={styles.resultsTitle}>{t.resultsTitle}</Text>
          {results.length === 0 ? (
            <Text>{t.noResults}</Text>
          ) : (
            <FlatList
              data={results}
              keyExtractor={(item) => `${item.exchange}-${item.symbol}`}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.resultRow}
                  onPress={() => onSelectResult({ symbol: item.symbol, name: item.name, exchange: item.exchange })}
                >
                  <Text style={styles.exchangeBadge}>{item.exchange}</Text>
                  <View style={styles.resultInfo}>
                    <Text style={styles.symbol}>
                      {item.symbol} — {item.name}
                    </Text>
                    <Text style={styles.resultMeta}>
                      {t.columnPeRatio}: {item.pe_ratio !== null ? formatRatio(item.pe_ratio, locale) : "—"}{"  "}
                      {t.columnMarketCap}:{" "}
                      {item.market_cap !== null ? formatCompactNumber(item.market_cap, locale) : "—"}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: 8,
  },
  backLink: {
    color: "#111",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
  },
  label: {
    color: "#555",
    marginTop: 8,
  },
  optionRow: {
    flexDirection: "row",
    gap: 8,
  },
  option: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ccc",
    alignItems: "center",
  },
  optionActive: {
    backgroundColor: "#111",
    borderColor: "#111",
  },
  optionText: {
    fontWeight: "600",
    color: "#111",
  },
  optionTextActive: {
    color: "#fff",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  button: {
    backgroundColor: "#111",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 12,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
  },
  warning: {
    color: "#8a6d3b",
  },
  results: {
    flex: 1,
    marginTop: 12,
    gap: 8,
  },
  resultsTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  exchangeBadge: {
    fontSize: 10,
    fontWeight: "700",
    color: "#555",
    backgroundColor: "#eee",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  resultInfo: {
    flexShrink: 1,
    gap: 2,
  },
  symbol: {
    fontWeight: "700",
  },
  resultMeta: {
    fontSize: 12,
    color: "#888",
  },
});
