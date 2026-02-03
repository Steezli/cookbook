import { Link, router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { supabase } from "@/lib/supabase";

export default function LoginScreen() {
  const { next } = useLocalSearchParams<{ next?: string }>();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onLogin() {
    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password
      });
      if (error) throw error;
      const target = typeof next === "string" && next.startsWith("/") ? next : "/";
      router.replace(target);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Login failed";
      Alert.alert("Login failed", msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Log in</Text>

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
        autoComplete="password"
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={styles.input}
      />

      <Pressable
        onPress={onLogin}
        disabled={isSubmitting}
        style={({ pressed }) => [
          styles.button,
          (pressed || isSubmitting) && styles.buttonPressed
        ]}
      >
        <Text style={styles.buttonText}>{isSubmitting ? "Logging in…" : "Log in"}</Text>
      </Pressable>

      <View style={styles.links}>
        <Link href="/(auth)/forgot-password" style={styles.link}>
          Forgot password?
        </Link>
        <Link href={{ pathname: "/(auth)/signup", params: { next } }} style={styles.link}>
          Create account
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

