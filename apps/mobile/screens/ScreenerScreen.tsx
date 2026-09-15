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
import { useTheme, radius, spacing, type ThemeColors } from "../lib/theme";

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

// F/K<25, skorlama motorunda "iyi" puan alan üst sınır (bkz. apps/api/app/scoring.py::_score_pe).
const SUGGESTED_CRITERIA: Criteria = {
  ...EMPTY_CRITERIA,
  pe_max: "25",
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
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [criteria, setCriteria] = useState<Criteria>(SUGGESTED_CRITERIA);
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
      <Text style={styles.note}>{t.defaultsNote}</Text>

      <View style={styles.card}>
        <Text style={styles.label}>{t.exchangeLabel}</Text>
        <View style={styles.optionRow}>
          {renderExchangeOption("ALL", t.exchangeAll)}
          {renderExchangeOption("US", t.exchangeUs)}
          {renderExchangeOption("BIST", t.exchangeBist)}
        </View>

        <Text style={styles.label}>{t.marketCapMinLabel}</Text>
        <TextInput
          style={styles.input}
          placeholderTextColor={colors.textTertiary}
          keyboardType="numeric"
          value={criteria.market_cap_min}
          onChangeText={(v) => update("market_cap_min", v)}
        />

        <Text style={styles.label}>{t.peMaxLabel}</Text>
        <TextInput
          style={styles.input}
          placeholderTextColor={colors.textTertiary}
          keyboardType="numeric"
          value={criteria.pe_max}
          onChangeText={(v) => update("pe_max", v)}
        />

        <Text style={styles.label}>{t.sectorLabel}</Text>
        <TextInput
          style={styles.input}
          placeholder={t.sectorPlaceholder}
          placeholderTextColor={colors.textTertiary}
          value={criteria.sector}
          onChangeText={(v) => update("sector", v)}
        />

        <TouchableOpacity style={styles.button} onPress={runScreen} disabled={loading}>
          <Text style={styles.buttonText}>{loading ? t.running : t.runButton}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setCriteria(SUGGESTED_CRITERIA)}>
          <Text style={styles.resetLink}>{t.resetDefaults}</Text>
        </TouchableOpacity>
      </View>

      {loading && <ActivityIndicator color={colors.accent} />}

      {warnings.map((warning) => (
        <Text key={warning} style={styles.warning}>
          {warning}
        </Text>
      ))}

      {results !== null && !loading && (
        <View style={styles.results}>
          <Text style={styles.resultsTitle}>{t.resultsTitle}</Text>
          {results.length === 0 ? (
            <Text style={styles.noResults}>{t.noResults}</Text>
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

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      gap: spacing[2],
      backgroundColor: colors.canvas,
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
    card: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      borderRadius: radius.lg,
      padding: spacing[4],
      gap: spacing[2],
      marginTop: spacing[2],
    },
    label: {
      color: colors.textSecondary,
      fontSize: 13,
      marginTop: spacing[2],
    },
    note: {
      fontSize: 12,
      color: colors.textTertiary,
    },
    resetLink: {
      color: colors.textSecondary,
      textAlign: "center",
      marginTop: spacing[2],
    },
    optionRow: {
      flexDirection: "row",
      gap: spacing[2],
    },
    option: {
      flex: 1,
      paddingVertical: spacing[3],
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.borderDefault,
      backgroundColor: colors.surfaceElevated,
      alignItems: "center",
    },
    optionActive: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    optionText: {
      fontWeight: "600",
      color: colors.textPrimary,
    },
    optionTextActive: {
      color: colors.accentText,
    },
    input: {
      borderWidth: 1,
      borderColor: colors.borderDefault,
      backgroundColor: colors.surfaceElevated,
      borderRadius: radius.md,
      paddingHorizontal: spacing[3],
      paddingVertical: spacing[3],
      color: colors.textPrimary,
    },
    button: {
      backgroundColor: colors.accent,
      paddingVertical: spacing[3],
      borderRadius: radius.md,
      alignItems: "center",
      marginTop: spacing[3],
    },
    buttonText: {
      color: colors.accentText,
      fontWeight: "600",
    },
    warning: {
      color: colors.warning,
      fontSize: 13,
    },
    noResults: {
      color: colors.textTertiary,
      fontSize: 13,
    },
    results: {
      flex: 1,
      marginTop: spacing[3],
      gap: spacing[2],
    },
    resultsTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.textPrimary,
    },
    resultRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing[2],
      paddingVertical: spacing[2],
      borderBottomWidth: 1,
      borderBottomColor: colors.borderSubtle,
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
    resultInfo: {
      flexShrink: 1,
      gap: 2,
    },
    symbol: {
      fontWeight: "700",
      color: colors.textPrimary,
    },
    resultMeta: {
      fontSize: 12,
      color: colors.textTertiary,
    },
  });
}
