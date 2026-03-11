import { useEffect, useRef } from "react";
import { router } from "expo-router";
import { Tabs, TabList, TabTrigger, TabSlot } from "expo-router/ui";

import { useSession } from "@/features/auth/session";
import { useBreakpoint } from "@/lib/hooks/useBreakpoint";
import { MobileTabBar } from "@/components/nav/MobileTabBar";
import { WebSidebar } from "@/components/nav/WebSidebar";

export default function TabsLayout() {
  const { session, isLoading } = useSession();
  const { breakpoint } = useBreakpoint();
  const isWeb = breakpoint === "web";

  const hasRedirectedToLogin = useRef(false);

  // Redirect unauthenticated users to login (once, not on every focus cycle).
  useEffect(() => {
    if (isLoading) return;
    if (session) {
      hasRedirectedToLogin.current = false;
      return;
    }
    if (hasRedirectedToLogin.current) return;
    hasRedirectedToLogin.current = true;
    router.replace("/(auth)/login");
  }, [isLoading, session]);

  // Hold render while session is resolving to avoid a flash of the login screen.
  if (isLoading || !session) {
    return null;
  }

  return (
    <Tabs style={{ flex: 1, flexDirection: isWeb ? "row" : "column" }}>
      {/* Hidden TabList registers all 5 tab routes with expo-router/ui.
          height:0/overflow:hidden ensures invisible on both native and web
          without layout side effects (per research pitfall 1 / pitfall 3). */}
      <TabList
        style={{
          height: 0,
          width: 0,
          overflow: "hidden",
          position: "absolute",
          pointerEvents: "none",
        }}
      >
        <TabTrigger name="index" href="/" />
        <TabTrigger name="my-recipes" href={"/recipes" as any} />
        <TabTrigger name="collections" href={"/collections" as any} />
        <TabTrigger name="family" href={"/family" as any} />
        <TabTrigger name="profile" href={"/profile" as any} />
      </TabList>

      {/* Web: 260px left sidebar with logo, 6 nav items, cookbook.pen styling */}
      {isWeb ? <WebSidebar /> : null}

      {/* Main content area */}
      <TabSlot style={{ flex: 1 }} />

      {/* Mobile/tablet: bottom tab bar (5 tabs, 84px + safe area).
          Tablet shows tab bar (not sidebar) per cookbook.pen spec.
          isWeb is only true for 'web' breakpoint — tablet uses 'tablet'. */}
      {!isWeb ? <MobileTabBar /> : null}
    </Tabs>
  );
}
