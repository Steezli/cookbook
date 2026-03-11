---
status: diagnosed
trigger: "UAT Phase 12 test 7: On web, clicking Collections in the sidebar either loads straight into first collection detail instead of list, or no create collection button visible"
created: 2026-03-10T00:00:00Z
updated: 2026-03-10T00:00:00Z
---

## Current Focus

hypothesis: The reported UAT gap does not match current code — routing and UI are correctly wired
test: Reviewed all four areas specified in the investigation
expecting: A routing or layout issue causing index to be skipped
next_action: Report findings — no code defect found

## Symptoms

expected: Clicking "Collections" in web sidebar loads the collection list view with a "New Collection" button
actual: UAT report claims it loads into first collection detail or create button is not visible
errors: none reported
reproduction: Click Collections in web sidebar on web breakpoint
started: Reported during Phase 12 UAT

## Eliminated

- hypothesis: Collections TabTrigger missing from hidden TabList
  evidence: app/(tabs)/_layout.tsx line 40 has `<TabTrigger name="collections" href={"/collections" as any} />` — present and correct
  timestamp: 2026-03-10

- hypothesis: WebSidebar uses router.navigate instead of TabTrigger for collections
  evidence: WebSidebar.tsx lines 64-66 use `<TabTrigger name="collections" asChild>` — correct TabTrigger pattern, same as Home/My Recipes/Family/Settings
  timestamp: 2026-03-10

- hypothesis: collections/_layout.tsx interferes with routing (redirect, initialRouteName, etc.)
  evidence: Layout is a plain `<Stack screenOptions={{ headerShown: false }} />` — identical pattern to recipes/_layout.tsx and family/_layout.tsx. No redirect, no initialRouteName override.
  timestamp: 2026-03-10

- hypothesis: collections/index.tsx is missing or does not render list view / create button
  evidence: File exists (218 lines), renders "Collections" header with "New Collection" button (lines 124-144), FlatList of collection cards, and empty state with "Create Your First Collection" CTA. Button is gated on `session` being truthy (always true inside authenticated tabs).
  timestamp: 2026-03-10

## Evidence

- timestamp: 2026-03-10
  checked: app/(tabs)/_layout.tsx (hidden TabList, lines 29-43)
  found: TabTrigger name="collections" href="/collections" is registered at line 40, between my-recipes and family
  implication: Collections is a registered tab route — expo-router/ui Tabs knows about it

- timestamp: 2026-03-10
  checked: src/components/nav/WebSidebar.tsx (lines 64-66)
  found: Collections uses `<TabTrigger name="collections" asChild>` with SidebarItem — same pattern as all other tab items
  implication: Sidebar click triggers proper tab navigation, not raw router.push

- timestamp: 2026-03-10
  checked: app/(tabs)/collections/_layout.tsx
  found: Plain Stack layout with headerShown: false — identical to recipes/ and family/ layouts
  implication: No layout interference. Stack will render index.tsx as the initial screen by convention.

- timestamp: 2026-03-10
  checked: app/(tabs)/collections/index.tsx (218 lines)
  found: Renders full list view with header ("Collections"), "New Collection" button (Pressable, accentBlue, lines 125-144), loading state, error state, empty state with "Create Your First Collection" CTA, and FlatList of collection cards with responsive columns
  implication: List screen is complete and button is visible for authenticated users

- timestamp: 2026-03-10
  checked: No redirect or initialRouteName in collections layout
  found: grep for redirect/initialRouteName returns zero matches in collections directory
  implication: Stack navigator defaults to index.tsx as expected

- timestamp: 2026-03-10
  checked: Prior debug session (.planning/debug/collections-route-unreachable.md)
  found: Previous investigation identified missing TabTrigger and wrong navigation method. These were fixed in Plan 12-07 (commit f87a758).
  implication: The original bugs were fixed. Current code is correct.

## Resolution

root_cause: NO CODE DEFECT FOUND. The UAT gap described (loads into first collection detail, or no create button visible) does not match the current codebase:

1. **TabTrigger registration** — Present at `_layout.tsx:40` (fixed in Plan 12-07)
2. **WebSidebar wiring** — Uses proper `TabTrigger name="collections" asChild` at `WebSidebar.tsx:65` (fixed in Plan 12-07)
3. **Stack layout** — Standard pattern, no redirect or initialRouteName override
4. **Index screen** — Full list view with "New Collection" button, visible when authenticated

The issues described in the UAT report match the *prior* state of the codebase (before Plan 12-07 fixes). The fixes in commit f87a758 resolved the routing issues. This UAT gap appears to be stale — testing against pre-fix code, or a false report.

**Possible runtime-only causes to verify manually:**
- Supabase auth session not resolving (would hide the button since it's gated on `session`)
- `getCollections()` API call failing silently (would show error state, not detail view)
- Browser cache serving old JS bundle

fix: None needed — code is correct
verification: Code review of all four investigation targets confirms correct wiring
files_changed: []
