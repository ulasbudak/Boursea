import type { Session } from "@supabase/supabase-js";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { supabase } from "../lib/supabase";

export function HomeScreen({ session }: { session: Session }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Trendus</Text>
      <Text>Giriş yapıldı: {session.user.email}</Text>
      <TouchableOpacity
        style={styles.button}
        onPress={() => supabase.auth.signOut()}
      >
        <Text style={styles.buttonText}>Çıkış Yap</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
  },
  button: {
    backgroundColor: "#111",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 12,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
  },
});
