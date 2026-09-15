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
import { useLocale } from "../lib/locale-context";
import { useTheme, radius, spacing, type ThemeColors } from "../lib/theme";
import {
  createWatchlist,
  deleteWatchlist,
  fetchWatchlists,
  removeWatchlistItem,
  type Watchlist,
} from "../lib/watchlists-client";

type SymbolResult = { symbol: string; name: string; exchange: string };

export function WatchlistScreen({
  onBack,
  onSelectResult,
}: {
  onBack: () => void;
  onSelectResult: (result: SymbolResult) => void;
}) {
  const { messages } = useLocale();
  const t = messages.watchlist;
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  const [watchlists, setWatchlists] = useState<Watchlist[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newListName, setNewListName] = useState("");
  const [creating, setCreating] = useState(false);

  async function load() {
    try {
      setWatchlists(await fetchWatchlists());
      setError(null);
    } catch {
      setError(t.loadError);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function initialLoad() {
      try {
        const data = await fetchWatchlists();
        if (!cancelled) {
          setWatchlists(data);
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
    const name = newListName.trim();
    if (!name) return;
    setCreating(true);
    try {
      await createWatchlist(name);
      setNewListName("");
      await load();
    } catch {
      setError(t.loadError);
    } finally {
      setCreating(false);
    }
  }

  async function handleDeleteList(id: string) {
    setWatchlists((prev) => prev?.filter((w) => w.id !== id) ?? null);
    try {
      await deleteWatchlist(id);
    } catch {
      await load();
    }
  }

  async function handleRemoveItem(watchlistId: string, itemId: string) {
    setWatchlists(
      (prev) =>
        prev?.map((w) =>
          w.id === watchlistId ? { ...w, items: w.items.filter((i) => i.id !== itemId) } : w
        ) ?? null
    );
    try {
      await removeWatchlistItem(watchlistId, itemId);
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
          placeholder={t.newListPlaceholder}
          placeholderTextColor={colors.textTertiary}
          value={newListName}
          onChangeText={setNewListName}
        />
        <TouchableOpacity
          style={[styles.createButton, (creating || !newListName.trim()) && styles.buttonDisabled]}
          onPress={handleCreate}
          disabled={creating || !newListName.trim()}
        >
          <Text style={styles.createButtonText}>{t.createListButton}</Text>
        </TouchableOpacity>
      </View>

      {error && <Text style={styles.error}>{error}</Text>}
      {watchlists === null && !error && <ActivityIndicator color={colors.accent} />}

      {watchlists !== null && watchlists.length === 0 && (
        <View style={styles.card}>
          <Text style={styles.emptyText}>{t.noLists}</Text>
          <Text style={styles.emptyHint}>{t.noListsHint}</Text>
        </View>
      )}

      {watchlists?.map((watchlist) => (
        <View key={watchlist.id} style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>{watchlist.name}</Text>
            <TouchableOpacity onPress={() => handleDeleteList(watchlist.id)}>
              <Text style={styles.deleteLink}>{t.deleteListButton}</Text>
            </TouchableOpacity>
          </View>

          {watchlist.items.length === 0 ? (
            <Text style={styles.emptyText}>{t.emptyList}</Text>
          ) : (
            watchlist.items.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.itemRow}
                onPress={() =>
                  onSelectResult({
                    symbol: item.symbol,
                    name: item.name ?? item.symbol,
                    exchange: item.exchange,
                  })
                }
              >
                <Text style={styles.exchangeBadge}>{item.exchange}</Text>
                <Text style={styles.itemSymbol}>{item.symbol}</Text>
                <Text style={styles.itemName} numberOfLines={1}>
                  {item.name}
                </Text>
                <TouchableOpacity
                  onPress={() => handleRemoveItem(watchlist.id, item.id)}
                  hitSlop={8}
                >
                  <Text style={styles.removeLink}>✕</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            ))
          )}
        </View>
      ))}
    </ScrollView>
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
      backgroundColor: colors.accent,
      borderRadius: radius.md,
      paddingHorizontal: spacing[4],
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
      alignItems: "center",
      marginBottom: spacing[1],
    },
    cardTitle: {
      fontSize: 15,
      fontWeight: "700",
      color: colors.textPrimary,
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
    itemRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing[2],
      paddingVertical: spacing[2],
      borderTopWidth: 1,
      borderTopColor: colors.borderSubtle,
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
    itemName: {
      flex: 1,
      color: colors.textSecondary,
      fontSize: 13,
    },
    removeLink: {
      color: colors.textTertiary,
      paddingHorizontal: spacing[1],
    },
  });
}
