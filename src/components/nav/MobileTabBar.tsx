// Mobile/tablet bottom tab bar — 5 tabs matching cookbook.pen TabBar spec.
// Uses TabTrigger from expo-router/ui with asChild for isFocused forwarding.
// Scan button is a plain Pressable that navigates to the scan tab.

import React from "react";
import { Pressable, View } from "react-native";
import { TabTrigger } from "expo-router/ui";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Home, BookOpen, Camera, Heart, User } from "lucide-react-native";
import { TabButton } from "./TabButton";
import { bgPage, borderSubtle, textDisabled } from "@/lib/tokens";

export function MobileTabBar() {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        backgroundColor: bgPage,
        borderTopWidth: 1,
        borderTopColor: borderSubtle,
        flexDirection: "row",
        paddingTop: 8,
        paddingBottom: insets.bottom || 8,
        paddingHorizontal: 12,
        alignItems: "center",
      }}
    >
      <TabTrigger name="index" reset="always" asChild>
        <TabButton icon={<Home />} label="Home" />
      </TabTrigger>

      <TabTrigger name="my-recipes" reset="always" asChild>
        <TabButton icon={<BookOpen />} label="My Recipes" />
      </TabTrigger>

      {/* Scan: navigates to the scan tab */}
      <Pressable
        onPress={() => router.navigate("/scan" as any)}
        style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
        accessibilityRole="button"
        accessibilityLabel="Scan recipe"
      >
        <Camera color={textDisabled} size={28} />
      </Pressable>

      <TabTrigger name="family" reset="always" asChild>
        <TabButton icon={<Heart />} label="Family" />
      </TabTrigger>

      <TabTrigger name="profile" reset="always" asChild>
        <TabButton icon={<User />} label="Profile" />
      </TabTrigger>
    </View>
  );
}
