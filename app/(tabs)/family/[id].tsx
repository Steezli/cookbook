import { Link, Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";

import { useSession } from "@/features/auth/session";
import { supabase } from "@/lib/supabase";

type Family = { id: string; name: string };

type MemberRow = {
  user_id: string;
  role: "admin" | "member";
  profiles?: { email: string; display_name: string | null } | null;
};

type MemberSelectRow = {
  user_id: string;
  role: "admin" | "member";
  // Supabase relationship selects can come back as an object or an array depending on schema inference.
  // Normalize to a single profile object for UI use.
  profiles?: MemberRow["profiles"] | Array<NonNullable<MemberRow["profiles"]>> | null;
};

type InviteRow = {
  id: string;
  email: string;
  expires_at: string;
  revoked_at: string | null;
  accepted_at: string | null;
};

export default function FamilyDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const familyId = typeof id === "string" ? id : null;

  const { session, isLoading } = useSession();
  const userId = session?.user.id ?? null;

  const [family, setFamily] = useState<Family | null>(null);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [invites, setInvites] = useState<InviteRow[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isInviting, setIsInviting] = useState(false);

  const myRole = useMemo(() => {
    if (!userId) return null;
    const me = members.find((m) => m.user_id === userId);
    return me?.role ?? null;
  }, [members, userId]);

  const isAdmin = myRole === "admin";

  async function refresh() {
    if (!familyId) return;
    if (!userId) return;

    setIsRefreshing(true);
    try {
      const [{ data: famData, error: famError }, { data: memData, error: memError }, { data: invData, error: invError }] =
        await Promise.all([
          supabase.from("families").select("id,name").eq("id", familyId).maybeSingle(),
          supabase
            .from("family_memberships")
            .select("user_id,role,profiles(email,display_name)")
            .eq("family_id", familyId)
            .order("created_at", { ascending: true }),
          supabase
            .from("family_invites")
            .select("id,email,expires_at,revoked_at,accepted_at")
            .eq("family_id", familyId)
            .order("created_at", { ascending: false })
        ]);

      if (famError) throw famError;
      if (memError) throw memError;
      if (invError) throw invError;

      // Phase 1 semantic: protected family resources should behave like "not found".
      // RLS returns zero rows for non-members; treat that as 404 at the UI layer.
      const isMember = Array.isArray(memData) && memData.some((m) => m.user_id === userId);
      if (!famData || !isMember) {
        throw new Error("Not found");
      }

      const normalizedMembers: MemberRow[] = (Array.isArray(memData) ? (memData as MemberSelectRow[]) : []).map(
        (m) => {
          const p = Array.isArray(m.profiles) ? m.profiles[0] ?? null : m.profiles ?? null;
          return { user_id: m.user_id, role: m.role, profiles: p };
        }
      );

      setFamily((famData ?? null) as Family | null);
      setMembers(normalizedMembers);
      setInvites((invData ?? []) as InviteRow[]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load family";
      // Phase 1 semantic: treat protected family resources as 404 (not found).
      Alert.alert("Not found", msg);
    } finally {
      setIsRefreshing(false);
    }
  }

  useEffect(() => {
    if (!isLoading && userId) void refresh();
  }, [isLoading, userId, familyId]);

  async function onInvite() {
    if (!familyId) return;
    const email = inviteEmail.trim().toLowerCase();
    if (!email) return;

    setIsInviting(true);
    try {
      const { data, error } = await supabase.rpc("create_family_invite", {
        p_family_id: familyId,
        p_email: email
      });
      if (error) {
        const status = (error as unknown as { code?: string })?.code;
        if (status === "P0002") {
          Alert.alert("Not found", "You don't have access to this family.");
          return;
        }
        throw error;
      }

      const row = Array.isArray(data) ? (data[0] as { token: string } | undefined) : undefined;
      const token = row?.token;
      setInviteEmail("");
      void refresh();

      if (token) {
        Alert.alert("Invite created", `Share this link: /invite/${token}`);
      } else {
        Alert.alert("Invite created", "Invite was created.");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to create invite";
      Alert.alert("Invite failed", msg);
    } finally {
      setIsInviting(false);
    }
  }

  async function onRevokeInvite(inviteId: string) {
    try {
      const { error } = await supabase.rpc("revoke_family_invite", { p_invite_id: inviteId });
      if (error) throw error;
      void refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to revoke invite";
      Alert.alert("Revoke failed", msg);
    }
  }

  async function onSetRole(memberUserId: string, role: "admin" | "member") {
    if (!familyId) return;
    try {
      const { error } = await supabase
        .from("family_memberships")
        .update({ role })
        .eq("family_id", familyId)
        .eq("user_id", memberUserId);
      if (error) throw error;
      void refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to update role";
      Alert.alert("Role update failed", msg);
    }
  }

  async function onRemoveMember(memberUserId: string) {
    if (!familyId) return;
    try {
      const { error } = await supabase
        .from("family_memberships")
        .delete()
        .eq("family_id", familyId)
        .eq("user_id", memberUserId);
      if (error) throw error;
      void refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to remove member";
      Alert.alert("Remove failed", msg);
    }
  }

  async function onLeave() {
    if (!familyId || !userId) return;
    try {
      const { error } = await supabase
        .from("family_memberships")
        .delete()
        .eq("family_id", familyId)
        .eq("user_id", userId);
      if (error) throw error;
      Alert.alert("Left family", "You have left the family.");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to leave family";
      Alert.alert("Leave failed", msg);
    }
  }

  if (isLoading) {
    return (
      <View style={styles.center}>
        <Text style={styles.meta}>Loading…</Text>
      </View>
    );
  }

  if (!userId) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Family</Text>
        <Text style={styles.meta}>Please log in to view family details.</Text>
        <Link href="/(auth)/login" style={styles.link}>
          Log in
        </Link>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: family?.name ?? "Family" }} />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.row}>
          <Text style={styles.title}>{family?.name ?? "Family"}</Text>
          <Pressable onPress={refresh} disabled={isRefreshing}>
            <Text style={styles.link}>{isRefreshing ? "Refreshing…" : "Refresh"}</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Members</Text>
          {members.length === 0 ? (
            <Text style={styles.meta}>No members found.</Text>
          ) : (
            members.map((m) => {
              const isMe = m.user_id === userId;
              const label = m.profiles?.display_name || m.profiles?.email || m.user_id;
              return (
                <View key={m.user_id} style={styles.memberRow}>
                  <View style={styles.memberInfo}>
                    <Text style={styles.memberName}>{label}</Text>
                    <Text style={styles.memberMeta}>
                      {m.role}
                      {isMe ? " (you)" : ""}
                    </Text>
                  </View>

                  {isAdmin && !isMe ? (
                    <View style={styles.memberActions}>
                      {m.role === "member" ? (
                        <Pressable onPress={() => onSetRole(m.user_id, "admin")}>
                          <Text style={styles.action}>Promote</Text>
                        </Pressable>
                      ) : (
                        <Pressable onPress={() => onSetRole(m.user_id, "member")}>
                          <Text style={styles.action}>Demote</Text>
                        </Pressable>
                      )}
                      <Pressable onPress={() => onRemoveMember(m.user_id)}>
                        <Text style={[styles.action, styles.danger]}>Remove</Text>
                      </Pressable>
                    </View>
                  ) : null}
                </View>
              );
            })
          )}

          <Pressable onPress={onLeave} style={({ pressed }) => [styles.secondaryButton, pressed && styles.buttonPressed]}>
            <Text style={styles.secondaryButtonText}>Leave family</Text>
          </Pressable>
          {isAdmin ? (
            <Text style={styles.hint}>
              Last admin can’t leave until another admin exists.
            </Text>
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Invite someone</Text>
          <TextInput
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            placeholder="Email"
            value={inviteEmail}
            onChangeText={setInviteEmail}
            style={styles.input}
          />
          <Pressable
            onPress={onInvite}
            disabled={isInviting}
            style={({ pressed }) => [styles.button, (pressed || isInviting) && styles.buttonPressed]}
          >
            <Text style={styles.buttonText}>{isInviting ? "Creating…" : "Create invite link"}</Text>
          </Pressable>
          <Text style={styles.hint}>
            Phase 1: invite “sending” is link-sharing; email delivery is added once an email provider is configured.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Pending invites</Text>
          {invites.length === 0 ? (
            <Text style={styles.meta}>No invites yet.</Text>
          ) : (
            invites.map((inv) => {
              const status = inv.revoked_at
                ? "revoked"
                : inv.accepted_at
                  ? "accepted"
                  : "pending";
              return (
                <View key={inv.id} style={styles.inviteRow}>
                  <View style={styles.inviteInfo}>
                    <Text style={styles.memberName}>{inv.email}</Text>
                    <Text style={styles.memberMeta}>status: {status}</Text>
                  </View>
                  {isAdmin && status === "pending" ? (
                    <Pressable onPress={() => onRevokeInvite(inv.id)}>
                      <Text style={[styles.action, styles.danger]}>Revoke</Text>
                    </Pressable>
                  ) : null}
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, padding: 24, alignItems: "center", justifyContent: "center", gap: 10 },
  container: { padding: 24, gap: 14 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontSize: 22, fontWeight: "700" },
  meta: { fontSize: 14, opacity: 0.75 },
  link: { fontSize: 15 },
  hint: { fontSize: 12, opacity: 0.7, marginTop: 6 },
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
  secondaryButton: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.2)",
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center"
  },
  secondaryButtonText: { fontSize: 15, fontWeight: "600" },
  buttonPressed: { opacity: 0.8 },
  buttonText: { color: "white", fontSize: 16, fontWeight: "600" },
  memberRow: { flexDirection: "row", justifyContent: "space-between", gap: 12, paddingVertical: 8 },
  inviteRow: { flexDirection: "row", justifyContent: "space-between", gap: 12, paddingVertical: 8 },
  memberInfo: { flex: 1 },
  inviteInfo: { flex: 1 },
  memberName: { fontSize: 15, fontWeight: "600" },
  memberMeta: { fontSize: 12, opacity: 0.75, marginTop: 2 },
  memberActions: { flexDirection: "row", gap: 12, alignItems: "center" },
  action: { fontSize: 14 },
  danger: { color: "#b00020" }
});

