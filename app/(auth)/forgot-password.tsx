import { Link } from 'expo-router';
import * as Linking from 'expo-linking';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { BookOpen, KeyRound } from 'lucide-react-native';

import { showAlert } from '@/lib/alert';
import { supabase } from '@/lib/supabase';
import { useBreakpoint } from '@/lib/hooks/useBreakpoint';
import {
  accentWarm,
  bgCard,
  borderDefault,
  fontFamilyBody,
  fontFamilyBodyBold,
  fontFamilyBodyMedium,
  fontFamilyDisplayBold,
  fontSizeXs,
  radiusLg,
  radiusPill,
  radiusSm,
  shadowMd,
  textPrimary,
  textSecondary,
  textTertiary,
  white,
} from '@/lib/tokens';

export default function ForgotPasswordScreen() {
  const { breakpoint } = useBreakpoint();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);

  async function onSubmit() {
    setIsSubmitting(true);
    try {
      const redirectTo = Linking.createURL('/(auth)/reset-password');
      const { data, error } = await supabase.functions.invoke('reset-request', {
        body: { email: email.trim().toLowerCase(), redirect_to: redirectTo },
      });

      if (error) {
        const status = (error as unknown as { context?: { status?: number } })?.context?.status;
        if (status === 404) {
          showAlert('Email not found', 'No account exists for that email.');
          return;
        }
        throw error;
      }

      void data;
      setIsSent(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Reset request failed';
      showAlert('Reset request failed', msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  const isMobile = breakpoint === 'mobile';
  const isTablet = breakpoint === 'tablet';
  const isWeb = breakpoint === 'web';

  // -- Success state --
  const successContent = (
    <>
      {!isWeb && (
        <View style={{ alignItems: 'center', gap: 8 }}>
          <KeyRound size={48} color={accentWarm} />
          <Text
            style={{ fontFamily: fontFamilyDisplayBold, fontSize: 32, color: textPrimary }}
          >
            Check your email
          </Text>
          <Text
            style={{
              fontFamily: fontFamilyBody,
              fontSize: 15,
              color: textSecondary,
              textAlign: 'center',
            }}
          >
            We sent a reset link to {email.trim().toLowerCase()}
          </Text>
          <Text
            style={{
              fontFamily: fontFamilyBody,
              fontSize: 13,
              color: textTertiary,
              textAlign: 'center',
              marginTop: 4,
            }}
          >
            It may take a few minutes to arrive. Check your spam folder if you don't see it.
          </Text>
        </View>
      )}

      {isWeb && (
        <View style={{ gap: 8 }}>
          <Text style={{ fontFamily: fontFamilyDisplayBold, fontSize: 28, color: textPrimary }}>
            Check your email
          </Text>
          <Text style={{ fontFamily: fontFamilyBody, fontSize: 15, color: textSecondary }}>
            We sent a reset link to {email.trim().toLowerCase()}
          </Text>
          <Text style={{ fontFamily: fontFamilyBody, fontSize: 13, color: textTertiary, marginTop: 4 }}>
            It may take a few minutes to arrive. Check your spam folder if you don't see it.
          </Text>
        </View>
      )}

      <View style={{ width: '100%', gap: 16 }}>
        <Link href="/(auth)/login" asChild>
          <Pressable
            style={({ pressed }) => ({
              height: 48,
              backgroundColor: accentWarm,
              borderRadius: radiusPill,
              justifyContent: 'center',
              alignItems: 'center',
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <Text style={{ fontFamily: fontFamilyBodyBold, fontSize: 15, color: white }}>
              Back to Sign In
            </Text>
          </Pressable>
        </Link>
      </View>
    </>
  );

  // -- Form content --
  const formContent = isSent ? successContent : (
    <>
      {/* Logo area - mobile/tablet */}
      {!isWeb && (
        <View style={{ alignItems: 'center', gap: 8 }}>
          <KeyRound size={48} color={accentWarm} />
          <Text
            style={{ fontFamily: fontFamilyDisplayBold, fontSize: 32, color: textPrimary }}
          >
            Reset Password
          </Text>
          <Text
            style={{
              fontFamily: fontFamilyBody,
              fontSize: 15,
              color: textSecondary,
              textAlign: 'center',
            }}
          >
            Enter your email to receive a reset link
          </Text>
        </View>
      )}

      {/* Web header */}
      {isWeb && (
        <View style={{ gap: 8 }}>
          <Text style={{ fontFamily: fontFamilyDisplayBold, fontSize: 28, color: textPrimary }}>
            Reset your password
          </Text>
          <Text style={{ fontFamily: fontFamilyBody, fontSize: 15, color: textSecondary }}>
            We'll send you a link to get back in
          </Text>
        </View>
      )}

      {/* Form */}
      <View style={{ width: '100%', gap: 16 }}>
        {/* Email */}
        <View style={{ gap: 6 }}>
          <Text
            style={{ fontFamily: fontFamilyBodyBold, fontSize: fontSizeXs + 1, color: textPrimary }}
          >
            Email
          </Text>
          <TextInput
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            placeholder="you@example.com"
            placeholderTextColor={textTertiary}
            value={email}
            onChangeText={setEmail}
            returnKeyType="go"
            onSubmitEditing={onSubmit}
            style={{
              height: 48,
              backgroundColor: bgCard,
              borderRadius: radiusSm,
              borderWidth: 1,
              borderColor: borderDefault,
              paddingHorizontal: 16,
              fontFamily: fontFamilyBody,
              fontSize: 15,
              color: textPrimary,
            }}
          />
        </View>

        {/* Send Reset Link button (Primary) */}
        <Pressable
          onPress={onSubmit}
          disabled={isSubmitting}
          style={({ pressed }) => ({
            height: 48,
            backgroundColor: accentWarm,
            borderRadius: radiusPill,
            justifyContent: 'center',
            alignItems: 'center',
            opacity: pressed || isSubmitting ? 0.8 : 1,
          })}
        >
          {isSubmitting ? (
            <ActivityIndicator color={white} />
          ) : (
            <Text style={{ fontFamily: fontFamilyBodyBold, fontSize: 15, color: white }}>
              Send Reset Link
            </Text>
          )}
        </Pressable>

        {/* Back to Sign In link */}
        <Link href="/(auth)/login" asChild>
          <Pressable>
            <Text
              style={{
                fontFamily: fontFamilyBodyMedium,
                fontSize: 14,
                color: accentWarm,
                textAlign: 'center',
              }}
            >
              Back to Sign In
            </Text>
          </Pressable>
        </Link>
      </View>
    </>
  );

  // -- Mobile --
  if (isMobile) {
    return (
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'center',
          alignItems: 'center',
          padding: 24,
          gap: 32,
          backgroundColor: white,
        }}
        keyboardShouldPersistTaps="handled"
      >
        {formContent}
      </ScrollView>
    );
  }

  // -- Tablet --
  if (isTablet) {
    return (
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: bgCard,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <View
          style={{
            width: 440,
            backgroundColor: white,
            borderRadius: radiusLg,
            padding: 40,
            gap: 32,
            alignItems: 'center',
            ...shadowMd,
          }}
        >
          {formContent}
        </View>
      </ScrollView>
    );
  }

  // -- Web --
  return (
    <View style={{ flex: 1, flexDirection: 'row', backgroundColor: white }}>
      {/* Hero side */}
      <View
        style={{
          flex: 1,
          backgroundColor: '#F5EDE4',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 60,
          gap: 24,
        }}
      >
        <BookOpen size={80} color={accentWarm} />
        <Text
          style={{
            fontFamily: fontFamilyDisplayBold,
            fontSize: 48,
            color: textPrimary,
          }}
        >
          Cookbook
        </Text>
        <Text
          style={{
            fontFamily: fontFamilyBody,
            fontSize: 18,
            color: textSecondary,
            textAlign: 'center',
            maxWidth: 360,
            lineHeight: 27,
          }}
        >
          Preserve, share, and celebrate your family's culinary heritage.
        </Text>
      </View>

      {/* Form side */}
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'center',
          paddingHorizontal: 60,
          gap: 32,
          width: 520,
        }}
        style={{ width: 520 }}
        keyboardShouldPersistTaps="handled"
      >
        {formContent}
      </ScrollView>
    </View>
  );
}
