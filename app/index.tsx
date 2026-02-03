import { Link } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { supabase } from "@/lib/supabase";
import { useSession } from "@/features/auth/session";

export default function Index() {
  // Ensure the client is imported at runtime (Phase 01-01 must-have).
  void supabase;
  const { session, isLoading } = useSession();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Cookbook</Text>
      <Text style={styles.subtitle}>Phase 1 foundation</Text>

      {isLoading ? (
        <Text style={styles.meta}>Loading session…</Text>
      ) : session ? (
        <Text style={styles.meta}>Signed in as {session.user.email ?? "unknown"}</Text>
      ) : (
        <Text style={styles.meta}>You are signed out.</Text>
      )}

      <View style={styles.links}>
        {session ? (
          <>
            <Link href="/(family)" style={styles.link}>
              Families
            </Link>
            <Link href="/(auth)/logout" style={styles.link}>
              Log out
            </Link>
          </>
        ) : (
          <>
            <Link href="/(auth)/login" style={styles.link}>
              Log in
            </Link>
            <Link href="/(auth)/signup" style={styles.link}>
              Sign up
            </Link>
          </>
        )}
        <Link href="/recipes/demo" style={styles.link}>
          Open a recipe route
        </Link>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24
  },
  title: {
    fontSize: 28,
    fontWeight: "700"
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    opacity: 0.7
  },
  meta: {
    marginTop: 10,
    fontSize: 13,
    opacity: 0.8
  },
  links: {
    marginTop: 18,
    gap: 10,
    alignItems: "center"
  },
  link: {
    fontSize: 16
  }
});
