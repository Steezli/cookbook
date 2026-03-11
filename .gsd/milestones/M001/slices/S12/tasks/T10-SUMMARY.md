---
id: T10
parent: S12
milestone: M001
provides:
  - Signup screen shows "Already have an account? Sign In" as inline text link (not bordered button)
  - Collection detail remove/delete confirmations work on web via window.confirm
  - Supabase Dashboard Site URL updated for production forgot-password email links
  - Collections list verified accessible on web after hard refresh
requires: []
affects: []
key_files: []
key_decisions: []
patterns_established: []
observability_surfaces: []
drill_down_paths: []
duration: 20min
verification_result: passed
completed_at: 2026-03-10
blocker_discovered: false
---
# T10: 12-remaining-screens 10

**# Phase 12 Plan 10: Signup Link + Collections Web Alerts + Supabase Dashboard Config Summary**

## What Happened

# Phase 12 Plan 10: Signup Link + Collections Web Alerts + Supabase Dashboard Config Summary

**Replaced signup "Sign In Instead" bordered button with inline accentWarm text link; added web-compatible confirmAction/showAlert helpers to collections detail screen; user updated Supabase Dashboard Site URL for production reset emails**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-03-10T00:00:00Z
- **Completed:** 2026-03-10T00:20:00Z
- **Tasks:** 2 of 2 (all complete)
- **Files modified:** 2 (code) + Supabase Dashboard (manual)

## Accomplishments

- Replaced bordered ghost button on signup screen with inline "Already have an account? Sign In" text link using accentWarm color, matching the login screen's "Don't have an account? Sign Up" pattern
- Added `confirmAction` and `showAlert` module-level helpers to `collections/[id].tsx` with Platform.OS branch — window.confirm on web, Alert.alert on native
- Replaced all four `Alert.alert` call sites in collections detail: `handleRemoveRecipe`, `handleAddRecipe` catch, `handleDelete`, and `handleDelete` catch
- User updated Supabase Dashboard Site URL from localhost:3000 to production URL and configured redirect URLs with berven:// deep link scheme
- Collections list screen verified accessible on web in incognito (no code change needed — stale cache issue)

## Task Commits

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Signup text link + collection web-compatible alerts | cb89bfd | app/(auth)/signup.tsx, app/(tabs)/collections/[id].tsx |
| 2 | Update Supabase Dashboard Site URL | user action | Supabase Dashboard configuration |

## Files Created/Modified

- `app/(auth)/signup.tsx` - Replaced bordered "Sign In Instead" Pressable with inline text link (accentWarm, fontFamilyBodyBold, fontSize 14) inside a row View
- `app/(tabs)/collections/[id].tsx` - Added Platform import; added confirmAction/showAlert helpers; replaced all Alert.alert calls with web-compatible equivalents

## Decisions Made

- Inline text link pattern for cross-auth-screen navigation adopted consistently: login -> signup (Sign Up), signup -> login (Sign In) — both now use same accentWarm text link style
- confirmAction/showAlert pattern from 12-08 extended to collections — now standard pattern for all screens with destructive dialogs
- Supabase Dashboard update is a manual gate (no CLI/API path) — documented as human-action checkpoint, not a code deviation

## Deviations from Plan

None — plan executed exactly as written.

## Authentication Gate

Task 2 was a `checkpoint:human-action` gate requiring manual Supabase Dashboard configuration. The user updated the Site URL and configured redirect URLs including the `berven://` deep link scheme. Forgot password reset emails now link to the production URL.

## Next Phase Readiness

- UAT Tests 2, 3, 6, and 7 are resolved
- Signup and login screens now have consistent cross-navigation text link patterns
- All collection detail destructive actions work on web
- Forgot password flow links to correct production URL

---
*Phase: 12-remaining-screens*
*Completed: 2026-03-10*
