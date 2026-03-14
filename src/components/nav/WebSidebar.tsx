// Web left sidebar — 260px, always visible, matching cookbook.pen sidebar spec.
// Tab-based items use TabTrigger asChild for isFocused forwarding.
// Scan uses plain SidebarItem with onPress (navigates to scan tab).

import React from "react";
import { Text, View } from "react-native";
import { TabTrigger } from "expo-router/ui";
import { router } from "expo-router";
import AdSlot from "@/components/public/AdSlot";
// router is retained for Scan navigation
import {
  BookOpen,
  Camera,
  Folder,
  Heart,
  LayoutGrid,
  Settings,
} from "lucide-react-native";
import { SidebarItem } from "./SidebarItem";
import {
  accentWarm,
  bgCard,
  borderSubtle,
  fontFamilyDisplay,
  fontSize2xl,
  textPrimary,
} from "@/lib/tokens";

export function WebSidebar() {
  return (
    <View
      style={{
        width: 260,
        backgroundColor: bgCard,
        borderRightWidth: 1,
        borderRightColor: borderSubtle,
        paddingVertical: 32,
        paddingHorizontal: 24,
        gap: 32,
      }}
    >
      {/* Logo area */}
      <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
        <BookOpen size={28} color={accentWarm} />
        <Text
          style={{
            fontFamily: fontFamilyDisplay,
            fontSize: fontSize2xl,
            color: textPrimary,
          }}
        >
          Cookbook
        </Text>
      </View>

      {/* Nav items */}
      <View style={{ gap: 4, alignItems: "stretch" }}>
        <TabTrigger name="index" asChild>
          <SidebarItem icon={<LayoutGrid />} label="Home" />
        </TabTrigger>

        <TabTrigger name="my-recipes" asChild>
          <SidebarItem icon={<BookOpen />} label="My Recipes" />
        </TabTrigger>

        <TabTrigger name="collections" asChild>
          <SidebarItem icon={<Folder />} label="Collections" />
        </TabTrigger>

        {/* Scan: navigates to the scan tab */}
        <SidebarItem
          icon={<Camera />}
          label="Scan Recipe"
          onPress={() => router.navigate("/scan" as any)}
        />

        <TabTrigger name="family" asChild>
          <SidebarItem icon={<Heart />} label="Family" />
        </TabTrigger>

        {/* Profile tab uses "Settings" label on web per cookbook.pen/CONTEXT.md spec */}
        <TabTrigger name="profile" asChild>
          <SidebarItem icon={<Settings />} label="Settings" />
        </TabTrigger>
      </View>

      {/* Ad at bottom of sidebar — per cookbook.pen Home - Web (1440px) */}
      <View style={{ marginTop: "auto" }}>
        <AdSlot variant="leaderboard" style={{ width: "100%", height: 90 }} />
      </View>
    </View>
  );
}
