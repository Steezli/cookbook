---
status: diagnosed
trigger: "collections route unreachable on iOS and web"
created: 2026-03-10T00:00:00Z
updated: 2026-03-10T00:00:00Z
---

## Current Focus

hypothesis: Collections is not registered as a tab route, so expo-router/ui Tabs cannot navigate to it
test: Check TabList registration and navigation wiring
expecting: Missing TabTrigger for collections in TabList
next_action: report findings

## Symptoms

expected: Collections screen accessible from sidebar (web) and from mobile nav (iOS)
actual: Web sidebar click does nothing / direct URL redirects to home. iOS has no collections entry at all.
errors: none visible
reproduction: Click Collections in web sidebar; try to navigate to /collections on web; look for collections on iOS
started: likely since collections was added — it was never wired as a tab

## Eliminated

(none needed — root cause identified on first pass)

## Evidence

- timestamp: 2026-03-10
  checked: app/(tabs)/_layout.tsx TabList (lines 29-42)
  found: Only 4 TabTriggers registered — index, my-recipes, family, profile. NO "collections" TabTrigger.
  implication: expo-router/ui Tabs only knows about these 4 routes. Collections directory exists but is not registered.

- timestamp: 2026-03-10
  checked: WebSidebar.tsx (lines 64-69)
  found: Collections uses plain `router.navigate("/collections")` instead of a TabTrigger
  implication: Navigation targets `/collections` which resolves to root-level, not `/(tabs)/collections`. Since there is no root-level `/collections` route, Expo Router has nowhere to go.

- timestamp: 2026-03-10
  checked: MobileTabBar.tsx
  found: Collections is completely absent from the mobile tab bar — no TabTrigger, no Pressable, nothing.
  implication: iOS users have zero path to reach collections.

- timestamp: 2026-03-10
  checked: app/(tabs)/collections/ directory
  found: _layout.tsx, index.tsx, [id].tsx, create.tsx all exist and are properly implemented
  implication: The screen code is ready — it's purely a routing/navigation wiring issue.

## Resolution

root_cause: Two independent problems preventing collections from being reachable:

1. **No TabTrigger registration in TabList** (app/(tabs)/_layout.tsx lines 29-42): The hidden TabList that registers routes with expo-router/ui only has 4 entries (index, my-recipes, family, profile). Collections is not registered, so the Tabs navigator does not know this route exists. When the sidebar tries to navigate to it, Tabs cannot resolve it.

2. **Wrong navigation path in WebSidebar** (src/components/nav/WebSidebar.tsx line 68): `router.navigate("/collections")` navigates to a root-level `/collections` path. But the collections route lives at `/(tabs)/collections`. Even if the tab were registered, this path would not resolve correctly within the tabs group.

3. **No collections entry in MobileTabBar** (src/components/nav/MobileTabBar.tsx): Collections is simply not present in the mobile tab bar at all — no button, no trigger, nothing.

fix: (not applied — research only)
verification: (not applied)
files_changed: []
