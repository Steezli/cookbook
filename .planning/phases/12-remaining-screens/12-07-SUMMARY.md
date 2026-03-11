---
phase: 12-remaining-screens
plan: "07"
subsystem: navigation
tags: [collections, routing, auth, ux, navigation]
dependency_graph:
  requires: []
  provides: [collections-navigation, signup-visibility]
  affects: [app/(tabs)/_layout.tsx, src/components/nav/WebSidebar.tsx, app/(tabs)/recipes/index.tsx, app/(auth)/login.tsx]
tech_stack:
  added: []
  patterns: [TabTrigger-asChild, hidden-TabList-registration, text-link-signup-prompt]
key_files:
  created: []
  modified:
    - app/(tabs)/_layout.tsx
    - src/components/nav/WebSidebar.tsx
    - app/(tabs)/recipes/index.tsx
    - app/(auth)/login.tsx
decisions:
  - "Collections registered as TabTrigger in hidden TabList — same pattern as other tab routes, enables isFocused active state in WebSidebar"
  - "Mobile collections access via My Recipes screen link — preserves 5-tab cookbook.pen spec without modifying MobileTabBar"
  - "Signup prompt as text link directly after Sign In button — replaced buried ghost button at page bottom with 'Don't have an account? Sign Up' in accentWarm"
metrics:
  duration: "~15 min"
  completed: "2026-03-10"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 4
---

# Phase 12 Plan 07: Collections Routing and Signup Visibility Summary

Collections routing wired via TabTrigger pattern on all platforms and signup prompt moved immediately below Sign In button using accentWarm text link.

## What Was Built

- **Collections tab route registered** in hidden TabList in `_layout.tsx` (added 5th entry: `name="collections" href="/collections"`)
- **WebSidebar Collections item** converted from plain `SidebarItem` with `router.navigate` to `TabTrigger asChild` pattern — enables proper active state
- **My Recipes screen** gains a "My Collections" Pressable row (Folder icon + ChevronRight) that navigates to collections on mobile — preserves 5-tab layout per cookbook.pen spec
- **Login screen** gains "Don't have an account? Sign Up" text link immediately after the Sign In button with `accentWarm` colored "Sign Up" text — old ghost Create Account button removed from page bottom

## Commits

| Hash | Message |
|------|---------|
| f87a758 | feat(12-07): wire collections into navigation on all platforms |
| c5571d1 | feat(12-07): improve signup visibility on login screen |

## Deviations from Plan

None - plan executed exactly as written.

## Success Criteria Verification

- [x] Collections screen reachable from web sidebar via TabTrigger (name="collections" asChild)
- [x] Collections screen reachable on mobile via My Recipes screen link (router.navigate('/collections'))
- [x] Mobile tab bar remains at 5 tabs — MobileTabBar.tsx unchanged
- [x] Signup prompt clearly visible on login screen — "Don't have an account? Sign Up" immediately after Sign In
- [x] All files compile without TypeScript errors (npx tsc --noEmit: no output)
