import { Link, router, useLocalSearchParams } from 'expo-router';
import type { Href } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { BookOpen } from 'lucide-react-native';
import * as AppleAuthentication from 'expo-apple-authentication';

import { supabase } from '@/lib/supabase';
import { useBreakpoint } from '@/lib/hooks/useBreakpoint';
import {
  signInWithGoogle,
  signInWithApple,
  signInWithFacebook,
  isAppleNativeAvailable,
} from '@/features/auth/social-auth';
import {
  accentWarm,
  bgCard,
  borderDefault,
  fontFamilyBody,
  fontFamilyBodyBold,
  fontFamilyBodyMedium,
  fontFamilyDisplay,
  fontFamilyDisplayBold,
  fontSizeBase,
  fontSizeSm,
  fontSizeXs,
  radiusLg,
  radiusMd,
  radiusPill,
  radiusSm,
  shadowMd,
  textPrimary,
  textSecondary,
  textTertiary,
  white,
} from '@/lib/tokens';

export default function LoginScreen() {
  const { next } = useLocalSearchParams<{ next?: string }>();
  const { breakpoint } = useBreakpoint();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [socialLoading, setSocialLoading] = useState<string | null>(null);

  async function onLogin() {
    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (error) throw error;
      const target = typeof next === 'string' && next.startsWith('/') ? next : '/(tabs)';
      router.replace(target as Href);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Login failed';
      Alert.alert('Login failed', msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSocialLogin(provider: 'google' | 'apple' | 'facebook') {
    setSocialLoading(provider);
    try {
      const fn =
        provider === 'google'
          ? signInWithGoogle
          : provider === 'apple'
            ? signInWithApple
            : signInWithFacebook;
      const { error } = await fn();
      if (error) throw error;
      const target = typeof next === 'string' && next.startsWith('/') ? next : '/(tabs)';
      router.replace(target as Href);
    } catch (e) {
      const msg = e instanceof Error ? e.message : `${provider} login failed`;
      Alert.alert('Login failed', msg);
    } finally {
      setSocialLoading(null);
    }
  }

  const isMobile = breakpoint === 'mobile';
  const isTablet = breakpoint === 'tablet';
  const isWeb = breakpoint === 'web';

  // -- Form content (shared across breakpoints) --
  const formContent = (
    <>
      {/* Logo area - mobile/tablet only (web has separate hero) */}
      {!isWeb && (
        <View style={{ alignItems: 'center', gap: 8 }}>
          <BookOpen size={48} color={accentWarm} />
          <Text
            style={{
              fontFamily: fontFamilyDisplayBold,
              fontSize: 32,
              color: textPrimary,
            }}
          >
            Cookbook
          </Text>
          <Text
            style={{
              fontFamily: fontFamilyBody,
              fontSize: 15,
              color: textSecondary,
            }}
          >
            Your family recipe vault
          </Text>
        </View>
      )}

      {/* Web header */}
      {isWeb && (
        <View style={{ gap: 8 }}>
          <Text
            style={{
              fontFamily: fontFamilyDisplayBold,
              fontSize: 28,
              color: textPrimary,
            }}
          >
            Welcome back
          </Text>
          <Text
            style={{
              fontFamily: fontFamilyBody,
              fontSize: 15,
              color: textSecondary,
            }}
          >
            Sign in to your account
          </Text>
        </View>
      )}

      {/* Form fields */}
      <View style={{ width: '100%', gap: 16 }}>
        {/* Email */}
        <View style={{ gap: 6 }}>
          <Text style={{ fontFamily: fontFamilyBodyBold, fontSize: fontSizeXs + 1, color: textPrimary }}>
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

        {/* Password */}
        <View style={{ gap: 6 }}>
          <Text style={{ fontFamily: fontFamilyBodyBold, fontSize: fontSizeXs + 1, color: textPrimary }}>
            Password
          </Text>
          <TextInput
            autoCapitalize="none"
            autoComplete="password"
            placeholder="Enter your password"
            placeholderTextColor={textTertiary}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            returnKeyType="go"
            onSubmitEditing={onLogin}
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

        {/* Forgot password link */}
        <Link href="/(auth)/forgot-password" asChild>
          <Pressable>
            <Text
              style={{
                fontFamily: fontFamilyBodyMedium,
                fontSize: fontSizeXs + 1,
                color: accentWarm,
                textAlign: 'right',
              }}
            >
              Forgot password?
            </Text>
          </Pressable>
        </Link>

        {/* Sign In button (Primary) */}
        <Pressable
          onPress={onLogin}
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
              Sign In
            </Text>
          )}
        </Pressable>

        {/* Sign up prompt — immediately visible below Sign In button */}
        <View style={{ alignItems: 'center', marginTop: 12 }}>
          <Link href={{ pathname: '/(auth)/signup', params: { next } }} asChild>
            <Pressable>
              <Text style={{ fontFamily: fontFamilyBody, fontSize: 14, color: textSecondary }}>
                Don't have an account?{' '}
                <Text style={{ fontFamily: fontFamilyBodyBold, color: accentWarm }}>Sign Up</Text>
              </Text>
            </Pressable>
          </Link>
        </View>

        {/* Divider */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ flex: 1, height: 1, backgroundColor: borderDefault }} />
          <Text style={{ fontFamily: fontFamilyBody, fontSize: fontSizeXs + 1, color: textTertiary }}>
            or
          </Text>
          <View style={{ flex: 1, height: 1, backgroundColor: borderDefault }} />
        </View>

        {/* Social login buttons */}
        <View style={{ gap: 12 }}>
          {/* Google */}
          <Pressable
            onPress={() => handleSocialLogin('google')}
            disabled={socialLoading !== null}
            style={({ pressed }) => ({
              height: 48,
              backgroundColor: white,
              borderRadius: radiusMd,
              borderWidth: 1,
              borderColor: borderDefault,
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 10,
              opacity: pressed || socialLoading === 'google' ? 0.8 : 1,
            })}
          >
            {socialLoading === 'google' ? (
              <ActivityIndicator color={textPrimary} />
            ) : (
              <Text style={{ fontFamily: fontFamilyBodyMedium, fontSize: 15, color: textPrimary }}>
                Continue with Google
              </Text>
            )}
          </Pressable>

          {/* Apple */}
          {isAppleNativeAvailable() ? (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
              buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
              cornerRadius={radiusMd}
              style={{ height: 48, width: '100%' }}
              onPress={() => handleSocialLogin('apple')}
            />
          ) : (
            <Pressable
              onPress={() => handleSocialLogin('apple')}
              disabled={socialLoading !== null}
              style={({ pressed }) => ({
                height: 48,
                backgroundColor: '#000000',
                borderRadius: radiusMd,
                flexDirection: 'row',
                justifyContent: 'center',
                alignItems: 'center',
                gap: 10,
                opacity: pressed || socialLoading === 'apple' ? 0.8 : 1,
              })}
            >
              {socialLoading === 'apple' ? (
                <ActivityIndicator color={white} />
              ) : (
                <Text style={{ fontFamily: fontFamilyBodyMedium, fontSize: 15, color: white }}>
                  Continue with Apple
                </Text>
              )}
            </Pressable>
          )}

          {/* Facebook */}
          <Pressable
            onPress={() => handleSocialLogin('facebook')}
            disabled={socialLoading !== null}
            style={({ pressed }) => ({
              height: 48,
              backgroundColor: '#1877F2',
              borderRadius: radiusMd,
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 10,
              opacity: pressed || socialLoading === 'facebook' ? 0.8 : 1,
            })}
          >
            {socialLoading === 'facebook' ? (
              <ActivityIndicator color={white} />
            ) : (
              <Text style={{ fontFamily: fontFamilyBodyMedium, fontSize: 15, color: white }}>
                Continue with Facebook
              </Text>
            )}
          </Pressable>
        </View>

      </View>
    </>
  );

  // -- Mobile layout --
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

  // -- Tablet layout --
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

  // -- Web layout --
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
