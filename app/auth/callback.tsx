import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { accentBlue, bgPage } from '@/lib/tokens';

/**
 * OAuth callback handler.
 *
 * After social login (Google, Apple, Facebook), Supabase redirects to
 * /auth/callback#access_token=...&refresh_token=...
 *
 * This route extracts the tokens from the URL hash fragment,
 * sets the Supabase session, and redirects to the app.
 */
export default function AuthCallbackScreen() {
  const router = useRouter();

  useEffect(() => {
    async function handleCallback() {
      try {
        // On web, the hash fragment contains the tokens
        if (typeof window !== 'undefined' && window.location.hash) {
          const params = new URLSearchParams(
            window.location.hash.substring(1),
          );
          const accessToken = params.get('access_token');
          const refreshToken = params.get('refresh_token');

          if (accessToken && refreshToken) {
            const { error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

            if (error) {
              console.error('[AuthCallback] Failed to set session:', error.message);
              router.replace('/(auth)/login');
              return;
            }

            router.replace('/(tabs)');
            return;
          }
        }

        // If no tokens found, check if we already have a session
        // (Supabase JS client may have picked them up automatically)
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          router.replace('/(tabs)');
        } else {
          router.replace('/(auth)/login');
        }
      } catch (error) {
        console.error('[AuthCallback]', error);
        router.replace('/(auth)/login');
      }
    }

    handleCallback();
  }, [router]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: bgPage }}>
      <ActivityIndicator size="large" color={accentBlue} />
    </View>
  );
}
