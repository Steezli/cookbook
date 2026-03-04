// Mobile/tablet bottom tab bar — 5 tabs matching cookbook.pen TabBar spec.
// Uses TabTrigger from expo-router/ui with asChild for isFocused forwarding.
// Scan button is a plain Pressable that opens the /(scan) modal overlay.

import React from "react";
import { Pressable, View } from "react-native";
import { TabTrigger } from "expo-router/ui";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Home, BookOpen, Camera, Heart, User } from "lucide-react-native";
import { TabButton } from "./TabButton";
import { accentWarm, bgPage, borderSubtle } from "@/lib/tokens";

export function MobileTabBar() {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        height: 84 + insets.bottom,
        backgroundColor: bgPage,
        borderTopWidth: 1,
        borderTopColor: borderSubtle,
        flexDirection: "row",
        paddingTop: 12,
        paddingBottom: 28 + insets.bottom,
        paddingHorizontal: 32,
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <TabTrigger name="index" asChild>
        <TabButton icon={<Home />} />
      </TabTrigger>

      <TabTrigger name="my-recipes" asChild>
        <TabButton icon={<BookOpen />} />
      </TabTrigger>

      {/* Scan: open modal overlay instead of switching tabs.
          Plain Pressable avoids ambiguity of whether TabTrigger onPress
          overrides or supplements the tab-switch (Research Open Question 1). */}
      <Pressable
        onPress={() => router.push("/(scan)")}
        style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
      >
        <Camera color={accentWarm} size={28} />
      </Pressable>

      <TabTrigger name="family" asChild>
        <TabButton icon={<Heart />} />
      </TabTrigger>

      <TabTrigger name="profile" asChild>
        <TabButton icon={<User />} />
      </TabTrigger>
    </View>
  );
}
