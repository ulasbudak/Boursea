import { useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../lib/supabase";
import { useLocale } from "../lib/locale-context";
import { useTheme, radius, spacing, type ThemeColors } from "../lib/theme";

export function AuthScreen() {
  const { messages } = useLocale();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signInWithEmail() {
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) setError(error.message);
    setLoading(false);
  }

  async function signUpWithEmail() {
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) setError(error.message);
    setLoading(false);
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>{messages.common.appName}</Text>
        <TextInput
          style={styles.input}
          placeholder={messages.auth.email}
          placeholderTextColor={colors.textTertiary}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder={messages.auth.password}
          placeholderTextColor={colors.textTertiary}
          secureTextEntry
          autoCapitalize="none"
          value={password}
          onChangeText={setPassword}
        />
        {error && <Text style={styles.error}>{error}</Text>}
        {loading ? (
          <ActivityIndicator color={colors.accent} />
        ) : (
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.button} onPress={signInWithEmail}>
              <Text style={styles.buttonText}>{messages.auth.login}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={signUpWithEmail}
            >
              <Text style={[styles.buttonText, styles.secondaryButtonText]}>
                {messages.auth.signup}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: "center",
      padding: spacing[6],
      backgroundColor: colors.canvas,
    },
    card: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      borderRadius: radius.lg,
      padding: spacing[6],
      gap: spacing[3],
    },
    title: {
      fontSize: 24,
      fontWeight: "700",
      textAlign: "center",
      color: colors.textPrimary,
      marginBottom: spacing[2],
    },
    input: {
      borderWidth: 1,
      borderColor: colors.borderDefault,
      backgroundColor: colors.surfaceElevated,
      borderRadius: radius.md,
      paddingHorizontal: spacing[3],
      paddingVertical: spacing[3],
      color: colors.textPrimary,
    },
    buttonRow: {
      flexDirection: "row",
      gap: spacing[3],
      marginTop: spacing[2],
    },
    button: {
      flex: 1,
      backgroundColor: colors.accent,
      paddingVertical: spacing[3],
      borderRadius: radius.md,
      alignItems: "center",
    },
    secondaryButton: {
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.borderDefault,
    },
    buttonText: {
      color: colors.accentText,
      fontWeight: "600",
    },
    secondaryButtonText: {
      color: colors.textPrimary,
    },
    error: {
      color: colors.negative,
      fontSize: 13,
    },
  });
}
