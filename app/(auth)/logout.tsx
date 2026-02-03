import { router } from "expo-router";
import { useEffect } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";

import { supabase } from "@/lib/supabase";

export default function LogoutScreen() {
  useEffect(() => {
    async function run() {
      try {
        // Phase 1 decision: logout this device only.
        const { error } = await supabase.auth.signOut({ scope: "local" });
        if (error) {
          // Fall back to default signOut if scope isn't supported by the runtime.
          const fallback = await supabase.auth.signOut();
          if (fallback.error) throw fallback.error;
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Logout failed";
        Alert.alert("Logout failed", msg);
      } finally {
        router.replace("/");
      }
    }
    void run();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Logging out…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  text: { fontSize: 16, opacity: 0.8 }
});

