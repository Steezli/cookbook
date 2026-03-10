import { Link, Stack, router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  Share,
  Text,
  TextInput,
  View,
} from "react-native";
import * as Clipboard from "expo-clipboard";

import { useSession } from "@/features/auth/session";
import { PageContainer } from "@/components/nav/PageContainer";
import { useBreakpoint } from "@/lib/hooks/useBreakpoint";
import { supabase } from "@/lib/supabase";
import {
  accentBlue,
  accentCoral,
  accentGreen,
  bgCard,
  bgPage,
  borderDefault,
  fontFamilyBody,
  fontFamilyBodyBold,
  fontFamilyBodyMedium,
  fontFamilyDisplay,
  fontSize2xl,
  fontSizeBase,
  fontSizeLg,
  fontSizeSm,
  fontSizeXs,
  radiusMd,
  radiusPill,
  shadowSm,
  textPrimary,
  textSecondary,
  textTertiary,
  white,
} from "@/lib/tokens";

type Family = { id: string; name: string };

type MemberRow = {
  user_id: string;
  role: "admin" | "member";
  profiles?: { email: string; display_name: string | null } | null;
};

type MemberSelectRow = {
  user_id: string;
  role: "admin" | "member";
  profiles?: MemberRow["profiles"] | Array<NonNullable<MemberRow["profiles"]>> | null;
};

type InviteRow = {
  id: string;
  email: string;
  expires_at: string;
  revoked_at: string | null;
  accepted_at: string | null;
};

/**
 * Cross-platform alert/confirm helpers.
 * On web, Alert.alert is unreliable — use window.alert/confirm instead.
 */
function showAlert(title: string, message?: string) {
  if (Platform.OS === "web") {
    window.alert(message ? `${title}\n\n${message}` : title);
  } else {
    Alert.alert(title, message);
  }
}

function confirmAction(title: string, message: string, onConfirm: () => void) {
  if (Platform.OS === "web") {
    if (window.confirm(`${title}\n\n${message}`)) {
      onConfirm();
    }
  } else {
    Alert.alert(title, message, [
      { text: "Cancel", style: "cancel" },
      { text: "Confirm", style: "destructive", onPress: onConfirm },
    ]);
  }
}

