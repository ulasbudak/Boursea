import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { formatCompactNumber, formatRatio } from "@borocean/shared";
import { useLocale } from "../lib/locale-context";
import { useTheme, radius, spacing, type ThemeColors } from "../lib/theme";

type SymbolResult = { symbol: string; name: string; exchange: string };

type SearchResponse = { results: SymbolResult[]; warnings: string[] };

type FundamentalsSnapshot = {
  pe_ratio: number | null;
  market_cap: number | null;
  roe: number | null;
  debt_to_equity: number | null;
  net_margin: number | null;
};

type StockScore = { value: number; label: string };

type ComparisonEntry = {
  symbol: string;
  exchange: string;
  fundamentals: FundamentalsSnapshot | null;
  score: StockScore | null;
  rsi: number | null;
  warnings: string[];
};

type ComparisonResponse = { results: ComparisonEntry[]; warnings: string[] };

const MAX_SYMBOLS = 4;
const DEBOUNCE_MS = 300;

function rsiTone(rsi: number, colors: ThemeColors): string {
  if (rsi < 30 || rsi > 70) return colors.negative;
  if (rsi < 40 || rsi > 60) return colors.warning;
  return colors.positive;
}

function bestWorst(
  values: (number | null)[],
  direction: "higher" | "lower"
): { best: number | null; worst: number | null } {
  const defined = values
    .map((v, i) => ({ v, i }))
    .filter((x): x is { v: number; i: number } => x.v !== null);
  if (defined.length < 2) return { best: null, worst: null };
  const sorted = [...defined].sort((a, b) => (direction === "higher" ? b.v - a.v : a.v - b.v));
  if (sorted[0].v === sorted[sorted.length - 1].v) return { best: null, worst: null };
  return { best: sorted[0].i, worst: sorted[sorted.length - 1].i };
}

