import { Platform } from 'react-native';
import * as AuthSession from 'expo-auth-session';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import * as WebBrowser from 'expo-web-browser';

import { supabase } from '@/lib/supabase';

// Ensure web browser auth sessions are properly dismissed
WebBrowser.maybeCompleteAuthSession();

const redirectUri = AuthSession.makeRedirectUri({ path: 'auth/callback' });

/**
 * Sign in with Google OAuth via Supabase.
 * On native: opens an in-app browser session.
 * On web: Supabase handles the redirect automatically.
 */
export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: redirectUri },
  });

  if (error) return { data: null, error };

  // On native, open the auth URL in an in-app browser
  if (Platform.OS !== 'web' && data.url) {
    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUri);
    if (result.type === 'success' && result.url) {
      const params = new URL(result.url).hash.substring(1);
      const urlParams = new URLSearchParams(params);
      const accessToken = urlParams.get('access_token');
      const refreshToken = urlParams.get('refresh_token');
      if (accessToken && refreshToken) {
        const sessionResult = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        return { data: sessionResult.data, error: sessionResult.error };
      }
    }
    return { data: null, error: null };
  }

  return { data, error: null };
}

/**
 * Sign in with Apple.
 * On iOS: uses native Apple Authentication with nonce verification.
 * On other platforms: falls back to OAuth flow like Google.
 */
export async function signInWithApple() {
  if (Platform.OS === 'ios') {
    try {
      // Generate nonce for security — Apple gets the hash, Supabase gets the raw
      const rawNonce = Crypto.randomUUID();
      const hashedNonce = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        rawNonce,
      );

      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce: hashedNonce,
      });

      if (!credential.identityToken) {
        return { data: null, error: new Error('No identity token from Apple') };
      }

      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
        nonce: rawNonce,
      });

      // Apple only provides full name on first sign-in — capture it immediately
      if (!error && credential.fullName) {
        const { givenName, familyName } = credential.fullName;
        if (givenName || familyName) {
          const displayName = [givenName, familyName].filter(Boolean).join(' ');
          await supabase.auth.updateUser({ data: { full_name: displayName } });
        }
      }

      return { data, error };
    } catch (e) {
      // User cancelled or other Apple auth error
      return { data: null, error: e instanceof Error ? e : new Error('Apple sign in failed') };
    }
  }

  // Non-iOS: use OAuth flow
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'apple',
    options: { redirectTo: redirectUri },
  });

  if (error) return { data: null, error };

  if (Platform.OS !== 'web' && data.url) {
    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUri);
    if (result.type === 'success' && result.url) {
      const params = new URL(result.url).hash.substring(1);
      const urlParams = new URLSearchParams(params);
      const accessToken = urlParams.get('access_token');
      const refreshToken = urlParams.get('refresh_token');
      if (accessToken && refreshToken) {
        const sessionResult = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        return { data: sessionResult.data, error: sessionResult.error };
      }
    }
    return { data: null, error: null };
  }

  return { data, error: null };
}

/**
 * Sign in with Facebook OAuth via Supabase.
 * Same pattern as Google.
 */
export async function signInWithFacebook() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'facebook',
    options: { redirectTo: redirectUri },
  });

  if (error) return { data: null, error };

  if (Platform.OS !== 'web' && data.url) {
    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUri);
    if (result.type === 'success' && result.url) {
      const params = new URL(result.url).hash.substring(1);
      const urlParams = new URLSearchParams(params);
      const accessToken = urlParams.get('access_token');
      const refreshToken = urlParams.get('refresh_token');
      if (accessToken && refreshToken) {
        const sessionResult = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        return { data: sessionResult.data, error: sessionResult.error };
      }
    }
    return { data: null, error: null };
  }

  return { data, error: null };
}

/**
 * Check if native Apple authentication is available (iOS only).
 */
export function isAppleNativeAvailable(): boolean {
  return Platform.OS === 'ios';
}
