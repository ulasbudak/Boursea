import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useLocale } from "../lib/locale-context";
import { useTheme, radius, spacing, type ThemeColors } from "../lib/theme";

type SymbolResult = {
  symbol: string;
  name: string;
  exchange: string;
};

type SearchResponse = {
  results: SymbolResult[];
  warnings: string[];
};

const DEBOUNCE_MS = 300;

export function SearchBox({
  onSelectResult,
}: {
  onSelectResult: (result: SymbolResult) => void;
}) {
  const { messages } = useLocale();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SymbolResult[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const apiUrl = process.env.EXPO_PUBLIC_API_URL;
        const response = await fetch(
          `${apiUrl}/symbols/search?q=${encodeURIComponent(trimmed)}`,
          { signal: controller.signal }
        );
        if (!response.ok) {
          throw new Error("Search request failed");
        }
        const data: SearchResponse = await response.json();
        setResults(data.results);
        setWarnings(data.warnings);
        setSearched(true);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
        setError(messages.search.searchError);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      controller.abort();
      clearTimeout(timeoutId);
    };
  }, [query, messages.search.searchError]);

  function handleChange(value: string) {
    setQuery(value);
    if (!value.trim()) {
      setResults([]);
      setWarnings([]);
      setSearched(false);
      setError(null);
    }
  }

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder={messages.search.placeholder}
        placeholderTextColor={colors.textTertiary}
        value={query}
        onChangeText={handleChange}
        autoCapitalize="characters"
      />
      {loading && <ActivityIndicator color={colors.accent} />}
      {error && <Text style={styles.error}>{error}</Text>}
      {warnings.map((warning) => (
        <Text key={warning} style={styles.warning}>
          {warning}
        </Text>
      ))}
      {searched && !loading && results.length === 0 && (
        <Text style={styles.noResults}>{messages.search.noResults}</Text>
      )}
      <FlatList
        data={results}
        keyExtractor={(item) => `${item.exchange}-${item.symbol}`}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.resultRow} onPress={() => onSelectResult(item)}>
            <Text style={styles.exchangeBadge}>{item.exchange}</Text>
            <Text style={styles.symbol}>{item.symbol}</Text>
            <Text style={styles.name}>{item.name}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      width: "100%",
      gap: spacing[2],
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
    error: {
      color: colors.negative,
      fontSize: 13,
    },
    warning: {
      color: colors.warning,
      fontSize: 13,
    },
    noResults: {
      color: colors.textTertiary,
      fontSize: 13,
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
    symbol: {
      fontWeight: "700",
      color: colors.textPrimary,
    },
    name: {
      flexShrink: 1,
      color: colors.textSecondary,
      fontSize: 13,
    },
  });
}
