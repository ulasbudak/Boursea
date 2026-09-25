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
  addTransaction,
  createPortfolio,
  deletePortfolio,
  deletePosition,
  fetchPortfolios,
  type Portfolio,
} from "../lib/portfolios-client";

export function PortfolioScreen({ onBack }: { onBack: () => void }) {
  const { locale, messages } = useLocale();
  const t = messages.portfolio;
  const { colors, mode } = useTheme();
  const styles = makeStyles(colors);

  const [portfolios, setPortfolios] = useState<Portfolio[] | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [newPortfolioName, setNewPortfolioName] = useState("");
  const [creating, setCreating] = useState(false);
  const [openFormFor, setOpenFormFor] = useState<string | null>(null);

  async function load() {
    try {
      const data = await fetchPortfolios();
      setPortfolios(data.portfolios);
      setWarnings(data.warnings);
      setError(null);
    } catch {
      setError(t.loadError);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function initialLoad() {
      try {
        const data = await fetchPortfolios();
        if (!cancelled) {
          setPortfolios(data.portfolios);
          setWarnings(data.warnings);
          setError(null);
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
    const name = newPortfolioName.trim();
    if (!name) return;
    setCreating(true);
    try {
      await createPortfolio(name);
      setNewPortfolioName("");
      await load();
    } catch {
      setError(t.loadError);
    } finally {
      setCreating(false);
    }
  }

  async function handleDeletePortfolio(id: string) {
    setPortfolios((prev) => prev?.filter((p) => p.id !== id) ?? null);
    try {
      await deletePortfolio(id);
    } catch {
      await load();
    }
  }

  async function handleDeletePosition(portfolioId: string, positionId: string) {
    setPortfolios(
      (prev) =>
        prev?.map((p) =>
          p.id === portfolioId
            ? { ...p, positions: p.positions.filter((pos) => pos.id !== positionId) }
            : p
        ) ?? null
    );
    try {
      await deletePosition(portfolioId, positionId);
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
          placeholder={t.newPortfolioPlaceholder}
          placeholderTextColor={colors.textTertiary}
          value={newPortfolioName}
          onChangeText={setNewPortfolioName}
        />
        <TouchableOpacity
          style={[
            styles.createButton,
            (creating || !newPortfolioName.trim()) && styles.buttonDisabled,
          ]}
          onPress={handleCreate}
          disabled={creating || !newPortfolioName.trim()}
        >
          <Text style={styles.createButtonText}>{t.createPortfolioButton}</Text>
        </TouchableOpacity>
      </View>

      {error && <Text style={styles.error}>{error}</Text>}
      {warnings.map((warning) => (
        <Text key={warning} style={styles.warning}>
          {warning}
        </Text>
      ))}
      {portfolios === null && !error && <ActivityIndicator color={colors.accent} />}

      {portfolios !== null && portfolios.length === 0 && (
        <View style={styles.card}>
          <Text style={styles.emptyText}>{t.noPortfolios}</Text>
          <Text style={styles.emptyHint}>{t.noPortfoliosHint}</Text>
        </View>
      )}

      {portfolios?.map((portfolio) => (
        <View key={portfolio.id} style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{portfolio.name}</Text>
              <View style={styles.totalsRow}>
                <Text style={styles.totalValue}>
                  {t.totalValueLabel}: {formatPrice(portfolio.total_market_value, "USD", locale)}
                </Text>
                {portfolio.total_pnl_pct !== null && (
                  <Text style={{ color: signColor(portfolio.total_pnl_abs, mode), fontSize: 12 }}>
                    {formatPrice(portfolio.total_pnl_abs, "USD", locale)} (
                    {formatSignedPercent(portfolio.total_pnl_pct, locale)})
                  </Text>
                )}
              </View>
            </View>
            <TouchableOpacity onPress={() => handleDeletePortfolio(portfolio.id)}>
              <Text style={styles.deleteLink}>{t.deletePortfolioButton}</Text>
            </TouchableOpacity>
          </View>

          {portfolio.positions.length === 0 ? (
            <Text style={styles.emptyText}>{t.emptyPortfolio}</Text>
          ) : (
            portfolio.positions.map((position) => (
              <View key={position.id} style={styles.positionRow}>
                <View style={styles.positionHeader}>
                  <Text style={styles.exchangeBadge}>{position.exchange}</Text>
                  <Text style={styles.itemSymbol}>{position.symbol}</Text>
                  <TouchableOpacity
                    onPress={() => handleDeletePosition(portfolio.id, position.id)}
                    hitSlop={8}
                    style={{ marginLeft: "auto" }}
                  >
                    <Text style={styles.removeLink}>✕</Text>
                  </TouchableOpacity>
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
                  <Text style={styles.emptyText}>
                    {position.exchange === "BIST" ? t.bistUnavailableHint : t.priceUnavailable}
                  </Text>
                )}
              </View>
            ))
          )}

          {openFormFor === portfolio.id ? (
            <AddTransactionForm
              colors={colors}
              messages={t}
              onCancel={() => setOpenFormFor(null)}
              onSubmit={async (transaction) => {
                await addTransaction(portfolio.id, transaction);
                setOpenFormFor(null);
                await load();
              }}
            />
          ) : (
            <TouchableOpacity
              style={styles.addTransactionButton}
              onPress={() => setOpenFormFor(portfolio.id)}
            >
              <Text style={styles.addTransactionButtonText}>{t.addTransactionButton}</Text>
            </TouchableOpacity>
          )}
        </View>
      ))}
    </ScrollView>
  );
}

function AddTransactionForm({
  colors,
  messages,
  onCancel,
  onSubmit,
}: {
  colors: ThemeColors;
  messages: ReturnType<typeof useLocale>["messages"]["portfolio"];
  onCancel: () => void;
  onSubmit: (transaction: {
    symbol: string;
    exchange: string;
    name?: string | null;
    quantity: number;
    price: number;
    side: "buy" | "sell";
  }) => Promise<void>;
}) {
  const t = messages;
  const styles = makeStyles(colors);
  const [symbol, setSymbol] = useState("");
  const [exchange, setExchange] = useState<"US" | "BIST">("US");
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    const parsedQuantity = Number(quantity);
    const parsedPrice = Number(price);
    if (!symbol.trim() || parsedQuantity <= 0 || parsedPrice <= 0) return;

    setSaving(true);
    setError(null);
    try {
      await onSubmit({
        symbol: symbol.trim().toUpperCase(),
        exchange,
        quantity: parsedQuantity,
        price: parsedPrice,
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
      <TextInput
        style={styles.input}
        placeholder={t.symbolPlaceholder}
        placeholderTextColor={colors.textTertiary}
        value={symbol}
        onChangeText={setSymbol}
        autoCapitalize="characters"
      />
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
      <TextInput
        style={styles.input}
        placeholder={t.priceLabel}
        placeholderTextColor={colors.textTertiary}
        value={price}
        onChangeText={setPrice}
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
    removeLink: {
      color: colors.textTertiary,
      paddingHorizontal: spacing[1],
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
  });
}
