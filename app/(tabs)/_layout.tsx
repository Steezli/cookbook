import { Redirect } from "expo-router";
import { Tabs, TabList, TabTrigger, TabSlot } from "expo-router/ui";
import { View, Text } from "react-native";

import { useSession } from "@/features/auth/session";
import { useBreakpoint } from "@/lib/hooks/useBreakpoint";

export default function TabsLayout() {
  const { session, isLoading } = useSession();
  const { breakpoint } = useBreakpoint();
  const isWeb = breakpoint === "web";

  // Hold render while session is resolving to avoid a flash of the login screen.
  if (isLoading) {
    return null;
  }

  // Redirect unauthenticated users to login.
  if (!session) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Tabs style={{ flex: 1, flexDirection: isWeb ? "row" : "column" }}>
      {/* Hidden TabList registers all 5 tab routes with expo-router/ui.
          Actual nav chrome is rendered as inline placeholders below.
          Plan 03 replaces these placeholders with MobileTabBar / WebSidebar. */}
      <TabList
        style={{
          height: 0,
          overflow: "hidden",
          position: "absolute",
        }}
      >
        <TabTrigger name="index" href="/" />
        <TabTrigger name="my-recipes" href={"/my-recipes" as any} />
        <TabTrigger name="scan" href={"/scan" as any} />
        <TabTrigger name="family" href={"/family" as any} />
        <TabTrigger name="profile" href={"/profile" as any} />
      </TabList>

      {/* Web: fixed sidebar placeholder (260px) */}
      {isWeb && (
        <View
          style={{
            width: 260,
            backgroundColor: "#F6F7F8",
            borderRightWidth: 1,
            borderRightColor: "#F3F4F6",
          }}
        >
          <Text>Sidebar placeholder</Text>
        </View>
      )}

      {/* Main content area */}
      <TabSlot style={{ flex: 1 }} />

      {/* Mobile/tablet: bottom tab bar placeholder (84px) */}
      {!isWeb && (
        <View
          style={{
            height: 84,
            backgroundColor: "#FFFFFF",
            borderTopWidth: 1,
            borderTopColor: "#F3F4F6",
          }}
        >
          <Text style={{ textAlign: "center", paddingTop: 12 }}>
            Tab bar placeholder
          </Text>
        </View>
      )}
    </Tabs>
  );
}
