import { useFonts } from "expo-font";
import {
  BricolageGrotesque_400Regular,
  BricolageGrotesque_600SemiBold,
  BricolageGrotesque_700Bold,
} from "@expo-google-fonts/bricolage-grotesque";
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_700Bold,
} from "@expo-google-fonts/dm-sans";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { Platform } from "react-native";
import { Stack } from "expo-router";

import { getConsentStatus } from "@/features/ads/consent";
import { requestTrackingPermission } from "@/features/ads/att";

import { SafeAreaProvider } from "react-native-safe-area-context";
import { SessionProvider } from "@/features/auth/session";
import ErrorBoundary from "@/components/ErrorBoundary";

// Hold the splash screen until fonts finish loading.
// Must be called at module level — before any component renders.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    BricolageGrotesque_400Regular,
    BricolageGrotesque_600SemiBold,
    BricolageGrotesque_700Bold,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  // GDPR→ATT consent sequencing: resolve GDPR consent first, then prompt ATT on iOS.
  // Runs once on app mount. Failures are warned but never crash the app.
  useEffect(() => {
    async function runConsentSequence() {
      try {
        const consentStatus = await getConsentStatus();

        if (consentStatus === 'obtained' && Platform.OS === 'ios') {
          await requestTrackingPermission();
        }
      } catch (error) {
        console.warn(
          '[ConsentSequence]',
          error instanceof Error ? error.message : String(error),
        );
      }
    }

    runConsentSequence();
  }, []);

  // Keep splash screen visible while fonts are loading.
  // If fonts fail (fontError), we still render — graceful degradation.
  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <SessionProvider>
        <ErrorBoundary>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(public)" />
            <Stack.Screen
              name="scan"
              options={{
                headerShown: false,
                fullScreenGestureEnabled: true,
                animation: 'slide_from_right',
              }}
            />
          </Stack>
        </ErrorBoundary>
      </SessionProvider>
    </SafeAreaProvider>
  );
}
