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
import { BIST_ENABLED, formatPrice, formatSignedPercent, signColor } from "@boursea/shared";
import { useLocale } from "../lib/locale-context";
import { useTheme, radius, spacing, type ThemeColors } from "../lib/theme";
import {
  createSimulation,
  deleteSimulation,
  fetchHistory,
  fetchSimulations,
  placeOrder,
  type Simulation,
  type SnapshotPoint,
} from "../lib/simulations-client";

type SymbolResult = { symbol: string; name: string; exchange: string };

const SYMBOL_SEARCH_DEBOUNCE_MS = 300;

function ToggleOption({
  styles,
  active,
  label,
  onPress,
}: {
  styles: ReturnType<typeof makeStyles>;
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.toggleOption, active && styles.toggleOptionActive]}
      onPress={onPress}
    >
      <Text style={[styles.toggleOptionText, active && styles.toggleOptionTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function DailyPnlChart({
  points,
  styles,
  mode,
  noData,
}: {
  points: SnapshotPoint[];
  styles: ReturnType<typeof makeStyles>;
  mode: "dark" | "light";
  noData: string;
}) {
  if (points.length === 0) {
    return <Text style={styles.emptyText}>{noData}</Text>;
  }

  const values = points.map((p) => p.pnl_abs);
  const maxValue = Math.max(...values, 0);
  const minValue = Math.min(...values, 0);
  const range = maxValue - minValue || 1;

  return (
    <View style={styles.chartRow}>
      {points.map((point) => {
        const heightPct = Math.max(((point.pnl_abs - minValue) / range) * 100, 3);
        return (
          <View key={point.snapshot_date} style={styles.chartBarTrack}>
            <View
              style={[
                styles.chartBar,
                { height: `${heightPct}%`, backgroundColor: signColor(point.pnl_abs, mode) },
              ]}
            />
          </View>
        );
      })}
    </View>
  );
}

export function SimulationScreen({ onBack }: { onBack: () => void }) {
  const { locale, messages } = useLocale();
  const t = messages.simulation;
  const { colors, mode } = useTheme();
  const styles = makeStyles(colors);

  const [simulations, setSimulations] = useState<Simulation[] | null>(null);
  const [histories, setHistories] = useState<Record<string, SnapshotPoint[]>>({});
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newBudget, setNewBudget] = useState("");
  const [creating, setCreating] = useState(false);
  const [openFormFor, setOpenFormFor] = useState<string | null>(null);

  function loadHistories(list: Simulation[]) {
    for (const simulation of list) {
      fetchHistory(simulation.id)
        .then((h) => setHistories((prev) => ({ ...prev, [simulation.id]: h.history })))
        .catch(() => {
          // Best-effort — the simulation card still works without its P&L history.
        });
    }
  }

  async function load() {
    try {
      const data = await fetchSimulations();
      setSimulations(data.simulations);
      setWarnings(data.warnings);
      setError(null);
      loadHistories(data.simulations);
    } catch {
      setError(t.loadError);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function initialLoad() {
      try {
        const data = await fetchSimulations();
        if (!cancelled) {
          setSimulations(data.simulations);
          setWarnings(data.warnings);
          setError(null);
          loadHistories(data.simulations);
        }
      } catch {
        if (!cancelled) setError(t.loadError);
      }
    }

    initialLoad();
    return () => {
      cancelled = true;
    };
  }, [t.loadError]);

  async function handleCreate() {
    const name = newName.trim();
    const budget = Number(newBudget);
    if (!name || budget <= 0) return;
    setCreating(true);
    try {
      await createSimulation(name, budget);
      setNewName("");
      setNewBudget("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.loadError);
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string) {
    setSimulations((prev) => prev?.filter((s) => s.id !== id) ?? null);
    try {
      await deleteSimulation(id);
    } catch {
      await load();
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TouchableOpacity onPress={onBack}>
        <Text style={styles.backLink}>{t.backToDashboard}</Text>
      </TouchableOpacity>
      <Text style={styles.title}>{t.title}</Text>

      <View style={styles.createRow}>
        <TextInput
          style={styles.input}
          placeholder={t.newSimulationPlaceholder}
          placeholderTextColor={colors.textTertiary}
          value={newName}
          onChangeText={setNewName}
        />
      </View>
      <View style={styles.createRow}>
        <TextInput
          style={styles.input}
          placeholder={t.budgetPlaceholder}
          placeholderTextColor={colors.textTertiary}
          value={newBudget}
          onChangeText={setNewBudget}
          keyboardType="numeric"
        />
        <TouchableOpacity
          style={[
            styles.createButton,
            (creating || !newName.trim() || !(Number(newBudget) > 0)) && styles.buttonDisabled,
          ]}
          onPress={handleCreate}
          disabled={creating || !newName.trim() || !(Number(newBudget) > 0)}
        >
          <Text style={styles.createButtonText}>{t.createSimulationButton}</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.hint}>{t.realTimeExecutionNote}</Text>

      {error && <Text style={styles.error}>{error}</Text>}
      {warnings.map((warning) => (
        <Text key={warning} style={styles.warning}>
          {warning}
        </Text>
      ))}
      {simulations === null && !error && <ActivityIndicator color={colors.accent} />}

      {simulations !== null && simulations.length === 0 && (
        <View style={styles.card}>
          <Text style={styles.emptyText}>{t.noSimulations}</Text>
          <Text style={styles.emptyHint}>{t.noSimulationsHint}</Text>
        </View>
      )}

      {simulations?.map((simulation) => (
        <View key={simulation.id} style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{simulation.name}</Text>
              <View style={styles.totalsRow}>
                <Text style={styles.totalValue}>
                  {t.totalEquityLabel}: {formatPrice(simulation.total_equity, "USD", locale)}
                </Text>
                {simulation.total_pnl_pct !== null && (
                  <Text style={{ color: signColor(simulation.total_pnl_abs, mode), fontSize: 12 }}>
                    {formatPrice(simulation.total_pnl_abs, "USD", locale)} (
                    {formatSignedPercent(simulation.total_pnl_pct, locale)})
                  </Text>
                )}
              </View>
              <Text style={styles.totalValue}>
                {t.cashBalanceLabel}: {formatPrice(simulation.cash_balance, "USD", locale)}
              </Text>
            </View>
            <TouchableOpacity onPress={() => handleDelete(simulation.id)}>
              <Text style={styles.deleteLink}>{t.deleteSimulationButton}</Text>
            </TouchableOpacity>
          </View>

          {simulation.positions.length === 0 ? (
            <Text style={styles.emptyText}>{t.emptyPositions}</Text>
          ) : (
            simulation.positions.map((position) => (
              <View key={position.id} style={styles.positionRow}>
                <View style={styles.positionHeader}>
                  <Text style={styles.exchangeBadge}>{position.exchange}</Text>
                  <Text style={styles.itemSymbol}>{position.symbol}</Text>
                </View>
                <Text style={styles.positionMeta}>
                  {t.columnQuantity}: {position.quantity} · {t.columnAvgCost}:{" "}
                  {formatPrice(position.avg_cost, "USD", locale)}
                </Text>
                {position.market_value !== null && position.pnl_abs !== null && position.pnl_pct !== null ? (
                  <Text style={{ color: signColor(position.pnl_abs, mode), fontSize: 12 }}>
                    {formatPrice(position.market_value, "USD", locale)} · {formatPrice(position.pnl_abs, "USD", locale)} (
                    {formatSignedPercent(position.pnl_pct, locale)})
                  </Text>
                ) : (
                  <Text style={styles.emptyText}>{t.priceUnavailable}</Text>
                )}
              </View>
            ))
          )}

          <View style={styles.historySection}>
            <Text style={styles.formTitle}>{t.historyTitle}</Text>
            <DailyPnlChart
              points={histories[simulation.id] ?? []}
              styles={styles}
              mode={mode}
              noData={t.noHistoryYet}
            />
          </View>

          {openFormFor === simulation.id ? (
            <PlaceOrderForm
              colors={colors}
              messages={t}
              onCancel={() => setOpenFormFor(null)}
              onSubmit={async (order) => {
                await placeOrder(simulation.id, order);
                setOpenFormFor(null);
                await load();
              }}
            />
          ) : (
            <TouchableOpacity
              style={styles.addTransactionButton}
              onPress={() => setOpenFormFor(simulation.id)}
            >
              <Text style={styles.addTransactionButtonText}>{t.placeOrderButton}</Text>
            </TouchableOpacity>
          )}
        </View>
      ))}
    </ScrollView>
  );
}

function PlaceOrderForm({
  colors,
  messages,
  onCancel,
  onSubmit,
}: {
  colors: ThemeColors;
  messages: ReturnType<typeof useLocale>["messages"]["simulation"];
  onCancel: () => void;
  onSubmit: (order: {
    symbol: string;
    exchange: string;
    quantity: number;
    side: "buy" | "sell";
  }) => Promise<void>;
}) {
  const t = messages;
  const styles = makeStyles(colors);
  const [symbol, setSymbol] = useState("");
  const [exchange, setExchange] = useState<"US" | "BIST">("US");
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [quantity, setQuantity] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [suggestions, setSuggestions] = useState<SymbolResult[]>([]);
  const [searchingSymbol, setSearchingSymbol] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    const trimmed = symbol.trim();
    if (!trimmed) {
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(async () => {
      setSearchingSymbol(true);
      try {
        const apiUrl = process.env.EXPO_PUBLIC_API_URL;
        const response = await fetch(
          `${apiUrl}/symbols/search?q=${encodeURIComponent(trimmed)}`,
          { signal: controller.signal }
        );
        if (!response.ok) throw new Error("Search request failed");
        const data: { results: SymbolResult[] } = await response.json();
        setSuggestions(data.results);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
        setSuggestions([]);
      } finally {
        if (!controller.signal.aborted) setSearchingSymbol(false);
      }
    }, SYMBOL_SEARCH_DEBOUNCE_MS);

    return () => {
      controller.abort();
      clearTimeout(timeoutId);
    };
  }, [symbol]);

  function selectSuggestion(result: SymbolResult) {
    setSymbol(result.symbol);
    setExchange(result.exchange === "BIST" ? "BIST" : "US");
    setSuggestions([]);
    setShowSuggestions(false);
  }

  async function handleSubmit() {
    const parsedQuantity = Number(quantity);
    if (!symbol.trim() || parsedQuantity <= 0) return;

    setSaving(true);
    setError(null);
    try {
      await onSubmit({
        symbol: symbol.trim().toUpperCase(),
        exchange,
        quantity: parsedQuantity,
        side,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : t.loadError);
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.form}>
      <Text style={styles.formTitle}>{t.formTitle}</Text>
      <View>
        <TextInput
          style={styles.input}
          placeholder={t.symbolPlaceholder}
          placeholderTextColor={colors.textTertiary}
          value={symbol}
          onChangeText={(value) => {
            setSymbol(value);
            setShowSuggestions(true);
            if (!value.trim()) setSuggestions([]);
          }}
          onFocus={() => setShowSuggestions(true)}
          autoCapitalize="characters"
          autoCorrect={false}
        />
        {searchingSymbol && <ActivityIndicator style={styles.symbolSearching} color={colors.accent} />}
        {showSuggestions && suggestions.length > 0 && (
          <View style={styles.suggestionList}>
            {suggestions.slice(0, 6).map((result) => (
              <TouchableOpacity
                key={`${result.exchange}-${result.symbol}`}
                style={styles.suggestionRow}
                onPress={() => selectSuggestion(result)}
              >
                <Text style={styles.exchangeBadge}>{result.exchange}</Text>
                <Text style={styles.suggestionSymbol}>{result.symbol}</Text>
                <Text style={styles.suggestionName} numberOfLines={1}>
                  {result.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
      <View style={styles.toggleRow}>
        <ToggleOption
          styles={styles}
          active={exchange === "US"}
          label={t.exchangeUs}
          onPress={() => setExchange("US")}
        />
        {BIST_ENABLED && (
          <ToggleOption
            styles={styles}
            active={exchange === "BIST"}
            label={t.exchangeBist}
            onPress={() => setExchange("BIST")}
          />
        )}
      </View>
      <View style={styles.toggleRow}>
        <ToggleOption
          styles={styles}
          active={side === "buy"}
          label={t.sideBuy}
          onPress={() => setSide("buy")}
        />
        <ToggleOption
          styles={styles}
          active={side === "sell"}
          label={t.sideSell}
          onPress={() => setSide("sell")}
        />
      </View>
      <TextInput
        style={styles.input}
        placeholder={t.quantityLabel}
        placeholderTextColor={colors.textTertiary}
        value={quantity}
        onChangeText={setQuantity}
        keyboardType="numeric"
      />
      {error && <Text style={styles.error}>{error}</Text>}
      <View style={styles.toggleRow}>
        <TouchableOpacity
          style={[styles.createButton, saving && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={saving}
        >
          <Text style={styles.createButtonText}>{saving ? t.saving : t.saveButton}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
          <Text style={styles.deleteLink}>{t.cancelButton}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    content: {
      gap: spacing[3],
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
    createRow: {
      flexDirection: "row",
      gap: spacing[2],
    },
    input: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.borderDefault,
      backgroundColor: colors.surfaceElevated,
      borderRadius: radius.md,
      paddingHorizontal: spacing[3],
      paddingVertical: spacing[2],
      color: colors.textPrimary,
    },
    createButton: {
      flex: 1,
      backgroundColor: colors.accent,
      borderRadius: radius.md,
      paddingVertical: spacing[2],
      alignItems: "center",
      justifyContent: "center",
    },
    cancelButton: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    buttonDisabled: {
      opacity: 0.5,
    },
    createButtonText: {
      color: colors.accentText,
      fontWeight: "600",
    },
    hint: {
      color: colors.textTertiary,
      fontSize: 11,
    },
    error: {
      color: colors.negative,
      fontSize: 13,
    },
    warning: {
      color: colors.warning,
      fontSize: 12,
    },
    card: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      borderRadius: radius.lg,
      padding: spacing[4],
      gap: spacing[2],
    },
    cardHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: spacing[1],
    },
    cardTitle: {
      fontSize: 15,
      fontWeight: "700",
      color: colors.textPrimary,
    },
    totalsRow: {
      flexDirection: "row",
      gap: spacing[2],
      marginTop: 2,
    },
    totalValue: {
      fontSize: 12,
      color: colors.textTertiary,
    },
    deleteLink: {
      color: colors.textTertiary,
      fontSize: 12,
    },
    emptyText: {
      color: colors.textTertiary,
      fontSize: 13,
    },
    emptyHint: {
      color: colors.textTertiary,
      fontSize: 12,
      marginTop: 2,
    },
    positionRow: {
      paddingVertical: spacing[2],
      borderTopWidth: 1,
      borderTopColor: colors.borderSubtle,
      gap: 2,
    },
    positionHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing[2],
    },
    positionMeta: {
      fontSize: 12,
      color: colors.textSecondary,
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
    itemSymbol: {
      fontWeight: "700",
      color: colors.textPrimary,
    },
    historySection: {
      marginTop: spacing[2],
      borderTopWidth: 1,
      borderTopColor: colors.borderSubtle,
      paddingTop: spacing[3],
      gap: spacing[2],
    },
    chartRow: {
      flexDirection: "row",
      alignItems: "flex-end",
      height: 60,
      gap: 2,
    },
    chartBarTrack: {
      flex: 1,
      height: "100%",
      justifyContent: "flex-end",
    },
    chartBar: {
      width: "100%",
      borderRadius: 2,
    },
    addTransactionButton: {
      marginTop: spacing[2],
      borderWidth: 1,
      borderColor: colors.borderDefault,
      borderRadius: radius.md,
      paddingVertical: spacing[2],
      alignItems: "center",
    },
    addTransactionButtonText: {
      color: colors.textSecondary,
      fontWeight: "600",
      fontSize: 13,
    },
    form: {
      marginTop: spacing[2],
      gap: spacing[2],
      borderTopWidth: 1,
      borderTopColor: colors.borderSubtle,
      paddingTop: spacing[3],
    },
    formTitle: {
      fontSize: 11,
      fontWeight: "700",
      textTransform: "uppercase",
      color: colors.textTertiary,
    },
    toggleRow: {
      flexDirection: "row",
      gap: spacing[2],
    },
    toggleOption: {
      flex: 1,
      paddingVertical: spacing[2],
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.borderDefault,
      alignItems: "center",
    },
    toggleOptionActive: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    toggleOptionText: {
      color: colors.textSecondary,
      fontWeight: "600",
      fontSize: 13,
    },
    toggleOptionTextActive: {
      color: colors.accentText,
    },
    symbolSearching: {
      marginTop: spacing[1],
      alignSelf: "flex-start",
    },
    suggestionList: {
      marginTop: spacing[1],
      borderWidth: 1,
      borderColor: colors.borderDefault,
      borderRadius: radius.md,
      backgroundColor: colors.surfaceElevated,
      overflow: "hidden",
    },
    suggestionRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing[2],
      paddingHorizontal: spacing[3],
      paddingVertical: spacing[2],
      borderBottomWidth: 1,
      borderBottomColor: colors.borderSubtle,
    },
    suggestionSymbol: {
      fontWeight: "700",
      color: colors.textPrimary,
    },
    suggestionName: {
      flexShrink: 1,
      color: colors.textSecondary,
      fontSize: 12,
    },
  });
}
