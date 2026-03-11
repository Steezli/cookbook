---
phase: 09-navigation-restructure
plan: 02
subsystem: ui
tags: [expo-router, navigation, tabs, headless-tabs, route-groups]

# Dependency graph
requires:
  - phase: 09-01
    provides: useBreakpoint hook, lucide-react-native installed, nav type contracts

provides:
  - All app screens relocated into app/(tabs)/ route group
  - Root layout explicitly declaring (tabs), (auth), (public), (scan) as Stack screens
  - (scan) route group presenting as modal overlay
  - (tabs)/_layout.tsx with headless Tabs from expo-router/ui and auth redirect
  - app/(public)/_layout.tsx stub for Phase 11
affects:
  - 09-03 (tab bar and sidebar components will replace inline placeholders)
  - 11-public-browsing (builds on (public)/_layout.tsx stub)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Headless Tabs via expo-router/ui Tabs/TabList/TabTrigger/TabSlot"
    - "Auth redirect via useSession() + Redirect in (tabs)/_layout.tsx"
    - "Route group flattening: (family)/family/[id] -> (tabs)/family/[id]"
    - "Hidden TabList (height:0, overflow:hidden) registers routes without visible chrome"
    - "Breakpoint-aware flex direction: isWeb -> row, else column"

key-files:
  created:
    - app/(tabs)/_layout.tsx
    - app/(tabs)/my-recipes.tsx
    - app/(tabs)/scan.tsx
    - app/(public)/_layout.tsx
  modified:
    - app/_layout.tsx
    - app/(tabs)/index.tsx
    - app/(tabs)/family/index.tsx
    - app/(tabs)/invite/[token].tsx

key-decisions:
  - "Hidden TabList pattern: height:0/overflow:hidden/position:absolute registers routes without exposing UI — Plan 03 delivers real chrome"
  - "as any type casts on new tab hrefs: expo-router typed routes are stale until build-time regeneration; consistent with existing codebase pattern"
  - "Inline breakpoint-aware placeholders: avoids dependency on Plan 01 lucide icons not being available during parallel execution"
  - "Family routes flattened: (family)/family/[id] -> (tabs)/family/[id], all internal links updated"

patterns-established:
  - "TabList must be present (even hidden) for expo-router/ui TabTrigger routes to register"
  - "(tabs) group prefix is stripped from URLs: /family resolves to (tabs)/family/, etc."

requirements-completed: [NAV-01]

# Metrics
duration: 5min
completed: 2026-03-04
---

# Phase 09 Plan 02: Screen Migration & Headless Tabs Layout Summary

**All app screens relocated into app/(tabs)/ via git mv, root Stack declares 4 route groups with (scan) as modal, and (tabs)/_layout.tsx establishes headless Tabs with auth redirect and breakpoint-aware nav placeholders**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-03-04T06:59:00Z
- **Completed:** 2026-03-04T07:03:00Z
- **Tasks:** 2
- **Files modified:** 8 (moved/created/edited)

## Accomplishments
- Migrated 15 screen files into app/(tabs)/ using git mv (preserves git history)
- Flattened (family)/family/[id] double-nesting to (tabs)/family/[id]
- Root layout now declares all 4 route groups as explicit Stack screens; (scan) is a modal
- Created (tabs)/_layout.tsx with headless Tabs from expo-router/ui, auth guard, and breakpoint-aware placeholders
- Created (public)/_layout.tsx stub for Phase 11

## Task Commits

1. **Task 1: Move screen files into (tabs)/ route group** - `8c20699` (feat)
2. **Task 2: Update root layout and create tabs layout with headless Tabs** - `6b16750` (feat)

## Files Created/Modified
- `app/_layout.tsx` - Root Stack now declares (tabs), (auth), (public), (scan) groups; (scan) is modal
- `app/(tabs)/_layout.tsx` - Headless Tabs with auth redirect, hidden TabList, breakpoint-aware placeholders
- `app/(tabs)/index.tsx` - Moved from app/index.tsx; links updated (/settings -> /profile, /(family) -> /family)
- `app/(tabs)/profile.tsx` - Moved from app/settings.tsx (renamed)
- `app/(tabs)/my-recipes.tsx` - New stub screen for My Recipes tab
- `app/(tabs)/scan.tsx` - New dummy file redirecting to /(scan) modal
- `app/(tabs)/collections/*` - Moved from app/collections/*
- `app/(tabs)/recipes/*` - Moved from app/recipes/*
- `app/(tabs)/invite/[token].tsx` - Moved; family link updated
- `app/(tabs)/family/_layout.tsx` - Moved from app/(family)/_layout.tsx
- `app/(tabs)/family/index.tsx` - Moved from app/(family)/index.tsx; links updated
- `app/(tabs)/family/[id].tsx` - Moved and flattened from app/(family)/family/[id].tsx
- `app/(public)/_layout.tsx` - New stub for Phase 11 public browsing

## Decisions Made
- **Hidden TabList**: `height: 0, overflow: 'hidden', position: 'absolute'` registers tab routes without visible chrome. Plan 03 delivers the real MobileTabBar and WebSidebar components.
- **`as any` type casts on new hrefs**: Expo Router's typed route manifest is stale until build-time regeneration. This is consistent with existing codebase usage and will auto-resolve when expo runs.
- **Inline breakpoint placeholders**: To avoid a dependency on Plan 01's lucide-react-native (which may run in parallel), placeholders are inline View+Text elements. Plan 03 replaces them.
- **Route flattening**: The old double-nested `(family)/family/[id]` path is now `(tabs)/family/[id]`. All internal `router.push`/`Link href` references updated accordingly.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Expo Router's static typed route types don't include the new routes until expo is run and types are regenerated. Used `as any` type casts (consistent with existing codebase pattern) to silence TS2820 errors.
- Pre-existing TypeScript errors in `src/features/scan/` and `src/lib/scan/` are unrelated to this plan.
- Pre-existing test failure in `src/lib/scan/__tests__/scan-draft-service.test.ts` is unrelated to this plan.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- (tabs)/_layout.tsx headless Tabs layout is ready for Plan 03 to replace the inline nav placeholders with MobileTabBar and WebSidebar components
- All screens accessible at their new (tabs)/ paths
- Auth redirect in place for unauthenticated users
- (scan) modal presentation configured at root Stack level

---
*Phase: 09-navigation-restructure*
*Completed: 2026-03-04*
