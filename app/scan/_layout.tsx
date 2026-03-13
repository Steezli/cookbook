import React from "react";
import { View } from "react-native";
import { Stack } from "expo-router";
import AdSlot from "@/components/public/AdSlot";
import { useBreakpoint } from "@/lib/hooks/useBreakpoint";

export default function ScanLayout() {
  const { breakpoint } = useBreakpoint();

  return (
    <View style={{ flex: 1 }}>
      <Stack
        screenOptions={{
          headerTitle: "Recipe Scanner",
        }}
      />
      <AdSlot
        variant={breakpoint === "mobile" ? "mobile" : "leaderboard"}
        style={{ alignSelf: "center", marginVertical: 8 }}
      />
    </View>
  );
}