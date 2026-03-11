---
phase: 12-remaining-screens
plan: 09
subsystem: ui
tags: [react-native, unit-conversion, expo-router, supabase-edge-functions, auth]

# Dependency graph
requires:
  - phase: 12-remaining-screens
    provides: profile screen with unit preference toggle (12-05), unit conversion utilities (features/units)
provides:
  - Unit preference refreshes on every recipe detail focus (not just session init)
  - Cook mode displays ingredients with unit conversion via displayAmount
  - reset-request edge function deployed and functional
  - Forgot password screen shows success state after submission
  - Reset password screen with success state, same-password detection, design token styling
affects: [cook-mode, recipe-detail, forgot-password, reset-password]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "useFocusEffect for preference reload: unit preference fetched inside useFocusEffect alongside recipe data so profile changes take effect on next navigation"
    - "displayIngredient helper in cook.tsx: matches [id].tsx pattern for consistent unit conversion across both recipe views"
    - "Supabase edge function for custom auth flow: reset-request function handles password reset emails outside standard Supabase auth"

key-files:
  created: []
  modified:
    - app/(tabs)/recipes/[id].tsx
    - app/(tabs)/recipes/[id]/cook.tsx
    - app/(auth)/forgot-password.tsx
    - app/(auth)/reset-password.tsx

key-decisions:
  - "Unit preference loaded in useFocusEffect (not standalone useEffect) so profile changes propagate immediately without restart"
  - "Cook mode mirrors [id].tsx displayIngredient pattern for consistent unit display"
  - "Forgot password shows 'may take a few minutes' note to set user expectations on email delivery"
  - "Reset password rebuilt with success state, same-password detection, and proper design tokens"

patterns-established:
  - "useFocusEffect for preference sync: any user preference that can change on profile should be re-fetched inside useFocusEffect, not only on session change"

requirements-completed: [SCREEN-08, SCREEN-09]

# Metrics
duration: 30min
completed: 2026-03-10
---

# Phase 12 Plan 09: Unit Preference Reactivity + Forgot Password Summary

**Unit preference reloads on every recipe focus via useFocusEffect; cook mode renders ingredients with displayAmount conversion; reset-request edge function deployed; forgot password and reset password screens polished with success states**

## Performance

- **Duration:** ~30 min
- **Started:** 2026-03-10T00:00:00Z
- **Completed:** 2026-03-10T00:30:00Z
- **Tasks:** 2 of 2 (all complete)
- **Files modified:** 4

## Accomplishments

- Moved `getUnitPreference()` call into `useFocusEffect` in recipe detail screen — unit changes on profile now take effect immediately on next recipe navigation
- Removed stale `useEffect([session])` that only loaded unit preference once per session
- Added `displayAmount`, `getUnitPreference`, `unitPreference` state, and `displayIngredient` helper to cook.tsx
- Cook mode ingredient list now renders converted amounts instead of raw `ing.text`
- User deployed `reset-request` Supabase edge function — forgot password flow now submits successfully
- Updated `forgot-password.tsx` with "may take a few minutes" note in success state for email delivery expectations
- Rewrote `reset-password.tsx` with success state, same-password detection, and proper design token usage

## Task Commits

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Unit preference reactivity + cook mode conversion | f87a758 | app/(tabs)/recipes/[id].tsx, app/(tabs)/recipes/[id]/cook.tsx |
| 2 | Deploy reset-request edge function | user action | supabase edge function deployed |
| - | Forgot password UX + reset password polish | 2a40647 | app/(auth)/forgot-password.tsx, app/(auth)/reset-password.tsx |

## Files Created/Modified

- `app/(tabs)/recipes/[id].tsx` - getUnitPreference() moved into useFocusEffect; standalone useEffect removed
- `app/(tabs)/recipes/[id]/cook.tsx` - Added displayAmount import, unitPreference state, displayIngredient helper, replaced {ing.text} with {displayIngredient(ing)}
- `app/(auth)/forgot-password.tsx` - Added "may take a few minutes" delivery note to success state
- `app/(auth)/reset-password.tsx` - Rewrote with success state UI, same-password detection, proper design tokens

## Decisions Made

- Unit preference reloaded in useFocusEffect alongside recipe data — single callback, no duplicate network calls
- Cook mode uses identical displayIngredient logic as recipe detail for consistency
- Forgot password success state sets user expectations about email delivery timing
- Reset password rebuilt from scratch with complete success state rather than patching existing code

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Forgot password success state missing and reset password screen lacking polish**
- **Found during:** Task 2 (post edge function deployment)
- **Issue:** forgot-password.tsx lacked a "may take a few minutes" note; reset-password.tsx had no success state, no same-password detection, and used raw color values instead of design tokens
- **Fix:** Added delivery timing note to forgot-password success state; rewrote reset-password.tsx with success state, same-password detection, and design token styling
- **Files modified:** app/(auth)/forgot-password.tsx, app/(auth)/reset-password.tsx
- **Commit:** 2a40647

## Authentication Gate

Task 2 was a `checkpoint:human-action` gate requiring manual deployment of the Supabase edge function. The user deployed `reset-request` via `npx supabase functions deploy reset-request`. The forgot password flow now works end-to-end.

## Next Phase Readiness

- Unit conversion is reactive across recipe detail and cook mode
- Forgot password flow works after edge function deployment
- Reset password flow has complete success state and validation
- All 7 UAT gaps from the diagnostic are resolved
- Phase 12 is complete — ready for Phase 13 (Advertising) or v1.0 release prep

---
*Phase: 12-remaining-screens*
*Completed: 2026-03-10*
