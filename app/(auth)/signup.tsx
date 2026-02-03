import { Link, router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { isValidPassword } from "@/features/auth/password";
import { supabase } from "@/lib/supabase";

export default function SignupScreen() {
  const { next } = useLocalSearchParams<{ next?: string }>();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSignup() {
    const normalizedEmail = email.trim().toLowerCase();
    if (!isValidPassword(password)) {
      Alert.alert(
        "Password requirements",
        "Use at least 8 characters and include a number or symbol."
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password
      });
      if (error) throw error;
      const target = typeof next === "string" && next.startsWith("/") ? next : "/";
      router.replace(target);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Sign up failed";
      Alert.alert("Sign up failed", msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sign up</Text>

      <TextInput
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        style={styles.input}
      />
      <TextInput
        autoCapitalize="none"
        autoComplete="new-password"
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={styles.input}
      />
      <Text style={styles.hint}>8+ chars, must include a number or symbol.</Text>

      <Pressable
        onPress={onSignup}
        disabled={isSubmitting}
        style={({ pressed }) => [
          styles.button,
          (pressed || isSubmitting) && styles.buttonPressed
        ]}
      >
        <Text style={styles.buttonText}>
          {isSubmitting ? "Creating…" : "Create account"}
        </Text>
      </Pressable>

      <View style={styles.links}>
        <Link href={{ pathname: "/(auth)/login", params: { next } }} style={styles.link}>
          Already have an account? Log in
        </Link>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 12, justifyContent: "center" },
  title: { fontSize: 28, fontWeight: "700", marginBottom: 6 },
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
  buttonText: { color: "white", fontSize: 16, fontWeight: "600" },
  links: { marginTop: 10, gap: 10 },
  link: { fontSize: 15 }
});

