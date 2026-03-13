import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Platform, Pressable, Text, TextInput, View } from "react-native";

import { showAlert } from "@/lib/alert";
import { isValidPassword } from "@/features/auth/password";
import { supabase } from "@/lib/supabase";
import {
  accentGreen,
  accentWarm,
  bgCard,
  borderDefault,
  fontFamilyBody,
  fontFamilyBodyBold,
  fontFamilyBodyMedium,
  fontFamilyDisplayBold,
  fontSizeBase,
  fontSizeSm,
  fontSizeXs,
  radiusMd,
  radiusPill,
  textPrimary,
  textSecondary,
  textTertiary,
  white,
} from "@/lib/tokens";

function parseParamsFromHash(hash: string): Record<string, string> {
  const raw = hash.startsWith("#") ? hash.slice(1) : hash;
  const params = new URLSearchParams(raw);
  const out: Record<string, string> = {};
  for (const [k, v] of params.entries()) out[k] = v;
  return out;
}

export default function ResetPasswordScreen() {
  const { access_token, refresh_token } = useLocalSearchParams<{
    access_token?: string;
    refresh_token?: string;
  }>();
  const [password, setPassword] = useState("");
  const [isReady, setIsReady] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const hashParams = useMemo(() => {
    if (Platform.OS !== "web") return null;
    if (typeof window === "undefined") return null;
    return parseParamsFromHash(window.location.hash ?? "");
  }, []);

  useEffect(() => {
    async function init() {
      try {
        const accessToken =
          (Platform.OS === "web" ? hashParams?.access_token : null) ??
          (typeof access_token === "string" ? access_token : null);
        const refreshToken =
          (Platform.OS === "web" ? hashParams?.refresh_token : null) ??
          (typeof refresh_token === "string" ? refresh_token : null);

        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) throw error;
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Invalid reset link";
        showAlert("Reset link error", msg);
      } finally {
        setIsReady(true);
      }
    }

    void init();
  }, [hashParams, access_token, refresh_token]);

  async function onUpdatePassword() {
    setErrorMsg(null);

    if (!isValidPassword(password)) {
      setErrorMsg("Use at least 8 characters and include a number or symbol.");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        // Supabase returns this message when the new password matches the old one
        if (
          error.message?.toLowerCase().includes("same password") ||
          error.message?.toLowerCase().includes("different from the old password")
        ) {
          setErrorMsg("New password must be different from your current password.");
          return;
        }
        throw error;
      }
      setIsSuccess(true);
      // Navigate after a brief delay so user sees the success state
      setTimeout(() => {
        router.replace("/");
      }, 2000);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Password update failed";
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isReady) {
    return (
      <View style={{ flex: 1, padding: 24, justifyContent: "center", alignItems: "center", gap: 12 }}>
        <ActivityIndicator size="large" color={accentWarm} />
        <Text style={{ fontFamily: fontFamilyBody, fontSize: fontSizeBase, color: textSecondary }}>
          Preparing...
        </Text>
      </View>
    );
  }

  if (isSuccess) {
    return (
      <View style={{ flex: 1, padding: 24, justifyContent: "center", alignItems: "center", gap: 16 }}>
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: 32,
            backgroundColor: accentGreen + "20",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ fontSize: 28 }}>✓</Text>
        </View>
        <Text
          style={{
            fontFamily: fontFamilyDisplayBold,
            fontSize: 22,
            color: textPrimary,
            textAlign: "center",
          }}
        >
          Password updated
        </Text>
        <Text
          style={{
            fontFamily: fontFamilyBody,
            fontSize: fontSizeBase,
            color: textSecondary,
            textAlign: "center",
          }}
        >
          You're all set. Redirecting you now...
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, padding: 24, gap: 16, justifyContent: "center", maxWidth: 440, alignSelf: "center", width: "100%" }}>
      <Text
        style={{
          fontFamily: fontFamilyDisplayBold,
          fontSize: 22,
          color: textPrimary,
          marginBottom: 4,
        }}
      >
        Choose a new password
      </Text>

      <View style={{ gap: 6 }}>
        <Text
          style={{ fontFamily: fontFamilyBodyBold, fontSize: fontSizeXs + 1, color: textPrimary }}
        >
          New Password
        </Text>
        <TextInput
          autoCapitalize="none"
          autoComplete="new-password"
          placeholder="New password"
          placeholderTextColor={textTertiary}
          value={password}
          onChangeText={(t) => {
            setPassword(t);
            setErrorMsg(null);
          }}
          secureTextEntry
          returnKeyType="go"
          onSubmitEditing={onUpdatePassword}
          style={{
            height: 48,
            backgroundColor: bgCard,
            borderRadius: radiusMd,
            borderWidth: 1,
            borderColor: errorMsg ? accentWarm : borderDefault,
            paddingHorizontal: 16,
            fontFamily: fontFamilyBody,
            fontSize: fontSizeBase,
            color: textPrimary,
          }}
        />
        <Text
          style={{
            fontFamily: fontFamilyBody,
            fontSize: fontSizeSm - 1,
            color: textTertiary,
          }}
        >
          8+ characters, must include a number or symbol.
        </Text>
      </View>

      {errorMsg && (
        <Text
          style={{
            fontFamily: fontFamilyBodyMedium,
            fontSize: fontSizeSm,
            color: accentWarm,
          }}
        >
          {errorMsg}
        </Text>
      )}

      <Pressable
        onPress={onUpdatePassword}
        disabled={isSubmitting}
        style={({ pressed }) => ({
          height: 48,
          backgroundColor: accentWarm,
          borderRadius: radiusPill,
          justifyContent: "center",
          alignItems: "center",
          opacity: pressed || isSubmitting ? 0.8 : 1,
        })}
      >
        {isSubmitting ? (
          <ActivityIndicator color={white} />
        ) : (
          <Text style={{ fontFamily: fontFamilyBodyBold, fontSize: fontSizeBase, color: white }}>
            Update password
          </Text>
        )}
      </Pressable>
    </View>
  );
}
