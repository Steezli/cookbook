# Phase 9: Navigation Restructure - Research

**Researched:** 2026-03-03
**Domain:** Expo Router v4 tab navigation, adaptive nav chrome, route group restructure
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Navigation destinations:**
- Unified destinations: Home, My Recipes, Collections, Scan Recipe, Family, Profile/Settings
- Search lives in the top bar/header on all breakpoints — NOT a tab or sidebar item
- Favorites is NOT a separate destination — it's a toggle within My Recipes
- Collections is a sidebar item on web but NOT a mobile tab (reachable from Home or My Recipes on mobile)

**Mobile tab bar (5 tabs):**
- Home | My Recipes | Scan | Family | Profile
- Icons from cookbook.pen: home, book-open, camera, heart, user (lucide, 24x24)
- Active color: $accent-warm (#E8784E), inactive: $text-disabled (#D1D5DB)
- Tab bar height: 84px, padding [12, 32, 28, 32], white bg, top border 1px $border-subtle

**Web sidebar (260px, always visible):**
- Home | My Recipes | Collections | Scan Recipe | Family | Settings
- Icons from cookbook.pen: layout-grid, book-open, folder, camera, heart/users, settings (lucide, 20x20)
- Sidebar: 260px width, $bg-card fill, padding [32, 24], gap 32, right border 1px $border-subtle
- Active item: $accent-warm bg with white text, cornerRadius 12, padding [10, 14]
- Always visible — no collapse/toggle

**Tablet navigation:**
- Uses bottom tab bar (same as mobile — from cookbook.pen spec)
- Header bar at top with screen title + action buttons (no sidebar)

**My Recipes screen:**
- Filtered to current user's own recipes (not global browse)
- Includes toggles for: Favorites, and Family filter

**Profile vs Settings:**
- Same screen, different label per breakpoint
- Mobile: "Profile", Web sidebar: "Settings"
- Content: avatar, display name, email, unit preference, logout

**Scan tab behavior:**
- Opens as modal overlay on all breakpoints (not a regular tab destination)
- Visually distinguished in the tab bar
- After saving, navigates to draft review screen

**Route group structure:**
- `(tabs)/` — authenticated main app (Home, My Recipes, Collections, Scan, Family, Profile)
- `(auth)/` — login, signup, forgot-password (unauthenticated)
- `(public)/` — public recipe browsing (Phase 11, stub only in Phase 9)

**PageContainer:**
- Mobile: 20px horizontal padding, full width
- Tablet: 32px horizontal padding, full width
- Web: 40px padding inside main content area (fills remaining width after 260px sidebar)
- Form screens: max-width 600px centered (dwForm)
- Content-heavy screens: max-width 960px centered (contentRow)

### Claude's Discretion
- Exact Expo Router file structure for the (tabs)/ route group
- Tab bar animation and transition behavior
- How to handle the Scan modal integration with Expo Router
- Search bar placement details in the header
- How Collections is accessed on mobile (from Home quick actions, or nested in My Recipes)
- Sidebar logo/branding area implementation details

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| NAV-01 | Root navigation converted from flat Stack to Tabs route group with (tabs)/, (public)/, (auth)/ separation | Route group restructure pattern, root _layout.tsx changes, file migration map |
| NAV-02 | Mobile bottom tab bar matching cookbook.pen spec (5 tabs: Home, My Recipes, Scan, Family, Profile) | expo-router/ui custom Tabs API, TabTrigger/TabSlot pattern, token values verified |
| NAV-03 | Web left sidebar (260px) matching cookbook.pen spec | expo-router/ui adaptive layout pattern, sidebar design values verified from cookbook.pen |
| NAV-04 | Tablet header navigation matching cookbook.pen spec (header bar + bottom tab bar) | tHeader design values verified from cookbook.pen; tablet = tab bar + per-screen header |
| NAV-05 | PageContainer component providing consistent padding/max-width per breakpoint | breakpoint values from CONTEXT.md, useBreakpoint() hook already built |
</phase_requirements>

---

## Summary

Phase 9 converts the app's flat root Stack navigator into a route group structure with `(tabs)/`, `(auth)/`, and `(public)/` groups. The app is already on Expo Router v4.0.22 with `expo-router/ui` available, which provides the headless `Tabs`, `TabList`, `TabTrigger`, and `TabSlot` components needed to build fully custom navigation chrome.

The central challenge is the adaptive navigation: a 5-tab bottom bar on mobile/tablet, and a 260px always-visible sidebar on web. This is achievable in a single `(tabs)/_layout.tsx` using `expo-router/ui` headless components with `useBreakpoint()` switching which chrome renders. The Scan tab requires a modal interception pattern: a dummy file for the tab icon + a `listeners` prop that calls `e.preventDefault()` and opens the scan flow as a presentation modal.

Existing screens under `app/` (collections/, recipes/, settings.tsx, etc.) must move into `app/(tabs)/`. The existing `(auth)/` and `(family)/` route groups get absorbed into the new structure: `(auth)/` stays as-is, `(family)/` routes move into `(tabs)/family/`. Lucide icons (`lucide-react-native`) must be installed — it is NOT currently in the project.

**Primary recommendation:** Use `expo-router/ui` headless Tabs (not the default React Navigation `Tabs` from `expo-router`) for the `(tabs)/_layout.tsx`. This gives full control over the adaptive nav chrome without fighting the default tab bar styling.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| expo-router | 4.0.22 (installed) | File-based routing, Tabs navigator | Already in project |
| expo-router/ui | 4.0.22 (submodule, installed) | Headless Tabs, TabList, TabTrigger, TabSlot | Enables fully custom nav chrome |
| react-native | 0.76.0 (installed) | View, StyleSheet, Pressable for nav components | Core platform |
| react-native-safe-area-context | 4.12.0 (installed) | SafeAreaView for tab bar bottom padding | Already in project |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react-native | latest | Icon components matching cookbook.pen lucide icons | Must be installed — NOT currently in project |
| useBreakpoint() | project hook | Returns mobile/tablet/web breakpoint | Already built at src/lib/hooks/useBreakpoint.ts |
| tokens.ts | project lib | Design token constants (accentWarm, bgCard, etc.) | Already built at src/lib/tokens.ts |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| expo-router/ui Tabs | Default `Tabs` from expo-router | Default Tabs wraps React Navigation BottomTabNavigator — styling the tab bar requires fighting default styles; custom tabBar prop is available but more complex than expo-router/ui |
| lucide-react-native | @expo/vector-icons (Ionicons) | @expo/vector-icons is installed but doesn't have exact lucide icon names used in cookbook.pen (layout-grid, book-open, folder, etc.) |
| Single _layout.tsx conditional | Platform files (_layout.web.tsx) | Platform files can't be used here — breakpoint is a runtime prop (window resize), not a build-time platform split |

**Installation required:**
```bash
npm install lucide-react-native
```

---

## Architecture Patterns

### Recommended Project Structure

The key restructure: move flat `app/` screens into `app/(tabs)/` and add auth/session protection at the (tabs) layout level.

```
app/
├── _layout.tsx                  # Root: fonts, SessionProvider, Stack with (tabs)/(auth)/(public)
├── (auth)/
│   ├── _layout.tsx              # Auth stack — no changes needed
│   ├── login.tsx
│   ├── signup.tsx
│   ├── logout.tsx
│   ├── reset-password.tsx
│   └── forgot-password.tsx
├── (tabs)/
│   ├── _layout.tsx              # Headless Tabs with adaptive nav chrome (NEW — core of this phase)
│   ├── index.tsx                # Home tab (move from app/index.tsx — will be rebuilt Phase 10)
│   ├── my-recipes.tsx           # My Recipes tab (NEW stub — Phase 10 builds content)
│   ├── scan.tsx                 # Scan tab dummy file (href intercepted as modal)
│   ├── family/
│   │   ├── _layout.tsx          # Stack for family screens (absorbs (family)/_layout.tsx)
│   │   ├── index.tsx            # Families list (move from (family)/index.tsx)
│   │   └── [id].tsx             # Family detail (move from (family)/family/[id].tsx)
│   ├── profile.tsx              # Profile/Settings tab (move from settings.tsx)
│   ├── collections/
│   │   ├── index.tsx            # Collections list (move from collections/index.tsx)
│   │   ├── [id].tsx             # Collection detail (move from collections/[id].tsx)
│   │   └── create.tsx           # Create collection (move from collections/create.tsx)
│   ├── recipes/
│   │   ├── index.tsx            # Recipe list (move from recipes/index.tsx)
│   │   ├── [id].tsx             # Recipe detail (move from recipes/[id].tsx)
│   │   ├── [id]/
│   │   │   └── edit.tsx         # Edit recipe (move from recipes/[id]/edit.tsx)
│   │   └── create.tsx           # Create recipe (move from recipes/create.tsx)
│   └── invite/
│       └── [token].tsx          # Invite (move from invite/[token].tsx)
├── (scan)/
│   ├── _layout.tsx              # Scan stack with modal presentation (no change needed)
│   ├── index.tsx                # Scan hub (stays here, presented as modal)
│   └── draft/
│       └── [id].tsx             # Draft review (stays here)
├── (public)/
│   └── _layout.tsx              # Public stub (Phase 11)
└── +not-found.tsx
```

### Pattern 1: Root Layout — Stack with Route Groups

The root `app/_layout.tsx` keeps its existing font loading + SplashScreen + SessionProvider pattern but replaces `<Stack />` with a Stack that explicitly declares its screens. This is necessary to define the scan modal at root level (so it overlays the tabs).

```typescript
// app/_layout.tsx
// Source: docs.expo.dev/router/basics/common-navigation-patterns/
// Source: docs.expo.dev/router/advanced/authentication/

import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { SessionProvider } from "@/features/auth/session";
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

  if (!fontsLoaded && !fontError) return null;

  return (
    <SessionProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(public)" />
        {/* Scan modal overlays the tabs — defined at root Stack level */}
        <Stack.Screen
          name="(scan)"
          options={{ presentation: "modal", headerShown: false }}
        />
      </Stack>
    </SessionProvider>
  );
}
```

### Pattern 2: Tabs Layout — Adaptive Nav Chrome with expo-router/ui

The `(tabs)/_layout.tsx` uses headless `Tabs` from `expo-router/ui`. It renders either a bottom tab bar (mobile/tablet) or a left sidebar (web) based on `useBreakpoint()`. Authentication redirect is done inside the tabs layout.

```typescript
// app/(tabs)/_layout.tsx
// Source: docs.expo.dev/router/advanced/custom-tabs/
// Source: expo-router/build/ui/Tabs.d.ts (verified from installed package)

import { Redirect } from "expo-router";
import { Tabs, TabList, TabTrigger, TabSlot } from "expo-router/ui";
import { View } from "react-native";
import { useSession } from "@/features/auth/session";
import { useBreakpoint } from "@/lib/hooks/useBreakpoint";
import { MobileTabBar } from "@/components/nav/MobileTabBar";
import { WebSidebar } from "@/components/nav/WebSidebar";

export default function TabsLayout() {
  const { session, isLoading } = useSession();
  const { breakpoint } = useBreakpoint();

  // Show nothing during auth load (splash screen handles visual)
  if (isLoading) return null;

  // Redirect unauthenticated users to login
  if (!session) return <Redirect href="/(auth)/login" />;

  const isWeb = breakpoint === "web";

  return (
    <Tabs style={{ flex: 1, flexDirection: isWeb ? "row" : "column" }}>
      {/* Hidden TabList — defines routes, required by expo-router/ui */}
      <TabList style={{ display: "none" }}>
        <TabTrigger name="index" href="/(tabs)" />
        <TabTrigger name="my-recipes" href="/(tabs)/my-recipes" />
        <TabTrigger name="scan" href="/(tabs)/scan" />
        <TabTrigger name="family" href="/(tabs)/family" />
        <TabTrigger name="profile" href="/(tabs)/profile" />
      </TabList>

      {/* Sidebar on web, tab bar on mobile/tablet */}
      {isWeb ? (
        <WebSidebar />
      ) : null}

      {/* Screen content renders here */}
      <TabSlot style={{ flex: 1 }} />

      {/* Bottom tab bar on mobile and tablet */}
      {!isWeb ? (
        <MobileTabBar />
      ) : null}
    </Tabs>
  );
}
```

**Key expo-router/ui constraints verified from installed package source:**
- `TabList` must contain `TabTrigger` components with `href` — these define what routes exist
- `TabTrigger` components outside `TabList` use only `name` prop to switch tabs (no `href` required)
- `asChild` prop on `TabTrigger` forwards `isFocused` and press handlers to the child component
- `TabTriggerSlotProps` type provides: `isFocused?: boolean`, standard `PressableProps`, `href?: string`
- `TabSlot` renders the active screen using `react-native-screens` ScreenContainer

### Pattern 3: Custom Tab Bar Button (with isFocused)

```typescript
// src/components/nav/TabButton.tsx
// Source: expo-router/build/ui/TabTrigger.d.ts (verified)

import React from "react";
import { Pressable, View } from "react-native";
import { TabTriggerSlotProps } from "expo-router/ui";
import { accentWarm, textDisabled } from "@/lib/tokens";

type TabButtonProps = TabTriggerSlotProps & {
  icon: React.ReactNode;       // Lucide icon component
  activeIcon?: React.ReactNode; // Optional different icon when active
};

export const TabButton = React.forwardRef<View, TabButtonProps>(
  ({ isFocused, icon, activeIcon, onPress, onLongPress, ...props }, ref) => {
    const iconColor = isFocused ? accentWarm : textDisabled;
    return (
      <Pressable
        ref={ref}
        onPress={onPress}
        onLongPress={onLongPress}
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Icon rendered with iconColor passed as prop to lucide icon */}
        {React.cloneElement(
          (isFocused && activeIcon ? activeIcon : icon) as React.ReactElement,
          { color: iconColor, size: 24 }
        )}
      </Pressable>
    );
  }
);
TabButton.displayName = "TabButton";
```

### Pattern 4: Scan Tab Modal Interception

The Scan tab icon is visible in the tab bar but tapping it opens a modal (not navigates to a tab). The standard pattern: create a dummy `app/(tabs)/scan.tsx` (never rendered), and intercept the tab press via listeners.

**Two approaches — use listeners approach since it's simpler with expo-router/ui:**

```typescript
// Inside MobileTabBar.tsx — Scan button uses router.push instead of normal tab switch
import { router } from "expo-router";

// The scan TabTrigger uses onPress override to open modal
<TabTrigger
  name="scan"
  asChild
  onPress={(e) => {
    e.preventDefault?.();
    router.push("/(scan)");
  }}
>
  <TabButton icon={<Camera />} isFocused={false} />
</TabTrigger>
```

**Alternative: If TabTrigger doesn't expose preventDefault**, use the Tabs.Screen listeners pattern (only available with the non-headless Tabs from expo-router, not expo-router/ui). In that case, the MobileTabBar manually calls `router.push("/(scan)")` on scan button press, bypassing tab routing entirely.

### Pattern 5: Auth Redirect in Tabs Layout

Current codebase uses `useSession()` from `src/features/auth/session.tsx`. The `Redirect` component from `expo-router` handles the redirect declaratively. This is the established pattern in the Expo Router v4 docs and avoids the `router.replace()` "navigate before mount" error.

```typescript
// Guards in (tabs)/_layout.tsx
if (isLoading) return null;           // Wait for session check
if (!session) return <Redirect href="/(auth)/login" />;  // Unauthenticated
// else: render tabs
```

Note: `Stack.Protected` with `guard` prop was introduced in SDK 53. Since this project uses Expo SDK 54 (`"expo": "^54.0.33"`), it's available. However, `Stack.Protected` lives in the root `_layout.tsx` `Stack` — it may be simpler to keep the explicit redirect inside the `(tabs)` layout where the session check naturally happens.

### Pattern 6: PageContainer Component

```typescript
// src/components/nav/PageContainer.tsx

import { View, ViewStyle } from "react-native";
import { useBreakpoint } from "@/lib/hooks/useBreakpoint";

type PageContainerVariant = "default" | "form" | "content";

type PageContainerProps = {
  children: React.ReactNode;
  variant?: PageContainerVariant;
  style?: ViewStyle;
};

export function PageContainer({
  children,
  variant = "default",
  style,
}: PageContainerProps) {
  const { breakpoint } = useBreakpoint();

  // Horizontal padding per breakpoint
  const paddingH = breakpoint === "mobile" ? 20 : breakpoint === "tablet" ? 32 : 40;

  // Max-width constraints
  const maxWidth =
    variant === "form"
      ? 600
      : variant === "content"
      ? 960
      : undefined;

  return (
    <View
      style={[
        {
          flex: 1,
          paddingHorizontal: paddingH,
          // Center constrained content on web
          ...(maxWidth
            ? { maxWidth, alignSelf: "center", width: "100%" }
            : undefined),
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
```

### Anti-Patterns to Avoid

- **Using default Tabs from expo-router for custom chrome:** Default `Tabs` wraps React Navigation BottomTabNavigator — overriding its visual rendering requires tabBar prop on the underlying navigator, not expo-router's API. Use `expo-router/ui` instead.
- **StyleSheet.create for breakpoint-dependent styles:** Project rule (from STATE.md): dimension-sensitive styles must be computed inside components. Don't cache tab bar heights or padding in StyleSheet.create.
- **position: fixed for sidebar:** Does not work in React Native. The sidebar must use a flex row layout — `<View style={{ flexDirection: 'row', flex: 1 }}>` with the sidebar as a child `<View style={{ width: 260 }}>`.
- **Skipping the hidden TabList:** In expo-router/ui, routes are only registered if there's a `TabTrigger` with `href` inside a `TabList`. Omitting TabList means expo-router won't know the routes exist and navigation breaks.
- **Moving (scan) into (tabs):** The scan flow must remain outside `(tabs)` or be presented as a root-level modal. If placed inside `(tabs)`, the modal won't overlay the tab bar correctly.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Tab state management (active tab tracking) | Custom state machine | expo-router/ui Tabs (built-in TabContext) | expo-router/ui tracks active route via React Navigation state — no custom state needed |
| Route registration | Custom registry | TabList + TabTrigger with href | expo-router/ui reads TabTrigger children from TabList to register routes with the navigator |
| Icon rendering | Custom SVG icons | lucide-react-native | Exact icon names from cookbook.pen (layout-grid, book-open, folder, camera, heart, user, settings, bell) — lucide-react-native exports all of these as named React components |
| Safe area bottom inset | Manual padding calculation | `useSafeAreaInsets()` from react-native-safe-area-context | Tab bar sits above home indicator on iOS — insets.bottom gives the correct value; already installed |
| Authentication redirect | Imperative router.replace in useEffect | `<Redirect>` component from expo-router | Declarative redirect avoids "navigate before mount" crash; React state + render cycle safe |

**Key insight:** expo-router/ui's headless components handle all the complex tab state, focus tracking, and route registration. The planner only needs to build the visual chrome (Views, Pressables, icons) on top.

---

## Common Pitfalls

### Pitfall 1: TabList Display None on Native
**What goes wrong:** Setting `style={{ display: 'none' }}` on a View works on web but may cause layout issues on native (React Native doesn't support `display: 'none'` the same way).
**Why it happens:** React Native's flex layout engine handles display differently than CSS.
**How to avoid:** Use `style={{ height: 0, overflow: 'hidden' }}` for the hidden TabList on native, or conditionally render it off-screen. Alternatively, keep TabList in the render tree with zero-height — expo-router/ui doesn't require it to be visible.
**Warning signs:** Layout shifts on native; TabList items visible when they shouldn't be.

### Pitfall 2: TabTrigger href Format Must Match Expo Router's Pattern
**What goes wrong:** Providing incorrect href values to TabTrigger causes routes to not register or navigate incorrectly.
**Why it happens:** expo-router/ui resolves hrefs using the same file-based routing rules. The index route of `(tabs)` is `/`, not `/(tabs)`.
**How to avoid:** For the home tab (index.tsx inside (tabs)/), use `href="/"`. For named tabs, use `href="/my-recipes"` (not `/(tabs)/my-recipes`). The route group parentheses are stripped from URLs.
**Warning signs:** "Route not found" errors; tabs not switching; deep links failing.

### Pitfall 3: Scan Modal Route Anchoring
**What goes wrong:** After dismissing the scan modal, the app navigates to a blank screen instead of returning to the tab that was active.
**Why it happens:** Without `unstable_settings` anchor, the Stack doesn't know what's "behind" the modal.
**How to avoid:** Export `unstable_settings = { anchor: 'index' }` from the scan layout, or define the scan Stack.Screen in the root layout (which already has the tabs defined as a sibling screen).
**Warning signs:** Blank screen after modal dismiss; back button navigates to wrong screen.

### Pitfall 4: Importing from expo-router vs expo-router/ui
**What goes wrong:** Mixing `Tabs` from `expo-router` with `TabList`/`TabSlot` from `expo-router/ui` causes prop and context mismatches.
**Why it happens:** These are two different navigator implementations. `expo-router`'s `Tabs` wraps React Navigation's BottomTabs. `expo-router/ui`'s `Tabs` is the headless custom implementation.
**How to avoid:** Pick one and stick to it. For this phase, use `expo-router/ui` exclusively for the adaptive nav chrome.
**Warning signs:** TypeScript errors; "Tab context not found"; tabs not rendering content.

### Pitfall 5: Route Group Flat-File Conflicts
**What goes wrong:** Moving `app/index.tsx` into `app/(tabs)/index.tsx` without updating the root Stack causes Expo Router to try to render both.
**Why it happens:** The old `app/index.tsx` still exists at root level and matches the `/` route before `(tabs)`.
**How to avoid:** Delete the old `app/index.tsx` before or at the same time as creating `app/(tabs)/index.tsx`.
**Warning signs:** Both the old index and the new one render; navigation doesn't switch to tabs.

### Pitfall 6: family Route Group Absorption
**What goes wrong:** `app/(family)/family/[id].tsx` has a double-nested path. Moving to `app/(tabs)/family/[id].tsx` changes the URL from `/(family)/family/[id]` to `/family/[id]`.
**Why it happens:** The existing family group has `family/` as a subdirectory within `(family)/`.
**How to avoid:** When moving the family screens, flatten the path: `app/(tabs)/family/[id].tsx` (not `app/(tabs)/family/family/[id].tsx`). Update all `router.push` and `Link href` calls to use the new paths.
**Warning signs:** 404 on family detail screens after restructure.

### Pitfall 7: lucide-react-native Not Installed
**What goes wrong:** Build fails when importing from lucide-react-native.
**Why it happens:** lucide-react-native is NOT currently in the project's package.json or node_modules. The cookbook.pen spec uses lucide icons throughout.
**How to avoid:** Run `npm install lucide-react-native` at the start of the phase, before implementing any nav component.
**Warning signs:** Module not found error on build; TypeScript cannot find module.

---

## Code Examples

Verified patterns from official sources and installed package inspection:

### Mobile Tab Bar Component
```typescript
// src/components/nav/MobileTabBar.tsx
// Uses TabTrigger from expo-router/ui with asChild to forward isFocused

import { View } from "react-native";
import { TabTrigger } from "expo-router/ui";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Home, BookOpen, Camera, Heart, User } from "lucide-react-native";
import { TabButton } from "./TabButton";
import { bgPage, borderSubtle } from "@/lib/tokens";

export function MobileTabBar() {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        height: 84 + insets.bottom,   // 84px spec + home indicator
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
      {/* Scan: intercept tap to open modal */}
      <TabTrigger
        name="scan"
        asChild
        onPress={() => {
          // router.push("/(scan)") called inside TabButton or here
        }}
      >
        <TabButton icon={<Camera />} />
      </TabTrigger>
      <TabTrigger name="family" asChild>
        <TabButton icon={<Heart />} />
      </TabTrigger>
      <TabTrigger name="profile" asChild>
        <TabButton icon={<User />} />
      </TabTrigger>
    </View>
  );
}
```

### Web Sidebar Component
```typescript
// src/components/nav/WebSidebar.tsx
// Source: cookbook.pen sidebar design values (verified)

import { View } from "react-native";
import { TabTrigger } from "expo-router/ui";
import { LayoutGrid, BookOpen, Folder, Camera, Heart, Settings } from "lucide-react-native";
import { SidebarItem } from "./SidebarItem";
import { bgCard, borderSubtle, accentWarm, white } from "@/lib/tokens";

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
        {/* Cookbook text in BricolageGrotesque 700 22px */}
      </View>
      {/* Nav items */}
      <View style={{ gap: 4 }}>
        <TabTrigger name="index" asChild>
          <SidebarItem icon={<LayoutGrid />} label="Home" />
        </TabTrigger>
        <TabTrigger name="my-recipes" asChild>
          <SidebarItem icon={<BookOpen />} label="My Recipes" />
        </TabTrigger>
        {/* Collections: not a tab, navigate directly */}
        <SidebarItem icon={<Folder />} label="Collections" onPress={() => router.push("/collections")} />
        {/* Scan: opens modal */}
        <SidebarItem icon={<Camera />} label="Scan Recipe" onPress={() => router.push("/(scan)")} />
        <TabTrigger name="family" asChild>
          <SidebarItem icon={<Heart />} label="Family" />
        </TabTrigger>
        <TabTrigger name="profile" asChild>
          <SidebarItem icon={<Settings />} label="Settings" />
        </TabTrigger>
      </View>
    </View>
  );
}
```

### SidebarItem with isFocused styling
```typescript
// src/components/nav/SidebarItem.tsx
// Source: cookbook.pen navItem design (active: accentWarm bg, white text, radius 12, padding [10,14])

import React from "react";
import { Pressable, Text, View } from "react-native";
import { TabTriggerSlotProps } from "expo-router/ui";
import { accentWarm, white, textSecondary, radiusSm } from "@/lib/tokens";

type SidebarItemProps = TabTriggerSlotProps & {
  icon: React.ReactNode;
  label: string;
};

export const SidebarItem = React.forwardRef<View, SidebarItemProps>(
  ({ isFocused, icon, label, onPress, ...props }, ref) => {
    return (
      <Pressable
        ref={ref}
        onPress={onPress}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          paddingVertical: 10,
          paddingHorizontal: 14,
          borderRadius: radiusSm,   // 12px
          backgroundColor: isFocused ? accentWarm : "transparent",
          width: "100%",
        }}
      >
        {React.cloneElement(icon as React.ReactElement, {
          size: 20,
          color: isFocused ? white : textSecondary,
        })}
        <Text
          style={{
            color: isFocused ? white : textSecondary,
            fontSize: 14,
            fontWeight: isFocused ? "600" : "500",
            fontFamily: "DMSans_500Medium",
          }}
        >
          {label}
        </Text>
      </Pressable>
    );
  }
);
SidebarItem.displayName = "SidebarItem";
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Custom tabBar function with React Navigation BottomTabNavigator | expo-router/ui headless Tabs components | Expo Router v3+ | Full visual control without fighting default styles |
| Redirect in useEffect with router.replace | Declarative `<Redirect>` component | Expo Router v2+ | Avoids navigation-before-mount crash |
| Stack.Protected (guard prop) | Available but optional alternative to Redirect pattern | SDK 53+ | More declarative auth, but adds complexity |
| Nested TabNavigator inside Stack | Root Stack wrapping (tabs) route group | Expo Router v1+ | Standard pattern — modal overlays work correctly |

**Deprecated/outdated:**
- Imperative `router.replace("/(auth)/login")` inside `useEffect` for auth redirect: causes "Attempted to navigate before mounting the Root Layout component" crash in some versions. Use `<Redirect>` component instead.
- `tabBarVisible` prop: Removed in newer React Navigation. Use `tabBarStyle: { display: 'none' }` instead (not relevant here since we're using expo-router/ui).

---

## Open Questions

1. **TabTrigger + Scan Modal Interception**
   - What we know: `TabTrigger` from `expo-router/ui` wraps a `Pressable` and accepts `onPress`. The standard `Tabs.Screen listeners` tabPress pattern is for the non-headless Tabs from expo-router.
   - What's unclear: Whether expo-router/ui's `TabTrigger` `onPress` overrides the default tab-switch behavior, or if it fires alongside it.
   - Recommendation: For the Scan button in MobileTabBar, do NOT use `TabTrigger` — render a plain `Pressable` that calls `router.push("/(scan)")` directly. This is cleaner and avoids the interception complexity. The dummy `app/(tabs)/scan.tsx` file is still needed to register the route.

2. **Collections as Non-Tab Web Sidebar Item**
   - What we know: Collections is a sidebar item on web but is NOT registered as a tab route. The hidden TabList only registers the 5 mobile tabs.
   - What's unclear: Whether a `TabTrigger name="collections"` outside TabList requires a corresponding TabList entry.
   - Recommendation: Do NOT use TabTrigger for Collections in the sidebar. Use a plain `Pressable` with `router.push("/collections")`. TabTrigger only needed for registered tab routes.

3. **expo-router/ui TabList display:none on native**
   - What we know: The hidden TabList pattern (`style={{ display: 'none' }}`) is shown in official docs but may behave differently on native vs web.
   - What's unclear: Exact behavior of `display: 'none'` on React Native View inside the TabList.
   - Recommendation: Use `style={{ height: 0, overflow: 'hidden', position: 'absolute' }}` for the hidden TabList to ensure it's truly invisible on both native and web without layout side effects.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Jest 30.x with ts-jest |
| Config file | jest.config.js (testEnvironment: 'node', roots: ['src']) |
| Quick run command | `npm test -- --testPathPattern=useBreakpoint` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| NAV-01 | Route group structure — (tabs)/, (auth)/, (public)/ separation | Manual smoke | n/a | N/A — file structure check |
| NAV-02 | Mobile tab bar renders 5 tabs with correct token values | Manual smoke | n/a | N/A — visual |
| NAV-03 | Web sidebar renders at 260px with correct items | Manual smoke | n/a | N/A — visual |
| NAV-04 | Tablet shows bottom tab bar + per-screen header | Manual smoke | n/a | N/A — visual |
| NAV-05 | PageContainer applies correct padding per breakpoint | unit | `npm test -- --testPathPattern=PageContainer` | ❌ Wave 0 |

**Note:** This phase is predominantly structural (file moves + nav chrome). Tests focus on the one pure-logic component (PageContainer). Visual nav chrome requires manual smoke testing at each breakpoint.

### Sampling Rate
- **Per task commit:** `npm test` (full suite, fast — currently < 5s)
- **Per wave merge:** `npm test` + manual breakpoint smoke (mobile 390px, tablet 768px, web 1440px)
- **Phase gate:** Full suite green + manual smoke green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/components/nav/__tests__/PageContainer.test.tsx` — covers NAV-05 (padding values per breakpoint)
- [ ] Framework config update may be needed: jest.config.js `testMatch` is `**/__tests__/**/*.test.ts` — needs `.test.tsx` added to cover the new component test

---

## File Migration Map

This is the exact set of moves for NAV-01. Every existing screen must remain accessible after restructure.

| Current Path | New Path | Notes |
|---|---|---|
| `app/index.tsx` | `app/(tabs)/index.tsx` | Stub — Phase 10 rebuilds content |
| `app/settings.tsx` | `app/(tabs)/profile.tsx` | Renamed to match tab destination |
| `app/collections/index.tsx` | `app/(tabs)/collections/index.tsx` | |
| `app/collections/[id].tsx` | `app/(tabs)/collections/[id].tsx` | |
| `app/collections/create.tsx` | `app/(tabs)/collections/create.tsx` | |
| `app/recipes/index.tsx` | `app/(tabs)/recipes/index.tsx` | |
| `app/recipes/[id].tsx` | `app/(tabs)/recipes/[id].tsx` | |
| `app/recipes/[id]/edit.tsx` | `app/(tabs)/recipes/[id]/edit.tsx` | |
| `app/recipes/create.tsx` | `app/(tabs)/recipes/create.tsx` | |
| `app/invite/[token].tsx` | `app/(tabs)/invite/[token].tsx` | |
| `app/(family)/_layout.tsx` | `app/(tabs)/family/_layout.tsx` | Stack layout for family sub-screens |
| `app/(family)/index.tsx` | `app/(tabs)/family/index.tsx` | |
| `app/(family)/family/[id].tsx` | `app/(tabs)/family/[id].tsx` | Path flattened — remove double `family/family/` |
| `app/(scan)/` | `app/(scan)/` | NO MOVE — stays at root for modal presentation |
| `app/(auth)/` | `app/(auth)/` | NO MOVE — stays as-is |

**New files to create:**
| Path | Purpose |
|------|---------|
| `app/(tabs)/_layout.tsx` | Core adaptive nav chrome (Tabs + auth redirect) |
| `app/(tabs)/my-recipes.tsx` | My Recipes tab stub |
| `app/(tabs)/scan.tsx` | Scan tab dummy file (never rendered, just registers route) |
| `app/(public)/_layout.tsx` | Public route group stub for Phase 11 |
| `src/components/nav/MobileTabBar.tsx` | 5-tab bottom bar component |
| `src/components/nav/WebSidebar.tsx` | 260px sidebar component |
| `src/components/nav/TabButton.tsx` | Reusable tab button with isFocused |
| `src/components/nav/SidebarItem.tsx` | Reusable sidebar nav item with isFocused |
| `src/components/nav/PageContainer.tsx` | Screen wrapper with padding/max-width |

---

## Sources

### Primary (HIGH confidence)
- `/Users/elinicholson/development/cookbook/node_modules/expo-router/build/ui/Tabs.d.ts` — TabsProps, TabsContextValue, useTabsWithChildren API verified from installed package
- `/Users/elinicholson/development/cookbook/node_modules/expo-router/build/ui/TabTrigger.d.ts` — TabTriggerProps, TabTriggerSlotProps (isFocused, asChild, href) verified
- `/Users/elinicholson/development/cookbook/node_modules/expo-router/build/ui/TabList.d.ts` — TabListProps verified
- `/Users/elinicholson/development/cookbook/node_modules/expo-router/build/ui/TabSlot.d.ts` — TabSlotProps verified
- `cookbook.pen lines 295–365` — TabBar component: height 84, padding [12,32,28,32], 5 lucide icons verified
- `cookbook.pen lines 2325–2599` — Sidebar: 260px, bgCard, gap 32, padding [32,24], 6 nav items with active=accentWarm, cornerRadius 12 verified
- `cookbook.pen lines 1623–1702` — Tablet header: padding [20,32], greeting + user name + action buttons verified
- [https://docs.expo.dev/router/advanced/custom-tabs/](https://docs.expo.dev/router/advanced/custom-tabs/) — Custom tab layout API
- [https://docs.expo.dev/router/basics/common-navigation-patterns/](https://docs.expo.dev/router/basics/common-navigation-patterns/) — Stack with (tabs) + modal pattern
- [https://docs.expo.dev/router/advanced/authentication/](https://docs.expo.dev/router/advanced/authentication/) — SessionProvider + Redirect pattern

### Secondary (MEDIUM confidence)
- [https://expo.dev/blog/how-to-build-custom-tabs-with-expo-router-ui](https://expo.dev/blog/how-to-build-custom-tabs-with-expo-router-ui) — Official Expo blog post on headless tabs, asChild pattern, secondary TabTrigger usage
- [https://gist.github.com/yycorcino/4559d81574c2cc4c6a3cb8539ec296c9](https://gist.github.com/yycorcino/4559d81574c2cc4c6a3cb8539ec296c9) — Scan-tab-as-modal interception pattern (e.preventDefault + navigation.navigate)
- [https://docs.expo.dev/router/advanced/protected/](https://docs.expo.dev/router/advanced/protected/) — Stack.Protected guard API (SDK 53+, available in this project)

### Tertiary (LOW confidence)
- None — all critical claims verified against installed package or official docs

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — verified against installed package.json and node_modules
- Architecture: HIGH — expo-router/ui API verified from installed .d.ts files; patterns cross-referenced with official docs
- Pitfalls: HIGH — identified from official docs warnings + known React Native constraints
- Validation architecture: HIGH — jest.config.js read directly; test files catalogued

**Research date:** 2026-03-03
**Valid until:** 2026-06-03 (90 days — expo-router/ui API stable at v4; check if project upgrades to v5+)