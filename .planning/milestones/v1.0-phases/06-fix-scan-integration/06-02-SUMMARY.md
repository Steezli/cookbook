---
phase: 06-fix-scan-integration
plan: 02
subsystem: ui
tags: [expo-router, expo-linking, react-native, navigation, scan, draft]

# Dependency graph
requires:
  - phase: 06-fix-scan-integration
    provides: Fixed scan-service.ts and scan-draft-service.ts from Plan 01
  - phase: 03-scan-to-draft-photo-to-structured
    provides: DraftEditor, DraftManager, DraftReview components and scan draft flow
provides:
  - Fixed draft/[id].tsx route params using useLocalSearchParams (expo-router pattern)
  - Fixed DraftEditor navigation using router.replace for post-convert and post-discard flows
  - Fixed DraftManager share using expo-linking createURL and React Native Share API
  - Discard confirmation dialog text matching locked user decision
affects: [scan-ui, draft-flow]

# Tech tracking
tech-stack:
  added: [expo-linking (usage in DraftManager for share URL generation)]
  patterns: [useLocalSearchParams for dynamic route params, router.replace for post-action navigation]

key-files:
  created: []
  modified:
    - app/(scan)/draft/[id].tsx
    - src/features/scans/DraftEditor.tsx
    - src/features/scans/DraftManager.tsx

key-decisions:
  - "Use Linking.createURL for share URL generation instead of window.location.origin"
  - "Use React Native Share API instead of navigator.share/navigator.clipboard"

patterns-established:
  - "Scan draft routes use useLocalSearchParams matching recipes/[id].tsx pattern"
  - "Post-action navigation uses router.replace (not router.push) for non-back-navigable flows"

requirements-completed: [SCAN-03]

# Metrics
duration: 2min
completed: 2026-03-02
---

# Phase 6 Plan 2: Fix Scan UI/Navigation Bugs Summary

**Replaced broken web-only navigation (window.location.href, window.location.origin, navigator.share) with expo-router and React Native APIs in draft review flow**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-02T23:49:58Z
- **Completed:** 2026-03-02T23:51:45Z
- **Tasks:** 1
- **Files modified:** 3

## Accomplishments
- draft/[id].tsx now uses useLocalSearchParams to get draft ID (was broken: expo-router does not pass params as component props)
- DraftEditor navigates to `/recipes/${recipeId}` after conversion and `/(scan)` after discard via router.replace (was crashing: window.location.href does not exist in React Native)
- DraftManager generates share URLs via expo-linking createURL and uses React Native Share API (was crashing: window.location.origin and navigator.share do not exist in React Native)
- Discard dialog text updated to match locked user decision: "Discard this draft? This can't be undone."

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix draft/[id].tsx route params and DraftEditor/DraftManager navigation** - `6c36ed5` (fix)

## Files Created/Modified
- `app/(scan)/draft/[id].tsx` - Replaced props-based params with useLocalSearchParams hook
- `src/features/scans/DraftEditor.tsx` - Added expo-router import, replaced window.location.href with router.replace
- `src/features/scans/DraftManager.tsx` - Added expo-linking + RN Share imports, replaced window.location.origin/navigator.share with native equivalents, updated discard dialog text

## Decisions Made
- Used `Linking.createURL` from expo-linking to generate share URLs -- this produces app-scheme deep links, the correct approach for React Native apps
- Used React Native `Share` API instead of `navigator.share` -- cross-platform compatible on iOS and Android
- Fixed path from `/recipe/${recipeId}` (singular, broken) to `/recipes/${recipeId}` (plural, matching the actual route at `app/recipes/[id].tsx`)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Pre-existing TypeScript errors found in `scan-photos.ts` and `error-reporting-service.ts` (unrelated to this plan's changes) -- documented in `deferred-items.md`

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All scan integration bugs from Phase 6 are now fixed (service-layer in Plan 01, UI/navigation in Plan 02)
- The scan-to-recipe flow should now work end-to-end: photo upload, OCR processing, draft review with correct params, draft editing with auto-save, conversion to recipe with navigation to recipe detail, discard with navigation to scan hub, and sharing via native Share API
- Pre-existing TypeScript errors in scan-photos.ts and error-reporting-service.ts remain (documented in deferred-items.md)

## Self-Check: PASSED

- [x] app/(scan)/draft/[id].tsx uses useLocalSearchParams
- [x] src/features/scans/DraftEditor.tsx uses router.replace (no window.location.href)
- [x] src/features/scans/DraftManager.tsx has no window.location.origin usage
- [x] Discard dialog text matches locked decision
- [x] Commit 6c36ed5 found

---
*Phase: 06-fix-scan-integration*
*Completed: 2026-03-02*
