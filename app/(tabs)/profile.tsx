import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { Pencil, X, Check, ExternalLink } from "lucide-react-native";
import { showAlert } from "@/lib/alert";
import { useSession } from "@/features/auth/session";
import { supabase } from "@/lib/supabase";
import { getUnitPreference, setUnitPreference } from "@/features/units/api";
import type { UnitSystem } from "@/features/units/types";
import { useBreakpoint } from "@/lib/hooks/useBreakpoint";
import { PageContainer } from "@/components/nav/PageContainer";
import {
  accentBlue,
  accentCoral,
  accentWarm,
  bgCard,
  bgPage,
  borderDefault,
  fontFamilyBody,
  fontFamilyBodyBold,
  fontFamilyBodyMedium,
  fontFamilyDisplay,
  fontFamilyDisplayBold,
  fontSizeBase,
  fontSizeLg,
  fontSizeSm,
  fontSizeXl,
  radiusMd,
  radiusPill,
  shadowSm,
  textPrimary,
  textSecondary,
  textTertiary,
  white,
} from "@/lib/tokens";

type ProfileData = {
  display_name: string | null;
  email: string | null;
};

function getInitials(displayName: string | null): string {
  if (!displayName || !displayName.trim()) return "U";
  const parts = displayName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function ProfileScreen() {
  const router = useRouter();
  const { session, isLoading: sessionLoading } = useSession();
  const { breakpoint } = useBreakpoint();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [unitPref, setUnitPrefState] = useState<UnitSystem>("imperial");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Display name editing
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [isSavingName, setIsSavingName] = useState(false);

  // Unit preference saving
  const [isSavingUnit, setIsSavingUnit] = useState(false);

  const isMobile = breakpoint === "mobile";
  const contentMaxWidth = isMobile ? undefined : 600;

  const loadProfile = useCallback(async () => {
    if (!session?.user) return;

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: profileError } = await supabase
        .from("profiles")
        .select("display_name, email")
        .eq("user_id", session.user.id)
        .single();

      if (profileError) throw profileError;

      setProfile({
        display_name: data?.display_name ?? null,
        email: data?.email ?? session.user.email ?? null,
      });

      const pref = await getUnitPreference();
      setUnitPrefState(pref);
    } catch (e) {
      setError("Failed to load profile");
    } finally {
      setIsLoading(false);
    }
  }, [session]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  async function handleSaveName() {
    if (!session?.user || isSavingName) return;
    const trimmed = editName.trim();
    if (!trimmed) return;

    setIsSavingName(true);
    try {
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ display_name: trimmed })
        .eq("user_id", session.user.id);

      if (updateError) throw updateError;

      setProfile((prev) =>
        prev ? { ...prev, display_name: trimmed } : prev
      );
      setIsEditing(false);
    } catch (e) {
      showAlert(
        "Error",
        e instanceof Error ? e.message : "Failed to update name"
      );
    } finally {
      setIsSavingName(false);
    }
  }

  async function handleUnitChange(preference: UnitSystem) {
    if (isSavingUnit || preference === unitPref) return;

    const previous = unitPref;
    setUnitPrefState(preference);
    setIsSavingUnit(true);

    try {
      await setUnitPreference(preference);
    } catch (e) {
      showAlert(
        "Error",
        e instanceof Error ? e.message : "Failed to update preference"
      );
      setUnitPrefState(previous);
    } finally {
      setIsSavingUnit(false);
    }
  }

  async function handleSignOut() {
    try {
      await supabase.auth.signOut();
      // Reactive redirect in _layout.tsx handles navigation when session becomes null
    } catch (e) {
      showAlert(
        "Error",
        e instanceof Error ? e.message : "Failed to sign out"
      );
    }
  }

  // Loading state
  if (sessionLoading || isLoading) {
    return (
      <PageContainer variant="form">
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <ActivityIndicator size="large" color={accentBlue} />
        </View>
      </PageContainer>
    );
  }

  // Not authenticated
  if (!session) {
    return (
      <PageContainer variant="form">
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Text
            style={{
              fontFamily: fontFamilyBody,
              fontSize: fontSizeBase,
              color: textSecondary,
            }}
          >
            Please log in to access your profile.
          </Text>
        </View>
      </PageContainer>
    );
  }

  // Error state
  if (error) {
    return (
      <PageContainer variant="form">
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            gap: 16,
          }}
        >
          <Text
            style={{
              fontFamily: fontFamilyBody,
              fontSize: fontSizeBase,
              color: accentCoral,
            }}
          >
            {error}
          </Text>
          <Pressable
            onPress={loadProfile}
            style={{
              backgroundColor: accentBlue,
              paddingHorizontal: 24,
              paddingVertical: 12,
              borderRadius: radiusMd,
            }}
          >
            <Text
              style={{
                fontFamily: fontFamilyBodyMedium,
                fontSize: fontSizeBase,
                color: white,
              }}
            >
              Retry
            </Text>
          </Pressable>
        </View>
      </PageContainer>
    );
  }

  const initials = getInitials(profile?.display_name ?? null);
  const displayName = profile?.display_name || "No name set";
  const email = profile?.email || session.user.email || "";

  return (
    <PageContainer variant="form">
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingVertical: 32,
          paddingHorizontal: isMobile ? 24 : 0,
          ...(contentMaxWidth
            ? { maxWidth: contentMaxWidth, alignSelf: "center" as const, width: "100%" as unknown as number }
            : {}),
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar Section */}
        <View style={{ alignItems: "center", marginBottom: 32 }}>
          <View
            style={{
              width: 88,
              height: 88,
              borderRadius: 44,
              backgroundColor: accentWarm,
              justifyContent: "center",
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            <Text
              style={{
                fontFamily: fontFamilyDisplayBold,
                fontSize: 32,
                color: white,
              }}
            >
              {initials}
            </Text>
          </View>
          <Text
            style={{
              fontFamily: fontFamilyDisplay,
              fontSize: fontSizeXl,
              color: textPrimary,
            }}
          >
            {displayName}
          </Text>
          <Text
            style={{
              fontFamily: fontFamilyBody,
              fontSize: fontSizeSm,
              color: textSecondary,
              marginTop: 4,
            }}
          >
            {email}
          </Text>
        </View>

        {/* Profile Info Section */}
        <Text
          style={{
            fontFamily: fontFamilyBodyMedium,
            fontSize: fontSizeSm,
            color: textTertiary,
            textTransform: "uppercase",
            letterSpacing: 0.5,
            marginBottom: 8,
          }}
        >
          Profile
        </Text>
        <View
          style={{
            backgroundColor: bgCard,
            borderRadius: radiusMd,
            padding: 16,
            marginBottom: 24,
            ...shadowSm,
          }}
        >
          {/* Display Name Row */}
          <View>
            <Text
              style={{
                fontFamily: fontFamilyBody,
                fontSize: fontSizeSm,
                color: textSecondary,
                marginBottom: 6,
              }}
            >
              Display Name
            </Text>
            {isEditing ? (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <TextInput
                  value={editName}
                  onChangeText={setEditName}
                  autoFocus
                  style={{
                    flex: 1,
                    fontFamily: fontFamilyBody,
                    fontSize: fontSizeBase,
                    color: textPrimary,
                    borderWidth: 1,
                    borderColor: accentBlue,
                    borderRadius: radiusMd,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    backgroundColor: bgPage,
                  }}
                  placeholder="Enter your name"
                  placeholderTextColor={textTertiary}
                />
                <Pressable
                  onPress={handleSaveName}
                  disabled={isSavingName || !editName.trim()}
                  style={{
                    padding: 8,
                    opacity: isSavingName || !editName.trim() ? 0.5 : 1,
                  }}
                >
                  {isSavingName ? (
                    <ActivityIndicator size="small" color={accentBlue} />
                  ) : (
                    <Check size={20} color={accentBlue} />
                  )}
                </Pressable>
                <Pressable
                  onPress={() => setIsEditing(false)}
                  style={{ padding: 8 }}
                >
                  <X size={20} color={textSecondary} />
                </Pressable>
              </View>
            ) : (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Text
                  style={{
                    fontFamily: fontFamilyBody,
                    fontSize: fontSizeBase,
                    color: textPrimary,
                  }}
                >
                  {displayName}
                </Text>
                <Pressable
                  onPress={() => {
                    setEditName(profile?.display_name || "");
                    setIsEditing(true);
                  }}
                  style={{ padding: 8 }}
                >
                  <Pencil size={18} color={textSecondary} />
                </Pressable>
              </View>
            )}
          </View>

          {/* Divider */}
          <View
            style={{
              height: 1,
              backgroundColor: borderDefault,
              marginVertical: 16,
            }}
          />

          {/* Email Row */}
          <View>
            <Text
              style={{
                fontFamily: fontFamilyBody,
                fontSize: fontSizeSm,
                color: textSecondary,
                marginBottom: 6,
              }}
            >
              Email
            </Text>
            <Text
              style={{
                fontFamily: fontFamilyBody,
                fontSize: fontSizeBase,
                color: textTertiary,
              }}
            >
              {email}
            </Text>
          </View>
        </View>

        {/* Preferences Section */}
        <Text
          style={{
            fontFamily: fontFamilyBodyMedium,
            fontSize: fontSizeSm,
            color: textTertiary,
            textTransform: "uppercase",
            letterSpacing: 0.5,
            marginBottom: 8,
          }}
        >
          Preferences
        </Text>
        <View
          style={{
            backgroundColor: bgCard,
            borderRadius: radiusMd,
            padding: 16,
            marginBottom: 32,
            ...shadowSm,
          }}
        >
          <Text
            style={{
              fontFamily: fontFamilyBody,
              fontSize: fontSizeSm,
              color: textSecondary,
              marginBottom: 10,
            }}
          >
            Measurement System
          </Text>
          <View style={{ flexDirection: "row", gap: 0 }}>
            <Pressable
              onPress={() => handleUnitChange("imperial")}
              disabled={isSavingUnit}
              style={{
                flex: 1,
                paddingVertical: 10,
                alignItems: "center",
                backgroundColor:
                  unitPref === "imperial" ? accentBlue : bgPage,
                borderTopLeftRadius: radiusMd,
                borderBottomLeftRadius: radiusMd,
                borderWidth: 1,
                borderColor:
                  unitPref === "imperial" ? accentBlue : borderDefault,
              }}
            >
              <Text
                style={{
                  fontFamily: fontFamilyBodyMedium,
                  fontSize: fontSizeBase,
                  color: unitPref === "imperial" ? white : textSecondary,
                }}
              >
                Imperial
              </Text>
            </Pressable>
            <Pressable
              onPress={() => handleUnitChange("metric")}
              disabled={isSavingUnit}
              style={{
                flex: 1,
                paddingVertical: 10,
                alignItems: "center",
                backgroundColor:
                  unitPref === "metric" ? accentBlue : bgPage,
                borderTopRightRadius: radiusMd,
                borderBottomRightRadius: radiusMd,
                borderWidth: 1,
                borderLeftWidth: 0,
                borderColor:
                  unitPref === "metric" ? accentBlue : borderDefault,
              }}
            >
              <Text
                style={{
                  fontFamily: fontFamilyBodyMedium,
                  fontSize: fontSizeBase,
                  color: unitPref === "metric" ? white : textSecondary,
                }}
              >
                Metric
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Legal Section */}
        <Text
          style={{
            fontFamily: fontFamilyBodyMedium,
            fontSize: fontSizeSm,
            color: textTertiary,
            textTransform: "uppercase",
            letterSpacing: 0.5,
            marginBottom: 8,
          }}
        >
          Legal
        </Text>
        <View
          style={{
            backgroundColor: bgCard,
            borderRadius: radiusMd,
            marginBottom: 24,
            ...shadowSm,
          }}
        >
          <Pressable
            onPress={() => router.push("/(public)/privacy")}
            accessibilityRole="link"
            accessibilityLabel="Privacy Policy"
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              padding: 16,
            }}
          >
            <Text
              style={{
                fontFamily: fontFamilyBody,
                fontSize: fontSizeBase,
                color: textPrimary,
              }}
            >
              Privacy Policy
            </Text>
            <ExternalLink size={18} color={textSecondary} />
          </Pressable>
        </View>

        {/* Account Section */}
        <Text
          style={{
            fontFamily: fontFamilyBodyMedium,
            fontSize: fontSizeSm,
            color: textTertiary,
            textTransform: "uppercase",
            letterSpacing: 0.5,
            marginBottom: 8,
          }}
        >
          Account
        </Text>
        <Pressable
          onPress={handleSignOut}
          style={{
            borderWidth: 1,
            borderColor: borderDefault,
            borderRadius: radiusMd,
            paddingVertical: 14,
            alignItems: "center",
            backgroundColor: bgPage,
            marginBottom: 48,
          }}
        >
          <Text
            style={{
              fontFamily: fontFamilyBodyMedium,
              fontSize: fontSizeBase,
              color: accentCoral,
            }}
          >
            Sign Out
          </Text>
        </Pressable>
      </ScrollView>
    </PageContainer>
  );
}
