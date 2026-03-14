import React from "react";
import { Platform, View } from "react-native";
import { Stack } from "expo-router";
import {
  bgPage,
  fontFamilyDisplay,
  textPrimary,
} from "@/lib/tokens";

export default function ScanLayout() {
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
    </View>
  );
}