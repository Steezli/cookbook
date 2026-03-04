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
import { Stack } from "expo-router";

import { SessionProvider } from "@/features/auth/session";

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

  // Keep splash screen visible while fonts are loading.
  // If fonts fail (fontError), we still render — graceful degradation.
  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <SessionProvider>
      <Stack
        screenOptions={{
          headerTitle: "Cookbook"
        }}
      />
    </SessionProvider>
  );
}
