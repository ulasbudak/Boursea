import { useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { supabase } from "../lib/supabase";
import { useLocale } from "../lib/locale-context";
import { useTheme, radius, spacing, type ThemeColors } from "../lib/theme";
import { SearchBox } from "./SearchBox";
import { StockOverviewScreen } from "./StockOverviewScreen";
import { SettingsScreen } from "./SettingsScreen";
import { ScreenerScreen } from "./ScreenerScreen";
import { WatchlistScreen } from "./WatchlistScreen";
import { PortfolioScreen } from "./PortfolioScreen";
import { AlertsScreen } from "./AlertsScreen";
import { SignalAlertsScreen } from "./SignalAlertsScreen";
import { CompareScreen } from "./CompareScreen";
import { SimulationScreen } from "./SimulationScreen";
import { Highlights } from "./Highlights";
import { BulletinSection } from "./BulletinSection";

type SymbolResult = {
  symbol: string;
  name: string;
  exchange: string;
};

export function HomeScreen({ session }: { session: Session }) {
  const { messages } = useLocale();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [selectedStock, setSelectedStock] = useState<SymbolResult | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showScreener, setShowScreener] = useState(false);
  const [showWatchlist, setShowWatchlist] = useState(false);
  const [showPortfolio, setShowPortfolio] = useState(false);
  const [showAlerts, setShowAlerts] = useState(false);
  const [showSignalAlerts, setShowSignalAlerts] = useState(false);
  const [showCompare, setShowCompare] = useState(false);
  const [showSimulation, setShowSimulation] = useState(false);

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

  if (showScreener) {
    return (
      <SafeAreaView style={styles.container}>
        <ScreenerScreen onBack={() => setShowScreener(false)} onSelectResult={setSelectedStock} />
      </SafeAreaView>
    );
  }

  if (showWatchlist) {
    return (
      <SafeAreaView style={styles.container}>
        <WatchlistScreen onBack={() => setShowWatchlist(false)} onSelectResult={setSelectedStock} />
      </SafeAreaView>
    );
  }

  if (showPortfolio) {
    return (
      <SafeAreaView style={styles.container}>
        <PortfolioScreen onBack={() => setShowPortfolio(false)} />
      </SafeAreaView>
    );
  }

  if (showAlerts) {
    return (
      <SafeAreaView style={styles.container}>
        <AlertsScreen onBack={() => setShowAlerts(false)} onSelectResult={setSelectedStock} />
      </SafeAreaView>
    );
  }

  if (showSignalAlerts) {
    return (
      <SafeAreaView style={styles.container}>
        <SignalAlertsScreen
          onBack={() => setShowSignalAlerts(false)}
          onSelectResult={setSelectedStock}
        />
      </SafeAreaView>
    );
  }

  if (showCompare) {
    return (
      <SafeAreaView style={styles.container}>
        <CompareScreen onBack={() => setShowCompare(false)} />
      </SafeAreaView>
    );
  }

  if (showSimulation) {
    return (
      <SafeAreaView style={styles.container}>
        <SimulationScreen onBack={() => setShowSimulation(false)} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>{messages.common.appName}</Text>
          <TouchableOpacity onPress={() => setShowSettings(true)}>
            <Text style={styles.link}>{messages.settings.title}</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.subtitle}>
          {messages.dashboard.loggedInAs}: {session.user.email}
        </Text>

        <View style={styles.card}>
          <SearchBox onSelectResult={setSelectedStock} />
        </View>

        <Text style={styles.sectionLabel}>{messages.highlights.title}</Text>
        <Highlights onSelectResult={setSelectedStock} />

        <Text style={styles.sectionLabel}>{messages.bulletin.title}</Text>
        <BulletinSection />

        <TouchableOpacity style={styles.navCard} onPress={() => setShowWatchlist(true)}>
          <Text style={styles.navCardText}>{messages.watchlist.title}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navCard} onPress={() => setShowPortfolio(true)}>
          <Text style={styles.navCardText}>{messages.portfolio.title}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navCard} onPress={() => setShowAlerts(true)}>
          <Text style={styles.navCardText}>{messages.alerts.title}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navCard} onPress={() => setShowSignalAlerts(true)}>
          <Text style={styles.navCardText}>{messages.signalAlerts.title}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navCard} onPress={() => setShowScreener(true)}>
          <Text style={styles.navCardText}>{messages.screener.title}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navCard} onPress={() => setShowCompare(true)}>
          <Text style={styles.navCardText}>{messages.comparison.title}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navCard} onPress={() => setShowSimulation(true)}>
          <Text style={styles.navCardText}>{messages.simulation.title}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={() => supabase.auth.signOut()}>
          <Text style={styles.buttonText}>{messages.dashboard.signOut}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
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
      gap: spacing[3],
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    title: {
      fontSize: 24,
      fontWeight: "700",
      color: colors.textPrimary,
    },
    subtitle: {
      color: colors.textSecondary,
      fontSize: 13,
    },
    sectionLabel: {
      fontSize: 11,
      fontWeight: "700",
      textTransform: "uppercase",
      color: colors.textTertiary,
    },
    link: {
      color: colors.accent,
      fontWeight: "600",
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      padding: spacing[4],
    },
    navCard: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      padding: spacing[4],
    },
    navCardText: {
      color: colors.textPrimary,
      fontWeight: "600",
    },
    button: {
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.borderDefault,
      paddingVertical: spacing[3],
      paddingHorizontal: spacing[6],
      borderRadius: radius.md,
      alignSelf: "flex-start",
    },
    buttonText: {
      color: colors.textPrimary,
      fontWeight: "600",
    },
  });
}