export function CompareScreen({ onBack }: { onBack: () => void }) {
  const { locale, messages } = useLocale();
  const t = messages.comparison;
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SymbolResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<SymbolResult[]>([]);
  const [results, setResults] = useState<ComparisonEntry[] | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      return;
    }
    let cancelled = false;
    const timeoutId = setTimeout(async () => {
      setSearching(true);
      try {
        const apiUrl = process.env.EXPO_PUBLIC_API_URL;
        const response = await fetch(`${apiUrl}/symbols/search?q=${encodeURIComponent(trimmed)}`);
        const data: SearchResponse = await response.json();
        if (!cancelled) setSearchResults(data.results);
      } catch {
        // Search failures are transient; the user can retry by typing again.
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [query]);

  function handleQueryChange(value: string) {
    setQuery(value);
    if (!value.trim()) {
      setSearchResults([]);
    }
  }

  function addSymbol(result: SymbolResult) {
    if (selected.length >= MAX_SYMBOLS) return;
    if (selected.some((s) => s.symbol === result.symbol && s.exchange === result.exchange)) return;
    setSelected((prev) => [...prev, result]);
    setQuery("");
    setSearchResults([]);
  }

  function removeSymbol(result: SymbolResult) {
    setSelected((prev) => prev.filter((s) => !(s.symbol === result.symbol && s.exchange === result.exchange)));
    setResults(null);
  }

  async function runComparison() {
    setLoading(true);
    try {
      const apiUrl = process.env.EXPO_PUBLIC_API_URL;
      const symbolsParam = selected.map((s) => `${s.symbol}:${s.exchange}`).join(",");
      const response = await fetch(`${apiUrl}/compare?symbols=${encodeURIComponent(symbolsParam)}`);
      const data: ComparisonResponse = await response.json();
      setResults(data.results);
      setWarnings(data.warnings);
    } catch {
      setWarnings([t.loadError]);
      setResults(null);
    } finally {
      setLoading(false);
    }
  }

  const canCompare = selected.length >= 2 && selected.length <= MAX_SYMBOLS;

  function renderMetricRow(
    label: string,
    values: (number | null)[],
    format: (v: number) => string,
    direction?: "higher" | "lower"
  ) {
    const { best, worst } = direction ? bestWorst(values, direction) : { best: null, worst: null };
    return (
      <View style={styles.metricRow}>
        <Text style={styles.metricLabel}>{label}</Text>
        {values.map((v, i) => (
          <Text
            key={i}
            style={[
              styles.metricValue,
              i === best && { color: colors.positive },
              i === worst && { color: colors.negative },
            ]}
          >
            {v !== null ? format(v) : t.noValue}
          </Text>
        ))}
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TouchableOpacity onPress={onBack}>
        <Text style={styles.backLink}>{t.backToDashboard}</Text>
      </TouchableOpacity>
      <Text style={styles.title}>{t.title}</Text>

      <View style={styles.card}>
        <TextInput
          style={styles.input}
          placeholder={t.searchPlaceholder}
          placeholderTextColor={colors.textTertiary}
          value={query}
          onChangeText={handleQueryChange}
          autoCapitalize="characters"
        />
        {searching && <ActivityIndicator color={colors.accent} />}
        {searchResults.map((result) => (
          <TouchableOpacity
            key={`${result.exchange}-${result.symbol}`}
            style={styles.searchRow}
            onPress={() => addSymbol(result)}
          >
            <Text style={styles.exchangeBadge}>{result.exchange}</Text>
            <Text style={styles.symbol}>{result.symbol}</Text>
            <Text style={styles.name} numberOfLines={1}>
              {result.name}
            </Text>
            <Text style={styles.addLabel}>{t.addButton}</Text>
          </TouchableOpacity>
        ))}

        <View style={styles.chipRow}>
          {selected.map((s) => (
            <TouchableOpacity
              key={`${s.exchange}-${s.symbol}`}
              style={styles.chip}
              onPress={() => removeSymbol(s)}
            >
              <Text style={styles.chipText}>{s.symbol} ✕</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.note}>{selected.length < 2 ? t.minHint : t.maxHint}</Text>

        <TouchableOpacity style={styles.button} onPress={runComparison} disabled={!canCompare || loading}>
          <Text style={styles.buttonText}>{loading ? t.running : t.runButton}</Text>
        </TouchableOpacity>
      </View>

      {warnings.map((warning) => (
        <Text key={warning} style={styles.warning}>
          {warning}
        </Text>
      ))}

      {results !== null && results.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.resultsTitle}>{t.resultsTitle}</Text>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>{t.rowSymbol}</Text>
            {results.map((entry) => (
              <Text key={`${entry.exchange}-${entry.symbol}`} style={styles.metricHeader}>
                {entry.symbol}
              </Text>
            ))}
          </View>
          {renderMetricRow(
            t.rowPeRatio,
            results.map((e) => e.fundamentals?.pe_ratio ?? null),
            (v) => formatRatio(v, locale),
            "lower"
          )}
          {renderMetricRow(
            t.rowMarketCap,
            results.map((e) => e.fundamentals?.market_cap ?? null),
            (v) => formatCompactNumber(v, locale)
          )}
          {renderMetricRow(
            t.rowRoe,
            results.map((e) => e.fundamentals?.roe ?? null),
            (v) => formatRatio(v, locale),
            "higher"
          )}
          {renderMetricRow(
            t.rowDebtToEquity,
            results.map((e) => e.fundamentals?.debt_to_equity ?? null),
            (v) => formatRatio(v, locale),
            "lower"
          )}
          {renderMetricRow(
            t.rowNetMargin,
            results.map((e) => e.fundamentals?.net_margin ?? null),
            (v) => formatRatio(v, locale),
            "higher"
          )}
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>{t.rowRsi}</Text>
            {results.map((entry, i) => (
              <Text
                key={i}
                style={[
                  styles.metricValue,
                  entry.rsi !== null && { color: rsiTone(entry.rsi, colors) },
                ]}
              >
                {entry.rsi !== null ? formatRatio(entry.rsi, locale) : t.noValue}
              </Text>
            ))}
          </View>
          {renderMetricRow(
            t.rowScore,
            results.map((e) => e.score?.value ?? null),
            (v) => String(Math.round(v)),
            "higher"
          )}
        </View>
      )}

      {results === null && <Text style={styles.note}>{t.emptyState}</Text>}
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
      padding: spacing[4],
      gap: spacing[2],
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
    input: {
      borderWidth: 1,
      borderColor: colors.borderDefault,
      backgroundColor: colors.surfaceElevated,
      borderRadius: radius.md,
      paddingHorizontal: spacing[3],
      paddingVertical: spacing[3],
      color: colors.textPrimary,
    },
    searchRow: {
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
    symbol: {
      fontWeight: "700",
      color: colors.textPrimary,
    },
    name: {
      flex: 1,
      color: colors.textSecondary,
      fontSize: 13,
    },
    addLabel: {
      color: colors.accent,
      fontWeight: "600",
      fontSize: 12,
    },
    chipRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing[2],
    },
    chip: {
      backgroundColor: colors.surfaceHover,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      borderRadius: radius.full,
      paddingHorizontal: spacing[3],
      paddingVertical: spacing[1],
    },
    chipText: {
      color: colors.textPrimary,
      fontSize: 12,
      fontWeight: "600",
    },
    note: {
      fontSize: 12,
      color: colors.textTertiary,
    },
    button: {
      backgroundColor: colors.accent,
      paddingVertical: spacing[3],
      borderRadius: radius.md,
      alignItems: "center",
      marginTop: spacing[2],
    },
    buttonText: {
      color: colors.accentText,
      fontWeight: "600",
    },
    warning: {
      color: colors.warning,
      fontSize: 13,
    },
    resultsTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.textPrimary,
      marginBottom: spacing[2],
    },
    metricRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: spacing[2],
      borderTopWidth: 1,
      borderTopColor: colors.borderSubtle,
      gap: spacing[2],
    },
    metricLabel: {
      flex: 1.2,
      fontSize: 11,
      color: colors.textTertiary,
      textTransform: "uppercase",
    },
    metricHeader: {
      flex: 1,
      textAlign: "right",
      fontWeight: "700",
      color: colors.textPrimary,
    },
    metricValue: {
      flex: 1,
      textAlign: "right",
      fontWeight: "600",
      color: colors.textPrimary,
    },
  });
}
