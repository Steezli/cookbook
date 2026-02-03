import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Alert, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { isValidPassword } from "@/features/auth/password";
import { supabase } from "@/lib/supabase";

function parseParamsFromHash(hash: string): Record<string, string> {
  const raw = hash.startsWith("#") ? hash.slice(1) : hash;
  const params = new URLSearchParams(raw);
  const out: Record<string, string> = {};
  for (const [k, v] of params.entries()) out[k] = v;
  return out;
}

export default function ResetPasswordScreen() {
  const { access_token, refresh_token } = useLocalSearchParams<{
    access_token?: string;
    refresh_token?: string;
  }>();
  const [password, setPassword] = useState("");
  const [isReady, setIsReady] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hashParams = useMemo(() => {
    if (Platform.OS !== "web") return null;
    if (typeof window === "undefined") return null;
    return parseParamsFromHash(window.location.hash ?? "");
  }, []);

  useEffect(() => {
    async function init() {
      try {
        // For Supabase recovery links, web typically provides access/refresh tokens in the hash.
        const accessToken =
          (Platform.OS === "web" ? hashParams?.access_token : null) ??
          (typeof access_token === "string" ? access_token : null);
        const refreshToken =
          (Platform.OS === "web" ? hashParams?.refresh_token : null) ??
          (typeof refresh_token === "string" ? refresh_token : null);

        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });
          if (error) throw error;
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Invalid reset link";
        Alert.alert("Reset link error", msg);
      } finally {
        setIsReady(true);
      }
    }

    void init();
  }, [hashParams, access_token, refresh_token]);

  async function onUpdatePassword() {
    if (!isValidPassword(password)) {
      Alert.alert(
        "Password requirements",
        "Use at least 8 characters and include a number or symbol."
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      Alert.alert("Password updated", "You can now continue.");
      router.replace("/");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Password update failed";
      Alert.alert("Password update failed", msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isReady) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Preparing…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Choose a new password</Text>

      <TextInput
        autoCapitalize="none"
        autoComplete="new-password"
        placeholder="New password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={styles.input}
      />
      <Text style={styles.hint}>8+ chars, must include a number or symbol.</Text>

      <Pressable
        onPress={onUpdatePassword}
        disabled={isSubmitting}
        style={({ pressed }) => [
          styles.button,
          (pressed || isSubmitting) && styles.buttonPressed
        ]}
      >
        <Text style={styles.buttonText}>
          {isSubmitting ? "Updating…" : "Update password"}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 12, justifyContent: "center" },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.15)",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16
  },
  hint: { fontSize: 12, opacity: 0.7, marginTop: -6 },
  button: {
    marginTop: 6,
    backgroundColor: "black",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center"
  },
  buttonPressed: { opacity: 0.8 },
  buttonText: { color: "white", fontSize: 16, fontWeight: "600" }
});

