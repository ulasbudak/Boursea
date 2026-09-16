import { useEffect, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useLocale } from "../lib/locale-context";
import { useTheme, radius, spacing, type ThemeColors } from "../lib/theme";
import {
  createSignalAlert,
  deleteSignalAlert,
  fetchSignalAlerts,
  fetchSignalRules,
  type SignalAlert,
  type SignalRule,
} from "../lib/signal-alerts-client";

const TIMEFRAMES = ["intraday", "daily", "weekly", "monthly"] as const;

export function CreateSignalAlertButton({
  symbol,
  exchange,
  name,
}: {
  symbol: string;
  exchange: string;
  name: string | null;
}) {
  const { messages } = useLocale();
  const t = messages.signalAlerts;
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  const [visible, setVisible] = useState(false);
  const [rules, setRules] = useState<SignalRule[] | null>(null);
  const [alerts, setAlerts] = useState<SignalAlert[] | null>(null);
  const [ruleId, setRuleId] = useState("");
  const [timeframe, setTimeframe] = useState<(typeof TIMEFRAMES)[number]>("daily");
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    try {
      const data = await fetchSignalAlerts();
      setAlerts(data.alerts.filter((a) => a.symbol === symbol && a.exchange === exchange));
    } catch {
      setAlerts([]);
    }
  }

  useEffect(() => {
    if (!visible || rules !== null) return;
    let cancelled = false;

    async function initialLoad() {
      try {
        const ruleList = await fetchSignalRules();
        if (cancelled) return;
        setRules(ruleList);
        setRuleId((current) => current || ruleList[0]?.rule_id || "");
      } catch {
        if (!cancelled) setRules([]);
      }
    }

    initialLoad();
    return () => {
      cancelled = true;
    };
  }, [visible, rules]);

  useEffect(() => {
    if (!visible || alerts !== null) return;
    let cancelled = false;

    async function initialLoad() {
      try {
        const data = await fetchSignalAlerts();
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
    if (!ruleId) return;
    setSaving(true);
    try {
      await createSignalAlert({ symbol, exchange, name, rule_id: ruleId, timeframe });
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(alertId: string) {
    setBusyId(alertId);
    try {
      await deleteSignalAlert(alertId);
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
                    <Text style={styles.existingRowText} numberOfLines={1}>
                      {alert.rule_name}
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
            <Text style={styles.fieldLabel}>{t.ruleLabel}</Text>
            <ScrollView style={styles.ruleList} nestedScrollEnabled>
              {rules?.map((rule) => (
                <TouchableOpacity
                  key={rule.rule_id}
                  style={[styles.ruleOption, ruleId === rule.rule_id && styles.ruleOptionActive]}
                  onPress={() => setRuleId(rule.rule_id)}
                >
                  <Text
                    style={[
                      styles.ruleOptionText,
                      ruleId === rule.rule_id && styles.ruleOptionTextActive,
                    ]}
                  >
                    {rule.rule_name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.fieldLabel}>{t.timeframeLabel}</Text>
            <View style={styles.timeframeRow}>
              {TIMEFRAMES.map((tf) => (
                <TouchableOpacity
                  key={tf}
                  style={[styles.timeframeOption, timeframe === tf && styles.timeframeOptionActive]}
                  onPress={() => setTimeframe(tf)}
                >
                  <Text
                    style={[
                      styles.timeframeOptionText,
                      timeframe === tf && styles.timeframeOptionTextActive,
                    ]}
                  >
                    {tf}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.saveButton, (!ruleId || saving) && styles.buttonDisabled]}
              disabled={!ruleId || saving}
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
      gap: spacing[1],
      maxHeight: "85%",
    },
    sheetTitle: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.textTertiary,
      marginBottom: spacing[2],
    },
    fieldLabel: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: spacing[1],
      marginBottom: spacing[1],
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
    ruleList: {
      maxHeight: 160,
      borderWidth: 1,
      borderColor: colors.borderDefault,
      borderRadius: radius.md,
    },
    ruleOption: {
      paddingHorizontal: spacing[3],
      paddingVertical: spacing[2],
      borderBottomWidth: 1,
      borderBottomColor: colors.borderSubtle,
    },
    ruleOptionActive: {
      backgroundColor: colors.accent,
    },
    ruleOptionText: {
      color: colors.textPrimary,
      fontSize: 13,
    },
    ruleOptionTextActive: {
      color: colors.accentText,
      fontWeight: "600",
    },
    timeframeRow: {
      flexDirection: "row",
      gap: spacing[2],
    },
    timeframeOption: {
      flex: 1,
      alignItems: "center",
      paddingVertical: spacing[2],
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.borderDefault,
      backgroundColor: colors.surface,
    },
    timeframeOptionActive: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    timeframeOptionText: {
      color: colors.textPrimary,
      fontSize: 12,
      fontWeight: "600",
    },
    timeframeOptionTextActive: {
      color: colors.accentText,
    },
    saveButton: {
      backgroundColor: colors.accent,
      borderRadius: radius.md,
      alignItems: "center",
      paddingVertical: spacing[3],
      marginTop: spacing[2],
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
