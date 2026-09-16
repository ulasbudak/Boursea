import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { Locale } from "@trendus/shared";
import { useLocale } from "../lib/locale-context";
import { useTheme, radius, spacing, type ThemeColors } from "../lib/theme";
import {
  fetchNotificationSettings,
  updateNotificationSettings,
} from "../lib/notification-settings-client";
import { registerForPushNotificationsAsync } from "../lib/push-notifications";

export function SettingsScreen({ onBack }: { onBack: () => void }) {
  const { locale, messages, setLocale } = useLocale();
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  const [pushEnabled, setPushEnabled] = useState<boolean | null>(null);
  const [emailEnabled, setEmailEnabled] = useState<boolean | null>(null);
  const [hasPushToken, setHasPushToken] = useState(false);
  const [requestingPush, setRequestingPush] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function initialLoad() {
      try {
        const settings = await fetchNotificationSettings();
        if (!cancelled) {
          setPushEnabled(settings.push_enabled);
          setEmailEnabled(settings.email_enabled);
          setHasPushToken(Boolean(settings.expo_push_token));
        }
      } catch {
        if (!cancelled) setError(messages.settings.notificationSaveError);
      }
    }

    initialLoad();
    return () => {
      cancelled = true;
    };
  }, [messages.settings.notificationSaveError]);

  function renderOption(value: Locale, label: string) {
    const isActive = locale === value;
    return (
      <TouchableOpacity
        style={[styles.option, isActive && styles.optionActive]}
        onPress={() => setLocale(value)}
        disabled={isActive}
      >
        <Text style={[styles.optionText, isActive && styles.optionTextActive]}>{label}</Text>
      </TouchableOpacity>
    );
  }

  async function toggleEmail() {
    if (emailEnabled === null) return;
    const next = !emailEnabled;
    setEmailEnabled(next);
    setError(null);
    try {
      await updateNotificationSettings({ email_enabled: next });
    } catch {
      setEmailEnabled(!next);
      setError(messages.settings.notificationSaveError);
    }
  }

  async function toggleOrEnablePush() {
    setError(null);
    if (!hasPushToken) {
      setRequestingPush(true);
      try {
        const token = await registerForPushNotificationsAsync();
        if (token) {
          await updateNotificationSettings({ expo_push_token: token, push_enabled: true });
          setHasPushToken(true);
          setPushEnabled(true);
        } else {
          setError(messages.settings.notificationSaveError);
        }
      } catch {
        setError(messages.settings.notificationSaveError);
      } finally {
        setRequestingPush(false);
      }
      return;
    }

    if (pushEnabled === null) return;
    const next = !pushEnabled;
    setPushEnabled(next);
    try {
      await updateNotificationSettings({ push_enabled: next });
    } catch {
      setPushEnabled(!next);
      setError(messages.settings.notificationSaveError);
    }
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={onBack}>
        <Text style={styles.backLink}>{messages.settings.backToDashboard}</Text>
      </TouchableOpacity>
      <Text style={styles.title}>{messages.settings.title}</Text>
      <View style={styles.card}>
        <Text style={styles.label}>{messages.settings.language}</Text>
        <View style={styles.optionRow}>
          {renderOption("tr", messages.settings.turkish)}
          {renderOption("en", messages.settings.english)}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>{messages.settings.notificationsTitle}</Text>

        <View style={styles.notificationRow}>
          <Text style={styles.notificationLabel}>{messages.settings.emailNotificationsLabel}</Text>
          <TouchableOpacity
            style={[styles.toggle, emailEnabled && styles.toggleActive]}
            onPress={toggleEmail}
            disabled={emailEnabled === null}
          >
            <Text style={[styles.toggleText, emailEnabled && styles.toggleTextActive]}>
              {emailEnabled === null ? "…" : emailEnabled ? messages.settings.on : messages.settings.off}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.notificationRow}>
          <Text style={styles.notificationLabel}>{messages.settings.pushNotificationsLabel}</Text>
          {requestingPush ? (
            <ActivityIndicator color={colors.accent} />
          ) : (
            <TouchableOpacity
              style={[styles.toggle, hasPushToken && pushEnabled && styles.toggleActive]}
              onPress={toggleOrEnablePush}
            >
              <Text
                style={[
                  styles.toggleText,
                  hasPushToken && pushEnabled && styles.toggleTextActive,
                ]}
              >
                {!hasPushToken
                  ? messages.settings.pushEnableButton
                  : pushEnabled
                    ? messages.settings.on
                    : messages.settings.off}
              </Text>
            </TouchableOpacity>
          )}
        </View>
        {hasPushToken && pushEnabled && (
          <Text style={styles.hint}>{messages.settings.pushEnabledHint}</Text>
        )}
        {error && <Text style={styles.error}>{error}</Text>}
      </View>
    </View>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      gap: spacing[3],
      backgroundColor: colors.canvas,
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
    card: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      borderRadius: radius.lg,
      padding: spacing[4],
      gap: spacing[3],
    },
    label: {
      color: colors.textSecondary,
      fontSize: 13,
    },
    optionRow: {
      flexDirection: "row",
      gap: spacing[3],
    },
    option: {
      flex: 1,
      paddingVertical: spacing[3],
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.borderDefault,
      backgroundColor: colors.surfaceElevated,
      alignItems: "center",
    },
    optionActive: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    optionText: {
      fontWeight: "600",
      color: colors.textPrimary,
    },
    optionTextActive: {
      color: colors.accentText,
    },
    notificationRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing[2],
    },
    notificationLabel: {
      flex: 1,
      color: colors.textPrimary,
      fontSize: 14,
    },
    toggle: {
      paddingHorizontal: spacing[3],
      paddingVertical: spacing[2],
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.borderDefault,
      backgroundColor: colors.surfaceElevated,
    },
    toggleActive: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    toggleText: {
      fontSize: 12,
      fontWeight: "600",
      color: colors.textSecondary,
    },
    toggleTextActive: {
      color: colors.accentText,
    },
    hint: {
      fontSize: 11,
      color: colors.textTertiary,
    },
    error: {
      fontSize: 11,
      color: colors.negative,
    },
  });
}
