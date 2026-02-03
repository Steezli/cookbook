import { Link, router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { useSession } from "@/features/auth/session";
import { supabase } from "@/lib/supabase";

type Family = {
  id: string;
  name: string;
};

export default function FamiliesHomeScreen() {
  const { session, isLoading } = useSession();
  const userId = session?.user.id ?? null;

  const [families, setFamilies] = useState<Family[]>([]);
  const [familyName, setFamilyName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const isAuthed = useMemo(() => Boolean(userId), [userId]);

  async function refresh() {
    if (!isAuthed) return;
    setIsRefreshing(true);
    try {
      const { data, error } = await supabase.from("families").select("id,name").order("created_at", { ascending: false });
      if (error) throw error;
      setFamilies((data ?? []) as Family[]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load families";
      Alert.alert("Error", msg);
    } finally {
      setIsRefreshing(false);
    }
  }

  useEffect(() => {
    if (!isLoading && isAuthed) {
      void refresh();
    }
  }, [isLoading, isAuthed]);

  async function onCreateFamily() {
    const name = familyName.trim();
    if (!name) return;

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.rpc("create_family", { p_name: name });
      if (error) throw error;
      setFamilyName("");
      const familyId = data as string;
      router.push(`/(family)/family/${familyId}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to create family";
      Alert.alert("Create family failed", msg);
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

  if (!isAuthed) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Families</Text>
        <Text style={styles.meta}>Please log in to create or join a family.</Text>
        <Link href="/(auth)/login" style={styles.link}>
          Log in
        </Link>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Your families</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Create a family</Text>
        <TextInput
          placeholder="Family name"
          value={familyName}
          onChangeText={setFamilyName}
          style={styles.input}
        />
        <Pressable
          onPress={onCreateFamily}
          disabled={isSubmitting}
          style={({ pressed }) => [styles.button, (pressed || isSubmitting) && styles.buttonPressed]}
        >
          <Text style={styles.buttonText}>{isSubmitting ? "Creating…" : "Create"}</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.cardTitle}>Families</Text>
          <Pressable onPress={refresh} disabled={isRefreshing}>
            <Text style={styles.link}>{isRefreshing ? "Refreshing…" : "Refresh"}</Text>
          </Pressable>
        </View>

        {families.length === 0 ? (
          <Text style={styles.meta}>No families yet.</Text>
        ) : (
          families.map((f) => (
            <Link key={f.id} href={`/(family)/family/${f.id}`} style={styles.familyLink}>
              {f.name}
            </Link>
          ))
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Join via invite link</Text>
        <Text style={styles.meta}>
          Open an invite URL like <Text style={styles.code}>/invite/&lt;token&gt;</Text>.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, padding: 24, alignItems: "center", justifyContent: "center", gap: 10 },
  container: { padding: 24, gap: 14 },
  title: { fontSize: 24, fontWeight: "700" },
  meta: { fontSize: 14, opacity: 0.75, textAlign: "center" },
  code: { fontFamily: "Courier", opacity: 0.9 },
  link: { fontSize: 15 },
  card: {
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.12)",
    borderRadius: 12,
    padding: 14,
    gap: 10
  },
  cardTitle: { fontSize: 16, fontWeight: "700" },
  input: {
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.15)",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16
  },
  button: {
    backgroundColor: "black",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center"
  },
  buttonPressed: { opacity: 0.8 },
  buttonText: { color: "white", fontSize: 16, fontWeight: "600" },
  familyLink: { fontSize: 16, paddingVertical: 6 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }
});

