import { useEffect, useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useLocale } from "../lib/locale-context";
import { useTheme, radius, spacing, type ThemeColors } from "../lib/theme";
import {
  createAlert,
  deleteAlert,
  fetchAlerts,
  type PriceAlert,
} from "../lib/alerts-client";

export function CreatePriceAlertButton({
  symbol,
  exchange,
  name,
}: {
  symbol: string;
  exchange: string;
  name: string | null;
}) {
  const { messages } = useLocale();
  const t = messages.alerts;
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  const [visible, setVisible] = useState(false);
  const [alerts, setAlerts] = useState<PriceAlert[] | null>(null);
  const [direction, setDirection] = useState<"above" | "below">("above");
  const [threshold, setThreshold] = useState("");
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    try {
      const data = await fetchAlerts();
      setAlerts(data.alerts.filter((a) => a.symbol === symbol && a.exchange === exchange));
    } catch {
      setAlerts([]);
    }
  }

  useEffect(() => {
    if (!visible || alerts !== null) return;
    let cancelled = false;

    async function initialLoad() {
      try {
        const data = await fetchAlerts();
        if (!cancelled) {
          setAlerts(data.alerts.filter((a) => a.symbol === symbol && a.exchange === exchange));
        }
      } catch {
        if (!cancelled) setAlerts([]);
      }
    }

    initialLoad();
    return () => {
      cancelled = true;
    };
  }, [visible, alerts, symbol, exchange]);

  async function handleSave() {
    const value = Number(threshold);
    if (!value || value <= 0) return;
    setSaving(true);
    try {
      await createAlert({ symbol, exchange, name, direction, threshold: value });
      setThreshold("");
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(alertId: string) {
    setBusyId(alertId);
    try {
      await deleteAlert(alertId);
      await load();
    } finally {
      setBusyId(null);
    }
  }

  const activeCount = alerts?.filter((a) => a.status === "active").length ?? 0;

  return (
    <>
      <TouchableOpacity
        style={[styles.trigger, activeCount > 0 && styles.triggerActive]}
        onPress={() => setVisible(true)}
      >
        <Text style={[styles.triggerText, activeCount > 0 && styles.triggerTextActive]}>
          {t.createButtonLabel}
        </Text>
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
        <Pressable style={styles.backdrop} onPress={() => setVisible(false)}>
          <Pressable style={styles.sheet}>
            {alerts !== null && alerts.length > 0 && (
              <View style={styles.existingSection}>
                <Text style={styles.sheetTitle}>{t.existingForSymbol}</Text>
                {alerts.map((alert) => (
                  <View key={alert.id} style={styles.existingRow}>
                    <Text style={styles.existingRowText}>
                      {alert.direction === "above" ? t.directionAbove : t.directionBelow}{" "}
                      {alert.threshold}
                    </Text>
                    <Text style={styles.statusText}>
                      {alert.status === "triggered"
                        ? t.statusTriggered
                        : alert.unavailable
                          ? t.statusUnavailable
                          : t.statusActive}
                    </Text>
                    <TouchableOpacity
                      disabled={busyId === alert.id}
                      onPress={() => handleDelete(alert.id)}
                    >
                      <Text style={styles.deleteText}>{t.deleteButton}</Text>
                    </TouchableOpacity>
                  </View>
                ))}
                {exchange === "BIST" && (
                  <Text style={styles.hintText}>{t.bistUnavailableHint}</Text>
                )}
              </View>
            )}

            <Text style={styles.sheetTitle}>{t.formTitle}</Text>
            <View style={styles.directionRow}>
              <TouchableOpacity
                style={[styles.directionOption, direction === "above" && styles.directionOptionActive]}
                onPress={() => setDirection("above")}
              >
                <Text
                  style={[
                    styles.directionOptionText,
                    direction === "above" && styles.directionOptionTextActive,
                  ]}
                >
                  {t.directionAbove}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.directionOption, direction === "below" && styles.directionOptionActive]}
                onPress={() => setDirection("below")}
              >
                <Text
                  style={[
                    styles.directionOptionText,
                    direction === "below" && styles.directionOptionTextActive,
                  ]}
                >
                  {t.directionBelow}
                </Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.input}
              placeholder={t.thresholdPlaceholder}
              placeholderTextColor={colors.textTertiary}
              keyboardType="decimal-pad"
              value={threshold}
              onChangeText={setThreshold}
            />

            <TouchableOpacity
              style={[styles.saveButton, (!threshold || saving) && styles.buttonDisabled]}
              disabled={!threshold || saving}
              onPress={handleSave}
            >
              <Text style={styles.saveButtonText}>{saving ? t.saving : t.saveButton}</Text>
            </TouchableOpacity>
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
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.borderDefault,
      borderRadius: radius.md,
      paddingHorizontal: spacing[4],
      paddingVertical: spacing[2],
      marginBottom: spacing[3],
    },
    triggerActive: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    triggerText: {
      color: colors.textPrimary,
      fontWeight: "600",
      fontSize: 13,
    },
    triggerTextActive: {
      color: colors.accentText,
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
      gap: spacing[2],
    },
    sheetTitle: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.textTertiary,
      marginBottom: spacing[2],
    },
    existingSection: {
      borderBottomWidth: 1,
      borderBottomColor: colors.borderSubtle,
      paddingBottom: spacing[3],
      marginBottom: spacing[1],
    },
    existingRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing[2],
      paddingVertical: spacing[1],
    },
    existingRowText: {
      color: colors.textPrimary,
      fontSize: 13,
      flex: 1,
    },
    statusText: {
      color: colors.textTertiary,
      fontSize: 11,
    },
    deleteText: {
      color: colors.negative,
      fontSize: 12,
      fontWeight: "600",
    },
    hintText: {
      color: colors.warning,
      fontSize: 11,
      marginTop: spacing[1],
    },
    directionRow: {
      flexDirection: "row",
      gap: spacing[2],
    },
    directionOption: {
      flex: 1,
      alignItems: "center",
      paddingVertical: spacing[2],
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.borderDefault,
      backgroundColor: colors.surface,
    },
    directionOptionActive: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    directionOptionText: {
      color: colors.textPrimary,
      fontSize: 13,
      fontWeight: "600",
    },
    directionOptionTextActive: {
      color: colors.accentText,
    },
    input: {
      borderWidth: 1,
      borderColor: colors.borderDefault,
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      paddingHorizontal: spacing[3],
      paddingVertical: spacing[2],
      color: colors.textPrimary,
    },
    saveButton: {
      backgroundColor: colors.accent,
      borderRadius: radius.md,
      alignItems: "center",
      paddingVertical: spacing[3],
      marginTop: spacing[1],
    },
    buttonDisabled: {
      opacity: 0.5,
    },
    saveButtonText: {
      color: colors.accentText,
      fontWeight: "700",
    },
  });
}
