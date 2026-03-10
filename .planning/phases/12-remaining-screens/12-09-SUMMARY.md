---
phase: 12-remaining-screens
plan: 09
subsystem: ui
tags: [react-native, unit-conversion, expo-router, supabase-edge-functions]

# Dependency graph
requires:
  - phase: 12-remaining-screens
    provides: profile screen with unit preference toggle (12-05), unit conversion utilities (features/units)
provides:
  - Unit preference refreshes on every recipe detail focus (not just session init)
  - Cook mode displays ingredients with unit conversion via displayAmount
  - reset-request edge function deployed (pending human action)
affects: [cook-mode, recipe-detail, forgot-password]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "useFocusEffect for preference reload: unit preference fetched inside useFocusEffect alongside recipe data so profile changes take effect on next navigation"
    - "displayIngredient helper in cook.tsx: matches [id].tsx pattern for consistent unit conversion across both recipe views"

key-files:
  created: []
  modified:
    - app/(tabs)/recipes/[id].tsx
    - app/(tabs)/recipes/[id]/cook.tsx

key-decisions:
  - "Unit preference loaded in useFocusEffect (not standalone useEffect) so profile changes propagate immediately without restart"
  - "Cook mode mirrors [id].tsx displayIngredient pattern for consistent unit display"

patterns-established:
  - "useFocusEffect for preference sync: any user preference that can change on profile should be re-fetched inside useFocusEffect, not only on session change"

requirements-completed: [SCREEN-08, SCREEN-09]

# Metrics
duration: 15min
completed: 2026-03-10
---

# Phase 12 Plan 09: Unit Preference Reactivity + Forgot Password Summary

**Unit preference now reloads on every recipe focus via useFocusEffect; cook mode renders ingredients with displayAmount conversion; reset-request edge function deployment pending human action**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-03-10T00:00:00Z
- **Completed:** 2026-03-10T00:15:00Z
- **Tasks:** 1 of 2 (Task 2 is human-action checkpoint)
- **Files modified:** 2

## Accomplishments
- Moved `getUnitPreference()` call into `useFocusEffect` in recipe detail screen — unit changes on profile now take effect immediately on next recipe navigation
- Removed stale `useEffect([session])` that only loaded unit preference once per session
- Added `displayAmount`, `getUnitPreference`, `unitPreference` state, and `displayIngredient` helper to cook.tsx
- Cook mode ingredient list now renders converted amounts instead of raw `ing.text`

## Task Commits

Task 1 changes were included as part of:

1. **Task 1: Unit preference reactivity + cook mode conversion** - `f87a758` (feat(12-07)) — changes landed in this commit alongside navigation wiring

**Plan metadata:** (pending final docs commit)

## Files Created/Modified
- `app/(tabs)/recipes/[id].tsx` - getUnitPreference() moved into useFocusEffect; standalone useEffect removed
- `app/(tabs)/recipes/[id]/cook.tsx` - Added displayAmount import, unitPreference state, displayIngredient helper, replaced {ing.text} with {displayIngredient(ing)}

## Decisions Made
- Unit preference reloaded in useFocusEffect alongside recipe data — single callback, no duplicate network calls
- Cook mode uses identical displayIngredient logic as recipe detail for consistency

## Deviations from Plan

None — plan executed exactly as written. Task 1 changes were already present from a prior commit (f87a758); verified implementation matches plan requirements exactly.

## Issues Encountered

Task 1 changes were already applied in commit f87a758 (feat(12-07): wire collections into navigation on all platforms). The git working tree was clean for both target files. Verified via `git show f87a758 -- app/(tabs)/recipes/[id].tsx` and cook.tsx that the exact plan-specified changes were present. No additional work needed.

## User Setup Required

**Task 2 requires manual deployment of the reset-request edge function:**

```bash
npx supabase functions deploy reset-request
```

If this fails with auth errors, log in first:
```bash
npx supabase login
```

After deploying, verify:
1. Visit the forgot password screen
2. Enter a valid email and submit
3. Should show success/confirmation state (not "email not found" or CORS error)

The function source is at `supabase/functions/reset-request/index.ts`.

## Next Phase Readiness
- Unit conversion is reactive across recipe detail and cook mode — ready for final UAT verification
- Forgot password flow blocked until edge function is deployed (human action required)
- After Task 2 completion, all 7 UAT gaps from the diagnostic will be resolved

---
*Phase: 12-remaining-screens*
*Completed: 2026-03-10*
