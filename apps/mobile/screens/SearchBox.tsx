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
          throw new Error("Arama isteği başarısız oldu.");
        }
        const data: SearchResponse = await response.json();
        setResults(data.results);
        setWarnings(data.warnings);
        setSearched(true);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
        setError("Arama sırasında bir hata oluştu.");
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      controller.abort();
      clearTimeout(timeoutId);
    };
  }, [query]);

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
        placeholder="Sembol veya şirket adı ara (örn. GARAN, Apple)"
        value={query}
        onChangeText={handleChange}
        autoCapitalize="characters"
      />
      {loading && <ActivityIndicator />}
      {error && <Text style={styles.error}>{error}</Text>}
      {warnings.map((warning) => (
        <Text key={warning} style={styles.warning}>
          {warning}
        </Text>
      ))}
      {searched && !loading && results.length === 0 && (
        <Text>Sonuç bulunamadı.</Text>
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

const styles = StyleSheet.create({
  container: {
    width: "100%",
    gap: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  error: {
    color: "#c0392b",
  },
  warning: {
    color: "#8a6d3b",
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
  symbol: {
    fontWeight: "700",
  },
  name: {
    flexShrink: 1,
    color: "#333",
  },
});
