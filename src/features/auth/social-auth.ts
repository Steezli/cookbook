import { Platform } from 'react-native';
import * as AuthSession from 'expo-auth-session';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import * as WebBrowser from 'expo-web-browser';

import { supabase } from '@/lib/supabase';

WebBrowser.maybeCompleteAuthSession();

const redirectUri = AuthSession.makeRedirectUri({ path: 'auth/callback' });

type OAuthProvider = 'google' | 'apple' | 'facebook';

/**
 * Shared OAuth redirect flow for native platforms.
 * Initiates Supabase OAuth, opens an in-app browser on native,
 * then extracts tokens from the redirect URL and sets the session.
 * On web, Supabase handles the redirect automatically.
 */
async function handleOAuthRedirect(provider: OAuthProvider) {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
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

export async function signInWithGoogle() {
  return handleOAuthRedirect('google');
}

/**
 * On iOS: uses native Apple Authentication with nonce verification.
 * On other platforms: falls back to standard OAuth redirect flow.
 */
export async function signInWithApple() {
  if (Platform.OS === 'ios') {
    try {
      // Apple gets the SHA-256 hash, Supabase gets the raw nonce for verification
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
      return { data: null, error: e instanceof Error ? e : new Error('Apple sign in failed') };
    }
  }

  return handleOAuthRedirect('apple');
}

export async function signInWithFacebook() {
  return handleOAuthRedirect('facebook');
}

export function isAppleNativeAvailable(): boolean {
  return Platform.OS === 'ios';
}
