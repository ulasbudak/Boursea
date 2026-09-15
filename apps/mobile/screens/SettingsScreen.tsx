import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { Locale } from "@trendus/shared";
import { useLocale } from "../lib/locale-context";

export function SettingsScreen({ onBack }: { onBack: () => void }) {
  const { locale, messages, setLocale } = useLocale();

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
      <Text style={styles.label}>{messages.settings.language}</Text>
      <View style={styles.optionRow}>
        {renderOption("tr", messages.settings.turkish)}
        {renderOption("en", messages.settings.english)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: 12,
  },
  backLink: {
    color: "#111",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
  },
  label: {
    color: "#555",
  },
  optionRow: {
    flexDirection: "row",
    gap: 12,
  },
  option: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ccc",
    alignItems: "center",
  },
  optionActive: {
    backgroundColor: "#111",
    borderColor: "#111",
  },
  optionText: {
    fontWeight: "600",
    color: "#111",
  },
  optionTextActive: {
    color: "#fff",
  },
});
