import { useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { supabase } from "../lib/supabase";
import { useLocale } from "../lib/locale-context";
import { SearchBox } from "./SearchBox";
import { StockOverviewScreen } from "./StockOverviewScreen";
import { SettingsScreen } from "./SettingsScreen";

type SymbolResult = {
  symbol: string;
  name: string;
  exchange: string;
};

export function HomeScreen({ session }: { session: Session }) {
  const { messages } = useLocale();
  const [selectedStock, setSelectedStock] = useState<SymbolResult | null>(null);
  const [showSettings, setShowSettings] = useState(false);

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

  if (showSettings) {
    return (
      <SafeAreaView style={styles.container}>
        <SettingsScreen onBack={() => setShowSettings(false)} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{messages.common.appName}</Text>
        <TouchableOpacity onPress={() => setShowSettings(true)}>
          <Text style={styles.settingsLink}>{messages.settings.title}</Text>
        </TouchableOpacity>
      </View>
      <Text>
        {messages.dashboard.loggedInAs}: {session.user.email}
      </Text>
      <SearchBox onSelectResult={setSelectedStock} />
      <TouchableOpacity
        style={styles.button}
        onPress={() => supabase.auth.signOut()}
      >
        <Text style={styles.buttonText}>{messages.dashboard.signOut}</Text>
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
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
  },
  settingsLink: {
    color: "#111",
    fontWeight: "600",
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
