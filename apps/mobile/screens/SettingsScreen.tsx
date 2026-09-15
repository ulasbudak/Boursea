import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { Locale } from "@trendus/shared";
import { useLocale } from "../lib/locale-context";
import { useTheme, radius, spacing, type ThemeColors } from "../lib/theme";

export function SettingsScreen({ onBack }: { onBack: () => void }) {
  const { locale, messages, setLocale } = useLocale();
  const { colors } = useTheme();
  const styles = makeStyles(colors);

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
  });
}
