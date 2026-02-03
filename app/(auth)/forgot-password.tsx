import * as Linking from "expo-linking";
import { Link } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { supabase } from "@/lib/supabase";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit() {
    setIsSubmitting(true);
    try {
      const redirectTo = Linking.createURL("/(auth)/reset-password");
      const { data, error } = await supabase.functions.invoke("reset-request", {
        body: { email: email.trim().toLowerCase(), redirect_to: redirectTo }
      });

      if (error) {
        // Supabase functions return errors with an `context.status` when available.
        // The backend is expected to return 404 for unknown email.
        const status = (error as unknown as { context?: { status?: number } })?.context
          ?.status;
        if (status === 404) {
          Alert.alert("Email not found", "No account exists for that email.");
          return;
        }
        throw error;
      }

      void data;
      Alert.alert("Check your email", "A reset link has been sent.");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Reset request failed";
      Alert.alert("Reset request failed", msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Reset password</Text>
      <Text style={styles.subtitle}>
        Enter your email and we’ll send a reset link.
      </Text>

      <TextInput
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        style={styles.input}
      />

      <Pressable
        onPress={onSubmit}
        disabled={isSubmitting}
        style={({ pressed }) => [
          styles.button,
          (pressed || isSubmitting) && styles.buttonPressed
        ]}
      >
        <Text style={styles.buttonText}>{isSubmitting ? "Sending…" : "Send link"}</Text>
      </Pressable>

      <View style={styles.links}>
        <Link href="/(auth)/login" style={styles.link}>
          Back to login
        </Link>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 12, justifyContent: "center" },
  title: { fontSize: 28, fontWeight: "700", marginBottom: 2 },
  subtitle: { fontSize: 14, opacity: 0.75, marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.15)",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16
  },
  button: {
    marginTop: 6,
    backgroundColor: "black",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center"
  },
  buttonPressed: { opacity: 0.8 },
  buttonText: { color: "white", fontSize: 16, fontWeight: "600" },
  links: { marginTop: 10, gap: 10 },
  link: { fontSize: 15 }
});

