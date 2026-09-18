import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useLocale } from "../lib/locale-context";
import { useTheme, radius, spacing, type ThemeColors } from "../lib/theme";
import { deleteNote, fetchNote, saveNote } from "../lib/notes-client";

export function StockNoteCard({ symbol, exchange }: { symbol: string; exchange: string }) {
  const { messages } = useLocale();
  const t = messages.notes;
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  const [note, setNote] = useState("");
  const [hasSavedNote, setHasSavedNote] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function initialLoad() {
      try {
        const existing = await fetchNote(symbol, exchange);
        if (!cancelled && existing) {
          setNote(existing.note);
          setHasSavedNote(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    initialLoad();
    return () => {
      cancelled = true;
    };
  }, [symbol, exchange]);

  async function handleSave() {
    if (!note.trim()) return;
    setSaving(true);
    try {
      await saveNote(symbol, exchange, note.trim());
      setHasSavedNote(true);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setSaving(true);
    try {
      await deleteNote(symbol, exchange);
      setNote("");
      setHasSavedNote(false);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.card}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{t.title}</Text>
      <TextInput
        style={styles.input}
        value={note}
        onChangeText={setNote}
        placeholder={t.placeholder}
        placeholderTextColor={colors.textTertiary}
        multiline
        numberOfLines={3}
      />
      <View style={styles.row}>
        <TouchableOpacity
          style={[styles.saveButton, (saving || !note.trim()) && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={saving || !note.trim()}
        >
          <Text style={styles.saveButtonText}>{saving ? t.saving : t.saveButton}</Text>
        </TouchableOpacity>
        {hasSavedNote && (
          <TouchableOpacity onPress={handleDelete} disabled={saving}>
            <Text style={styles.deleteLink}>{t.deleteButton}</Text>
          </TouchableOpacity>
        )}
        {justSaved && <Text style={styles.savedLabel}>{t.savedLabel}</Text>}
      </View>
    </View>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      borderRadius: radius.lg,
      padding: spacing[4],
      gap: spacing[2],
    },
    title: {
      fontSize: 11,
      fontWeight: "700",
      textTransform: "uppercase",
      color: colors.textTertiary,
    },
    input: {
      borderWidth: 1,
      borderColor: colors.borderDefault,
      backgroundColor: colors.surfaceElevated,
      borderRadius: radius.md,
      paddingHorizontal: spacing[3],
      paddingVertical: spacing[2],
      color: colors.textPrimary,
      minHeight: 72,
      textAlignVertical: "top",
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing[3],
    },
    saveButton: {
      backgroundColor: colors.accent,
      borderRadius: radius.md,
      paddingHorizontal: spacing[4],
      paddingVertical: spacing[2],
    },
    buttonDisabled: {
      opacity: 0.5,
    },
    saveButtonText: {
      color: colors.accentText,
      fontWeight: "600",
      fontSize: 13,
    },
    deleteLink: {
      color: colors.textTertiary,
      fontSize: 12,
    },
    savedLabel: {
      color: colors.positive,
      fontSize: 12,
    },
  });
}
