import React from "react";
import { Platform, View } from "react-native";
import { Stack } from "expo-router";
import AdSlot from "@/components/public/AdSlot";
import { useBreakpoint } from "@/lib/hooks/useBreakpoint";
import {
  bgPage,
  fontFamilyDisplay,
  textPrimary,
} from "@/lib/tokens";

export default function ScanLayout() {
  const { breakpoint } = useBreakpoint();

  return (
    <View style={{ flex: 1, backgroundColor: bgPage }}>
      <Stack
        screenOptions={{
          headerTitle: "Recipe Scanner",
          headerBackTitle: "Back",
          headerStyle: { backgroundColor: bgPage },
          headerTitleStyle: {
            fontFamily: fontFamilyDisplay,
            color: textPrimary,
          },
          headerTintColor: textPrimary,
          headerShadowVisible: false,
          ...(Platform.OS === "web" ? { headerShown: false } : {}),
        }}
      />
      <AdSlot
        variant={breakpoint === "mobile" ? "mobile" : "leaderboard"}
        style={{ alignSelf: "center", marginVertical: 8 }}
      />
    </View>
  );
}