export default function FamilyDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const familyId = typeof id === "string" ? id : null;

  const { session, isLoading } = useSession();
  const userId = session?.user.id ?? null;
  const { breakpoint } = useBreakpoint();

  const [family, setFamily] = useState<Family | null>(null);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [invites, setInvites] = useState<InviteRow[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isInviting, setIsInviting] = useState(false);

  const isMobile = breakpoint === "mobile";

  const myRole = useMemo(() => {
    if (!userId) return null;
    const me = members.find((m) => m.user_id === userId);
    return me?.role ?? null;
  }, [members, userId]);

  const isAdmin = myRole === "admin";

  async function refresh() {
    if (!familyId || !userId) return;

    setIsRefreshing(true);
    try {
      const [
        { data: famData, error: famError },
        { data: memData, error: memError },
        { data: invData, error: invError },
      ] = await Promise.all([
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
          .order("created_at", { ascending: false }),
      ]);

      if (famError) throw famError;
      if (memError) throw memError;
      if (invError) throw invError;

      const isMember =
        Array.isArray(memData) && memData.some((m) => m.user_id === userId);
      if (!famData || !isMember) {
        throw new Error("Not found");
      }

      const normalizedMembers: MemberRow[] = (
        Array.isArray(memData) ? (memData as MemberSelectRow[]) : []
      ).map((m) => {
        // profiles join may be null if FK is not yet resolved (before migration runs)
        const raw = Array.isArray(m.profiles)
          ? m.profiles[0] ?? null
          : m.profiles ?? null;
        const p: MemberRow["profiles"] = raw
          ? {
              email: raw.email || "",
              display_name: raw.display_name || null,
            }
          : null;
        return { user_id: m.user_id, role: m.role, profiles: p };
      });

      setFamily((famData ?? null) as Family | null);
      setMembers(normalizedMembers);
      setInvites((invData ?? []) as InviteRow[]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load family";
      showAlert("Not found", msg);
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
        p_email: email,
      });
      if (error) {
        const status = (error as unknown as { code?: string })?.code;
        if (status === "P0002") {
          showAlert("Not found", "You don't have access to this family.");
          return;
        }
        throw error;
      }

      const row = Array.isArray(data)
        ? (data[0] as { token: string } | undefined)
        : undefined;
      const token = row?.token;
      setInviteEmail("");
      void refresh();

      if (token) {
        const inviteUrl = `/invite/${token}`;
        await shareInviteLink(inviteUrl);
      } else {
        showAlert("Invite created", "Invite was created.");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to create invite";
      showAlert("Invite failed", msg);
    } finally {
      setIsInviting(false);
    }
  }

  async function shareInviteLink(inviteUrl: string) {
    try {
      await Share.share({
        message: `Join my family on Cookbook! ${inviteUrl}`,
        url: inviteUrl,
      });
    } catch {
      // Share dismissed or failed — fall back to clipboard
      try {
        await Clipboard.setStringAsync(inviteUrl);
        showAlert("Link copied", "Invite link copied to clipboard.");
      } catch {
        showAlert("Invite created", `Share this link: ${inviteUrl}`);
      }
    }
  }

  async function onRevokeInvite(inviteId: string) {
    try {
      const { error } = await supabase.rpc("revoke_family_invite", {
        p_invite_id: inviteId,
      });
      if (error) throw error;
      void refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to revoke invite";
      showAlert("Revoke failed", msg);
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
      showAlert("Role update failed", msg);
    }
  }

  async function onRemoveMember(memberUserId: string) {
    if (!familyId) return;
    confirmAction(
      "Remove member",
      "Are you sure you want to remove this member?",
      async () => {
        try {
          const { error } = await supabase
            .from("family_memberships")
            .delete()
            .eq("family_id", familyId)
            .eq("user_id", memberUserId);
          if (error) throw error;
          void refresh();
        } catch (e) {
          const msg =
            e instanceof Error ? e.message : "Failed to remove member";
          showAlert("Remove failed", msg);
        }
      }
    );
  }

  async function onLeave() {
    if (!familyId || !userId) return;
    confirmAction(
      "Leave family",
      "Are you sure you want to leave this family?",
      async () => {
        try {
          const { error } = await supabase
            .from("family_memberships")
            .delete()
            .eq("family_id", familyId)
            .eq("user_id", userId);
          if (error) throw error;
          showAlert("Left family", "You have left the family.");
          router.back();
        } catch (e) {
          const msg =
            e instanceof Error ? e.message : "Failed to leave family";
          showAlert("Leave failed", msg);
        }
      }
    );
  }

  async function onDeleteFamily() {
    if (!familyId) return;
    confirmAction(
      "Delete family",
      "This action cannot be undone. All members will be removed.",
      async () => {
        try {
          const { error } = await supabase
            .from("families")
            .delete()
            .eq("id", familyId);
          if (error) throw error;
          showAlert("Family deleted", "The family has been deleted.");
          router.back();
        } catch (e) {
          const msg =
            e instanceof Error ? e.message : "Failed to delete family";
          showAlert("Delete failed", msg);
        }
      }
    );
  }

  async function onTransferOwnership(memberUserId: string) {
    confirmAction(
      "Transfer ownership",
      "Are you sure? You will become a regular member.",
      async () => {
        if (!familyId || !userId) return;
        try {
          // Promote target to admin, demote self to member
          const { error: promoteErr } = await supabase
            .from("family_memberships")
            .update({ role: "admin" })
            .eq("family_id", familyId)
            .eq("user_id", memberUserId);
          if (promoteErr) throw promoteErr;

          const { error: demoteErr } = await supabase
            .from("family_memberships")
            .update({ role: "member" })
            .eq("family_id", familyId)
            .eq("user_id", userId);
          if (demoteErr) throw demoteErr;

          void refresh();
        } catch (e) {
          const msg =
            e instanceof Error ? e.message : "Failed to transfer ownership";
          showAlert("Transfer failed", msg);
        }
      }
    );
  }

  function getInitials(name: string | null | undefined): string {
    if (!name) return "?";
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name[0].toUpperCase();
  }

  function getRoleBadgeStyle(role: string) {
    if (role === "admin") {
      return {
        bg: "#F0FDF4",
        text: accentGreen,
      };
    }
    return {
      bg: bgCard,
      text: textSecondary,
    };
  }

  if (isLoading) {
    return (
      <PageContainer>
        <View
          style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
        >
          <ActivityIndicator size="large" color={accentBlue} />
        </View>
      </PageContainer>
    );
  }

  if (!userId) {
    return (
      <PageContainer>
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
          }}
        >
          <Text
            style={{
              fontFamily: fontFamilyDisplay,
              fontSize: fontSize2xl,
              color: textPrimary,
            }}
          >
            Family
          </Text>
          <Text
            style={{
              fontFamily: fontFamilyBody,
              fontSize: fontSizeBase,
              color: textSecondary,
              textAlign: "center",
            }}
          >
            Please log in to view family details.
          </Text>
          <Link
            href="/(auth)/login"
            style={{
              fontFamily: fontFamilyBodyMedium,
              fontSize: fontSizeBase,
              color: accentBlue,
            }}
          >
            Log in
          </Link>
        </View>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <Stack.Screen options={{ title: family?.name ?? "Family" }} />
      <ScrollView
        contentContainerStyle={{
          gap: 20,
          paddingTop: 16,
          paddingBottom: 40,
        }}
      >
        {/* Header */}
        <Text
          style={{
            fontFamily: fontFamilyDisplay,
            fontSize: fontSize2xl,
            color: textPrimary,
          }}
        >
          {family?.name ?? "Family"}
        </Text>

        {/* Members Section */}
        <View
          style={{
            backgroundColor: bgCard,
            borderRadius: radiusMd,
            padding: 16,
            gap: 12,
          }}
        >
          <Text
            style={{
              fontFamily: fontFamilyBodyBold,
              fontSize: fontSizeLg,
              color: textPrimary,
            }}
          >
            Members
          </Text>
          {members.length === 0 ? (
            <Text
              style={{
                fontFamily: fontFamilyBody,
                fontSize: fontSizeSm,
                color: textSecondary,
              }}
            >
              No members found.
            </Text>
          ) : (
            <View style={{ gap: 8 }}>
              {members.map((m) => {
                const isMe = m.user_id === userId;
                const displayName =
                  m.profiles?.display_name || m.profiles?.email || m.user_id;
                const initials = getInitials(m.profiles?.display_name);
                const badge = getRoleBadgeStyle(m.role);

                return (
                  <View
                    key={m.user_id}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 12,
                      paddingVertical: 8,
                      ...(isMobile ? {} : { maxWidth: 600 }),
                    }}
                  >
                    {/* Avatar */}
                    <View
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 20,
                        backgroundColor: accentBlue,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: fontFamilyBodyBold,
                          fontSize: fontSizeSm,
                          color: white,
                        }}
                      >
                        {initials}
                      </Text>
                    </View>

                    {/* Info */}
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontFamily: fontFamilyBodyMedium,
                          fontSize: fontSizeBase,
                          color: textPrimary,
                        }}
                      >
                        {displayName}
                        {isMe ? " (you)" : ""}
                      </Text>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          marginTop: 2,
                        }}
                      >
                        <View
                          style={{
                            backgroundColor: badge.bg,
                            paddingHorizontal: 8,
                            paddingVertical: 2,
                            borderRadius: radiusPill,
                          }}
                        >
                          <Text
                            style={{
                              fontFamily: fontFamilyBodyMedium,
                              fontSize: fontSizeXs,
                              color: badge.text,
                              textTransform: "capitalize",
                            }}
                          >
                            {m.role}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Admin actions */}
                    {isAdmin && !isMe && (
                      <View
                        style={{ flexDirection: "row", gap: 8, alignItems: "center" }}
                      >
                        {m.role === "member" ? (
                          <Pressable
                            onPress={() => onSetRole(m.user_id, "admin")}
                            style={({ pressed }) => ({
                              paddingHorizontal: 10,
                              paddingVertical: 6,
                              borderRadius: radiusMd,
                              borderWidth: 1,
                              borderColor: borderDefault,
                              opacity: pressed ? 0.7 : 1,
                            })}
                          >
                            <Text
                              style={{
                                fontFamily: fontFamilyBody,
                                fontSize: fontSizeXs,
                                color: textPrimary,
                              }}
                            >
                              Promote
                            </Text>
                          </Pressable>
                        ) : (
                          <Pressable
                            onPress={() => onSetRole(m.user_id, "member")}
                            style={({ pressed }) => ({
                              paddingHorizontal: 10,
                              paddingVertical: 6,
                              borderRadius: radiusMd,
                              borderWidth: 1,
                              borderColor: borderDefault,
                              opacity: pressed ? 0.7 : 1,
                            })}
                          >
                            <Text
                              style={{
                                fontFamily: fontFamilyBody,
                                fontSize: fontSizeXs,
                                color: textPrimary,
                              }}
                            >
                              Demote
                            </Text>
                          </Pressable>
                        )}
                        <Pressable
                          onPress={() => onRemoveMember(m.user_id)}
                          style={({ pressed }) => ({
                            paddingHorizontal: 10,
                            paddingVertical: 6,
                            borderRadius: radiusMd,
                            borderWidth: 1,
                            borderColor: accentCoral,
                            opacity: pressed ? 0.7 : 1,
                          })}
                        >
                          <Text
                            style={{
                              fontFamily: fontFamilyBody,
                              fontSize: fontSizeXs,
                              color: accentCoral,
                            }}
                          >
                            Remove
                          </Text>
                        </Pressable>
                        <Pressable
                          onPress={() => onTransferOwnership(m.user_id)}
                          style={({ pressed }) => ({
                            paddingHorizontal: 10,
                            paddingVertical: 6,
                            borderRadius: radiusMd,
                            borderWidth: 1,
                            borderColor: borderDefault,
                            opacity: pressed ? 0.7 : 1,
                          })}
                        >
                          <Text
                            style={{
                              fontFamily: fontFamilyBody,
                              fontSize: fontSizeXs,
                              color: textSecondary,
                            }}
                          >
                            Transfer
                          </Text>
                        </Pressable>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Invite Section */}
        <View
          style={{
            backgroundColor: bgCard,
            borderRadius: radiusMd,
            padding: 16,
            gap: 12,
          }}
        >
          <Text
            style={{
              fontFamily: fontFamilyBodyBold,
              fontSize: fontSizeLg,
              color: textPrimary,
            }}
          >
            Invite Member
          </Text>
          <TextInput
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            placeholder="Email address (optional)"
            value={inviteEmail}
            onChangeText={setInviteEmail}
            style={{
              borderWidth: 1,
              borderColor: borderDefault,
              borderRadius: radiusMd,
              paddingHorizontal: 14,
              paddingVertical: 12,
              fontSize: fontSizeBase,
              fontFamily: fontFamilyBody,
              color: textPrimary,
              backgroundColor: bgPage,
            }}
          />
          <Pressable
            onPress={onInvite}
            disabled={isInviting}
            style={({ pressed }) => ({
              backgroundColor: accentBlue,
              borderRadius: radiusMd,
              paddingVertical: 12,
              alignItems: "center" as const,
              opacity: pressed || isInviting ? 0.7 : 1,
            })}
          >
            <Text
              style={{
                fontFamily: fontFamilyBodyMedium,
                fontSize: fontSizeBase,
                color: white,
              }}
            >
              {isInviting ? "Creating invite..." : "Create Invite Link"}
            </Text>
          </Pressable>
          <Text
            style={{
              fontFamily: fontFamilyBody,
              fontSize: fontSizeXs,
              color: textTertiary,
            }}
          >
            An invite link will be generated. Share it via the native share
            sheet or copy to clipboard.
          </Text>
        </View>

        {/* Pending Invites */}
        {invites.length > 0 && (
          <View
            style={{
              backgroundColor: bgCard,
              borderRadius: radiusMd,
              padding: 16,
              gap: 8,
            }}
          >
            <Text
              style={{
                fontFamily: fontFamilyBodyBold,
                fontSize: fontSizeLg,
                color: textPrimary,
              }}
            >
              Pending Invites
            </Text>
            {invites.map((inv) => {
              const status = inv.revoked_at
                ? "revoked"
                : inv.accepted_at
                  ? "accepted"
                  : "pending";
              const statusColor =
                status === "pending"
                  ? accentBlue
                  : status === "accepted"
                    ? accentGreen
                    : textTertiary;

              return (
                <View
                  key={inv.id}
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    paddingVertical: 8,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontFamily: fontFamilyBodyMedium,
                        fontSize: fontSizeSm,
                        color: textPrimary,
                      }}
                    >
                      {inv.email}
                    </Text>
                    <Text
                      style={{
                        fontFamily: fontFamilyBody,
                        fontSize: fontSizeXs,
                        color: statusColor,
                        marginTop: 2,
                        textTransform: "capitalize",
                      }}
                    >
                      {status}
                    </Text>
                  </View>
                  {isAdmin && status === "pending" && (
                    <Pressable
                      onPress={() => onRevokeInvite(inv.id)}
                      style={({ pressed }) => ({
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        borderRadius: radiusMd,
                        borderWidth: 1,
                        borderColor: accentCoral,
                        opacity: pressed ? 0.7 : 1,
                      })}
                    >
                      <Text
                        style={{
                          fontFamily: fontFamilyBody,
                          fontSize: fontSizeXs,
                          color: accentCoral,
                        }}
                      >
                        Revoke
                      </Text>
                    </Pressable>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* Admin Controls / Leave */}
        <View
          style={{
            backgroundColor: bgCard,
            borderRadius: radiusMd,
            padding: 16,
            gap: 12,
          }}
        >
          {!isAdmin ? (
            <Pressable
              onPress={onLeave}
              style={({ pressed }) => ({
                borderWidth: 1,
                borderColor: accentCoral,
                borderRadius: radiusMd,
                paddingVertical: 12,
                alignItems: "center" as const,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text
                style={{
                  fontFamily: fontFamilyBodyMedium,
                  fontSize: fontSizeBase,
                  color: accentCoral,
                }}
              >
                Leave Family
              </Text>
            </Pressable>
          ) : (
            <>
              <Text
                style={{
                  fontFamily: fontFamilyBodyBold,
                  fontSize: fontSizeLg,
                  color: textPrimary,
                }}
              >
                Admin Controls
              </Text>
              <Pressable
                onPress={onDeleteFamily}
                style={({ pressed }) => ({
                  backgroundColor: accentCoral,
                  borderRadius: radiusMd,
                  paddingVertical: 12,
                  alignItems: "center" as const,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Text
                  style={{
                    fontFamily: fontFamilyBodyMedium,
                    fontSize: fontSizeBase,
                    color: white,
                  }}
                >
                  Delete Family
                </Text>
              </Pressable>
              <Text
                style={{
                  fontFamily: fontFamilyBody,
                  fontSize: fontSizeXs,
                  color: textTertiary,
                }}
              >
                Last admin cannot leave until another admin exists. Use
                "Transfer" on a member to hand over ownership.
              </Text>
            </>
          )}
        </View>
      </ScrollView>
    </PageContainer>
  );
}
