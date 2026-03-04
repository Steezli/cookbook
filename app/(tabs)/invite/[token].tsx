import { Link, router, Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { useSession } from "@/features/auth/session";
import { supabase } from "@/lib/supabase";

export default function AcceptInviteScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const inviteToken = typeof token === "string" ? token : null;

  const { session, isLoading } = useSession();
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Auto-accept if signed in.
    if (!isLoading && session && inviteToken) {
      void accept();
    }
  }, [isLoading, session, inviteToken]);

  async function accept() {
    if (!inviteToken) return;
    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.rpc("accept_family_invite", {
        p_token: inviteToken
      });
      if (error) throw error;
      const familyId = data as string;
      router.replace(`/(family)/family/${familyId}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Invalid invite";
      Alert.alert("Invite error", msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <View style={styles.center}>
        <Text style={styles.meta}>Loading…</Text>
      </View>
    );
  }

  if (!inviteToken) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Invite</Text>
        <Text style={styles.meta}>Missing invite token.</Text>
      </View>
    );
  }

  if (!session) {
    const next = `/invite/${inviteToken}`;
    return (
      <>
        <Stack.Screen options={{ title: "Accept invite" }} />
        <View style={styles.center}>
          <Text style={styles.title}>Accept invite</Text>
          <Text style={styles.meta}>Log in or sign up to join this family.</Text>
          <Link href={{ pathname: "/(auth)/login", params: { next } }} style={styles.link}>
            Log in
          </Link>
          <Link href={{ pathname: "/(auth)/signup", params: { next } }} style={styles.link}>
            Sign up
          </Link>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: "Accept invite" }} />
      <View style={styles.center}>
        <Text style={styles.title}>Accept invite</Text>
        <Text style={styles.meta}>
          {isSubmitting ? "Joining…" : "Ready to join this family."}
        </Text>
        <Pressable
          onPress={accept}
          disabled={isSubmitting}
          style={({ pressed }) => [styles.button, (pressed || isSubmitting) && styles.buttonPressed]}
        >
          <Text style={styles.buttonText}>{isSubmitting ? "Joining…" : "Join family"}</Text>
        </Pressable>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, padding: 24, alignItems: "center", justifyContent: "center", gap: 10 },
  title: { fontSize: 22, fontWeight: "700" },
  meta: { fontSize: 14, opacity: 0.75, textAlign: "center" },
  link: { fontSize: 15 },
  button: {
    marginTop: 10,
    backgroundColor: "black",
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 10,
    alignItems: "center"
  },
  buttonPressed: { opacity: 0.8 },
  buttonText: { color: "white", fontSize: 16, fontWeight: "600" }
});

