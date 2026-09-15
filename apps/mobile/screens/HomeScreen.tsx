import { useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { SafeAreaView, StyleSheet, Text, TouchableOpacity } from "react-native";
import { supabase } from "../lib/supabase";
import { SearchBox } from "./SearchBox";
import { StockOverviewScreen } from "./StockOverviewScreen";

type SymbolResult = {
  symbol: string;
  name: string;
  exchange: string;
};

export function HomeScreen({ session }: { session: Session }) {
  const [selectedStock, setSelectedStock] = useState<SymbolResult | null>(null);

  if (selectedStock) {
    return (
      <SafeAreaView style={styles.container}>
        <StockOverviewScreen
          symbol={selectedStock.symbol}
          exchange={selectedStock.exchange}
          onBack={() => setSelectedStock(null)}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Trendus</Text>
      <Text>Giriş yapıldı: {session.user.email}</Text>
      <SearchBox onSelectResult={setSelectedStock} />
      <TouchableOpacity
        style={styles.button}
        onPress={() => supabase.auth.signOut()}
      >
        <Text style={styles.buttonText}>Çıkış Yap</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 12,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
  },
  button: {
    backgroundColor: "#111",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
  },
});
