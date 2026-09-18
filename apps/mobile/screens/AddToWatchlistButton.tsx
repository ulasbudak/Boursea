import { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useLocale } from "../lib/locale-context";
import { useTheme, radius, spacing, type ThemeColors } from "../lib/theme";
import {
  addWatchlistItem,
  createWatchlist,
  fetchWatchlists,
  removeWatchlistItem,
  type Watchlist,
} from "../lib/watchlists-client";

export function AddToWatchlistButton({
  symbol,
  exchange,
  name,
}: {
  symbol: string;
  exchange: string;
  name: string | null;
}) {
  const { messages } = useLocale();
  const t = messages.watchlist;
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  const [visible, setVisible] = useState(false);
  const [watchlists, setWatchlists] = useState<Watchlist[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [newListName, setNewListName] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setWatchlists(await fetchWatchlists());
    } catch {
      setWatchlists([]);
    }
  }

  useEffect(() => {
    if (!visible || watchlists !== null) return;
    let cancelled = false;

    async function initialLoad() {
      try {
        const data = await fetchWatchlists();
        if (!cancelled) setWatchlists(data);
      } catch {
        if (!cancelled) setWatchlists([]);
      }
    }

    initialLoad();
    return () => {
      cancelled = true;
    };
  }, [visible, watchlists]);

  function itemFor(watchlist: Watchlist) {
    return watchlist.items.find((i) => i.symbol === symbol && i.exchange === exchange);
  }

  const memberCount = watchlists?.filter((w) => itemFor(w)).length ?? 0;

  async function toggle(watchlist: Watchlist) {
    const existing = itemFor(watchlist);
    setBusyId(watchlist.id);
    setError(null);
    try {
      if (existing) {
        await removeWatchlistItem(watchlist.id, existing.id);
      } else {
        await addWatchlistItem(watchlist.id, { symbol, exchange, name });
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyId(null);
    }
  }

  async function handleCreateAndAdd() {
    const listName = newListName.trim();
    if (!listName) return;
    setBusyId("__new__");
    setError(null);
    try {
      const created = await createWatchlist(listName);
      await addWatchlistItem(created.id, { symbol, exchange, name });
      setNewListName("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <TouchableOpacity
        style={[styles.trigger, memberCount > 0 && styles.triggerActive]}
        onPress={() => setVisible(true)}
      >
        <Text style={[styles.triggerText, memberCount > 0 && styles.triggerTextActive]}>
          {memberCount > 0 ? t.addedLabel : t.addButtonLabel}
        </Text>
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
        <Pressable style={styles.backdrop} onPress={() => setVisible(false)}>
          <Pressable style={styles.sheet}>
            <Text style={styles.sheetTitle}>{t.inListsLabel}</Text>

            {watchlists === null && <Text style={styles.hintText}>{t.loading}</Text>}
            {watchlists !== null && watchlists.length === 0 && (
              <Text style={styles.hintText}>{t.noLists}</Text>
            )}

            {watchlists?.map((watchlist) => {
              const checked = Boolean(itemFor(watchlist));
              return (
                <TouchableOpacity
                  key={watchlist.id}
                  style={styles.row}
                  disabled={busyId === watchlist.id}
                  onPress={() => toggle(watchlist)}
                >
                  <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
                    {checked && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                  <Text style={styles.rowText}>{watchlist.name}</Text>
                </TouchableOpacity>
              );
            })}

            {error && <Text style={styles.errorText}>{error}</Text>}

            <View style={styles.newListRow}>
              <TextInput
                style={styles.input}
                placeholder={t.newListInlineLabel}
                placeholderTextColor={colors.textTertiary}
                value={newListName}
                onChangeText={setNewListName}
              />
              <TouchableOpacity
                style={[
                  styles.addButton,
                  (!newListName.trim() || busyId === "__new__") && styles.buttonDisabled,
                ]}
                disabled={!newListName.trim() || busyId === "__new__"}
                onPress={handleCreateAndAdd}
              >
                <Text style={styles.addButtonText}>+</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    trigger: {
      alignSelf: "flex-start",
      backgroundColor: colors.accent,
      borderRadius: radius.md,
      paddingHorizontal: spacing[4],
      paddingVertical: spacing[2],
      marginBottom: spacing[3],
    },
    triggerActive: {
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.borderDefault,
    },
    triggerText: {
      color: colors.accentText,
      fontWeight: "600",
      fontSize: 13,
    },
    triggerTextActive: {
      color: colors.textPrimary,
    },
    backdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "flex-end",
    },
    sheet: {
      backgroundColor: colors.surfaceElevated,
      borderTopLeftRadius: radius.lg,
      borderTopRightRadius: radius.lg,
      padding: spacing[4],
      gap: spacing[1],
    },
    sheetTitle: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.textTertiary,
      marginBottom: spacing[2],
    },
    hintText: {
      color: colors.textTertiary,
      fontSize: 13,
      marginBottom: spacing[2],
    },
    errorText: {
      color: colors.negative,
      fontSize: 12,
      marginTop: spacing[1],
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing[2],
      paddingVertical: spacing[2],
    },
    checkbox: {
      width: 20,
      height: 20,
      borderRadius: 5,
      borderWidth: 1,
      borderColor: colors.borderDefault,
      alignItems: "center",
      justifyContent: "center",
    },
    checkboxChecked: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    checkmark: {
      color: colors.accentText,
      fontSize: 12,
      fontWeight: "700",
    },
    rowText: {
      color: colors.textPrimary,
      fontSize: 14,
    },
    newListRow: {
      flexDirection: "row",
      gap: spacing[2],
      marginTop: spacing[2],
      paddingTop: spacing[2],
      borderTopWidth: 1,
      borderTopColor: colors.borderSubtle,
    },
    input: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.borderDefault,
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      paddingHorizontal: spacing[3],
      paddingVertical: spacing[2],
      color: colors.textPrimary,
    },
    addButton: {
      width: 40,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.accent,
      borderRadius: radius.md,
    },
    buttonDisabled: {
      opacity: 0.5,
    },
    addButtonText: {
      color: colors.accentText,
      fontSize: 18,
      fontWeight: "700",
    },
  });
}
