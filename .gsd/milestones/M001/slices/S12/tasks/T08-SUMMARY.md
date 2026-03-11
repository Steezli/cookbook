---
id: T08
parent: S12
milestone: M001
provides:
  - Migration adding FK from family_memberships to profiles enabling PostgREST embed join
  - DELETE RLS policy on families table for admin members
  - Web-compatible confirm dialogs in family detail (window.confirm on web, Alert.alert on native)
  - Null-safe profiles normalization in member refresh query
requires: []
affects: []
key_files: []
key_decisions: []
patterns_established: []
observability_surfaces: []
drill_down_paths: []
duration: ~1h
verification_result: passed
completed_at: 2026-03-10
blocker_discovered: false
---
# T08: 12-remaining-screens 08

**# Phase 12 Plan 08: Family Detail Fix Summary**

## What Happened

# Phase 12 Plan 08: Family Detail Fix Summary

**PostgREST profiles join unblocked via second FK on family_memberships, DELETE RLS added on families, and all Alert.alert calls replaced with web-safe window.confirm/window.alert helpers in family detail**

## Performance

- **Duration:** ~1h
- **Completed:** 2026-03-10
- **Tasks:** 3 of 3 complete
- **Files modified:** 3

## Accomplishments

- Migration file created and deployed that adds FK to profiles, DELETE RLS policy on families, and schema cache reload NOTIFY
- All destructive confirmation dialogs in family detail now use `confirmAction` helper (window.confirm on web, Alert.alert on native)
- All remaining `Alert.alert` calls replaced with `showAlert` helper for full web compatibility
- Member profiles normalization made explicitly null-safe with empty-string fallbacks
- TypeScript compiles cleanly with no errors

## Task Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | a594aa6 | feat(12-08): add migration to fix family_memberships FK and families DELETE policy |
| 2 | 914ff6d | fix(12-08): web-compatible confirm dialogs and null-safe member profiles in family detail |
| 2 (extra fix) | 2a40647 | fix(12): web-compatible alerts in family detail, forgot password UX, reset password polish |
| 3 | (human) | Migration deployed to remote Supabase by user |

## Files Created/Modified

- `supabase/migrations/20260310000000_fix_family_memberships.sql` — Adds FK family_memberships->profiles, DELETE RLS on families, NOTIFY pgrst schema reload
- `app/(tabs)/family/[id].tsx` — confirmAction helper, showAlert helper, Platform import, null-safe member normalization; all Alert.alert calls replaced

## Decisions Made

- Used double FK pattern on `user_id`: existing FK to `auth.users` kept (referential integrity), new FK to `public.profiles` added (PostgREST embedding). Standard pattern for Supabase apps.
- `confirmAction` extracted as module-level helper rather than inline per call site — avoids code duplication across four confirmation dialogs.
- `NOTIFY pgrst, 'reload schema'` included in migration — ensures `create_family_invite` RPC is visible to PostgREST immediately after migration, no server restart needed.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing coverage] Replaced all remaining Alert.alert calls beyond confirmAction**
- **Found during:** Post-task 2 review
- **Issue:** commit 914ff6d applied `confirmAction` to the main confirm dialogs but additional `Alert.alert` call-sites remained in `family/[id].tsx`
- **Fix:** Introduced `showAlert` helper replacing ALL remaining `Alert.alert` uses in `family/[id].tsx` for complete web compatibility
- **Files modified:** `app/(tabs)/family/[id].tsx`, `app/(auth)/forgot-password.tsx`, `app/(auth)/reset-password.tsx`
- **Commit:** 2a40647

## Success Criteria

- [x] Family detail loads members with display names (after migration applied)
- [x] Leave/remove/delete confirmations work on web (window.confirm) and native (Alert.alert)
- [x] Admin can delete a family (DELETE RLS policy exists)
- [x] create_family_invite RPC is accessible (PostgREST schema cache reloaded via NOTIFY)

## Self-Check: PASSED

All files verified on disk. All task commits confirmed in git history.

---
*Phase: 12-remaining-screens*
*Completed: 2026-03-10*
