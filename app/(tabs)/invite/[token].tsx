import { Link, router, Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  Text,
  View,
} from "react-native";

import { useSession } from "@/features/auth/session";
import { PageContainer } from "@/components/nav/PageContainer";
import { useBreakpoint } from "@/lib/hooks/useBreakpoint";
import { supabase } from "@/lib/supabase";
import {
  accentBlue,
  accentCoral,
  accentGreen,
  bgCard,
  borderDefault,
  fontFamilyBody,
  fontFamilyBodyBold,
  fontFamilyBodyMedium,
  fontFamilyDisplay,
  fontSize2xl,
  fontSizeBase,
  fontSizeLg,
  fontSizeSm,
  radiusMd,
  shadowMd,
  textPrimary,
  textSecondary,
  textTertiary,
  white,
} from "@/lib/tokens";

type InviteState = "loading" | "valid" | "expired" | "accepted" | "invalid" | "success" | "error";

export default function AcceptInviteScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const inviteToken = typeof token === "string" ? token : null;

  const { session, isLoading } = useSession();
  const { breakpoint } = useBreakpoint();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inviteState, setInviteState] = useState<InviteState>("loading");
  const [familyName, setFamilyName] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isMobile = breakpoint === "mobile";

  // Auto-accept if signed in
  useEffect(() => {
    if (!isLoading && session && inviteToken) {
      void accept();
    }
  }, [isLoading, session, inviteToken]);

  // If not signed in, show the invite (mark as valid after brief delay)
  useEffect(() => {
    if (!isLoading && !session && inviteToken) {
      setInviteState("valid");
    }
  }, [isLoading, session, inviteToken]);

  async function accept() {
    if (!inviteToken) return;
    setIsSubmitting(true);
    setInviteState("loading");
    try {
      const { data, error } = await supabase.rpc("accept_family_invite", {
        p_token: inviteToken,
      });
      if (error) {
        const msg = error.message?.toLowerCase() ?? "";
        if (msg.includes("expired")) {
          setInviteState("expired");
        } else if (msg.includes("accepted") || msg.includes("already")) {
          setInviteState("accepted");
        } else {
          setInviteState("error");
          setErrorMessage(error.message);
        }
        return;
      }
      const familyId = data as string;
      setInviteState("success");
      // Brief delay to show success state
      setTimeout(() => {
        router.replace(`/family/${familyId}`);
      }, 1500);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Invalid invite";
      setInviteState("error");
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!inviteToken) {
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
            Invite
          </Text>
          <Text
            style={{
              fontFamily: fontFamilyBody,
              fontSize: fontSizeBase,
              color: textSecondary,
              textAlign: "center",
            }}
          >
            Missing invite token.
          </Text>
        </View>
      </PageContainer>
    );
  }

  const cardStyle = isMobile
    ? { padding: 24 }
    : {
        maxWidth: 480,
        alignSelf: "center" as const,
        width: "100%" as const,
        backgroundColor: bgCard,
        borderRadius: radiusMd,
        padding: 32,
        ...shadowMd,
      };

  function renderContent() {
    // Loading state
    if (isLoading || inviteState === "loading") {
      return (
        <View style={{ alignItems: "center", gap: 16 }}>
          <ActivityIndicator size="large" color={accentBlue} />
          <Text
            style={{
              fontFamily: fontFamilyBody,
              fontSize: fontSizeBase,
              color: textSecondary,
              textAlign: "center",
            }}
          >
            {isSubmitting ? "Joining family..." : "Checking invite..."}
          </Text>
        </View>
      );
    }

    // Success state
    if (inviteState === "success") {
      return (
        <View style={{ alignItems: "center", gap: 16 }}>
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              backgroundColor: accentGreen,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ fontSize: 28, color: white }}>
              {"\u2713"}
            </Text>
          </View>
          <Text
            style={{
              fontFamily: fontFamilyDisplay,
              fontSize: fontSize2xl,
              color: textPrimary,
              textAlign: "center",
            }}
          >
            {familyName
              ? `You've joined ${familyName}!`
              : "You've joined the family!"}
          </Text>
          <Text
            style={{
              fontFamily: fontFamilyBody,
              fontSize: fontSizeSm,
              color: textSecondary,
              textAlign: "center",
            }}
          >
            Redirecting...
          </Text>
        </View>
      );
    }

    // Error states
    if (inviteState === "expired") {
      return (
        <View style={{ alignItems: "center", gap: 16 }}>
          <Text
            style={{
              fontFamily: fontFamilyDisplay,
              fontSize: fontSize2xl,
              color: textPrimary,
              textAlign: "center",
            }}
          >
            Invite Expired
          </Text>
          <Text
            style={{
              fontFamily: fontFamilyBody,
              fontSize: fontSizeBase,
              color: textSecondary,
              textAlign: "center",
            }}
          >
            This invite link has expired. Please ask for a new one.
          </Text>
        </View>
      );
    }

    if (inviteState === "accepted") {
      return (
        <View style={{ alignItems: "center", gap: 16 }}>
          <Text
            style={{
              fontFamily: fontFamilyDisplay,
              fontSize: fontSize2xl,
              color: textPrimary,
              textAlign: "center",
            }}
          >
            Already Accepted
          </Text>
          <Text
            style={{
              fontFamily: fontFamilyBody,
              fontSize: fontSizeBase,
              color: textSecondary,
              textAlign: "center",
            }}
          >
            This invite has already been used.
          </Text>
          <Pressable
            onPress={() => router.push("/family")}
            style={({ pressed }) => ({
              backgroundColor: accentBlue,
              borderRadius: radiusMd,
              paddingVertical: 12,
              paddingHorizontal: 24,
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <Text
              style={{
                fontFamily: fontFamilyBodyMedium,
                fontSize: fontSizeBase,
                color: white,
              }}
            >
              Go to Families
            </Text>
          </Pressable>
        </View>
      );
    }

    if (inviteState === "error") {
      return (
        <View style={{ alignItems: "center", gap: 16 }}>
          <Text
            style={{
              fontFamily: fontFamilyDisplay,
              fontSize: fontSize2xl,
              color: textPrimary,
              textAlign: "center",
            }}
          >
            Invalid Invite
          </Text>
          <Text
            style={{
              fontFamily: fontFamilyBody,
              fontSize: fontSizeBase,
              color: textSecondary,
              textAlign: "center",
            }}
          >
            {errorMessage || "This invite link is not valid."}
          </Text>
        </View>
      );
    }

    // Valid invite, not signed in — dual-path
    if (!session) {
      const next = `/invite/${inviteToken}`;
      return (
        <View style={{ alignItems: "center", gap: 20 }}>
          {/* Icon */}
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              backgroundColor: accentBlue,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text
              style={{
                fontFamily: fontFamilyBodyBold,
                fontSize: 24,
                color: white,
              }}
            >
              {"\uD83D\uDC68\u200D\uD83D\uDC69\u200D\uD83D\uDC67"}
            </Text>
          </View>

          <Text
            style={{
              fontFamily: fontFamilyDisplay,
              fontSize: fontSize2xl,
              color: textPrimary,
              textAlign: "center",
            }}
          >
            You've been invited to join a family!
          </Text>

          <Text
            style={{
              fontFamily: fontFamilyBody,
              fontSize: fontSizeBase,
              color: textSecondary,
              textAlign: "center",
            }}
          >
            Sign up or log in to accept this invitation.
          </Text>

          {/* Sign Up Button */}
          <Pressable
            onPress={() =>
              router.push({
                pathname: "/(auth)/signup",
                params: { next },
              })
            }
            style={({ pressed }) => ({
              backgroundColor: accentBlue,
              borderRadius: radiusMd,
              paddingVertical: 14,
              width: "100%" as const,
              alignItems: "center" as const,
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <Text
              style={{
                fontFamily: fontFamilyBodyMedium,
                fontSize: fontSizeBase,
                color: white,
              }}
            >
              Sign Up to Join
            </Text>
          </Pressable>

          {/* Sign In Link */}
          <Pressable
            onPress={() =>
              router.push({
                pathname: "/(auth)/login",
                params: { next },
              })
            }
            style={({ pressed }) => ({
              borderWidth: 1,
              borderColor: borderDefault,
              borderRadius: radiusMd,
              paddingVertical: 14,
              width: "100%" as const,
              alignItems: "center" as const,
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <Text
              style={{
                fontFamily: fontFamilyBodyMedium,
                fontSize: fontSizeBase,
                color: textPrimary,
              }}
            >
              Already have an account? Sign In
            </Text>
          </Pressable>
        </View>
      );
    }

    // Valid invite, signed in — accept button
    return (
      <View style={{ alignItems: "center", gap: 20 }}>
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: 32,
            backgroundColor: accentBlue,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text
            style={{
              fontFamily: fontFamilyBodyBold,
              fontSize: 24,
              color: white,
            }}
          >
            {"\uD83D\uDC68\u200D\uD83D\uDC69\u200D\uD83D\uDC67"}
          </Text>
        </View>

        <Text
          style={{
            fontFamily: fontFamilyDisplay,
            fontSize: fontSize2xl,
            color: textPrimary,
            textAlign: "center",
          }}
        >
          {familyName
            ? `You've been invited to join ${familyName}!`
            : "You've been invited to join a family!"}
        </Text>

        <Pressable
          onPress={accept}
          disabled={isSubmitting}
          style={({ pressed }) => ({
            backgroundColor: accentBlue,
            borderRadius: radiusMd,
            paddingVertical: 14,
            width: "100%" as const,
            alignItems: "center" as const,
            opacity: pressed || isSubmitting ? 0.7 : 1,
          })}
        >
          <Text
            style={{
              fontFamily: fontFamilyBodyMedium,
              fontSize: fontSizeBase,
              color: white,
            }}
          >
            {isSubmitting ? "Joining..." : "Accept Invite"}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => ({
            borderWidth: 1,
            borderColor: borderDefault,
            borderRadius: radiusMd,
            paddingVertical: 14,
            width: "100%" as const,
            alignItems: "center" as const,
            opacity: pressed ? 0.85 : 1,
          })}
        >
          <Text
            style={{
              fontFamily: fontFamilyBodyMedium,
              fontSize: fontSizeBase,
              color: textSecondary,
            }}
          >
            Decline
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <PageContainer>
      <Stack.Screen options={{ title: "Accept Invite" }} />
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          ...cardStyle,
        }}
      >
        {renderContent()}
      </View>
    </PageContainer>
  );
}
