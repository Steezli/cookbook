---
phase: 12-remaining-screens
plan: 08
subsystem: database
tags: [supabase, postgrest, rls, react-native-web, family, migrations]

# Dependency graph
requires:
  - phase: 12-remaining-screens
    provides: family detail screen and family_memberships table
provides:
  - Migration adding FK from family_memberships to profiles enabling PostgREST embed join
  - DELETE RLS policy on families table for admin members
  - Web-compatible confirm dialogs in family detail (window.confirm on web, Alert.alert on native)
  - Null-safe profiles normalization in member refresh query
affects: [family-detail, family-management, invite-creation]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "confirmAction helper pattern: Platform.OS check selects window.confirm (web) vs Alert.alert (native) for destructive action dialogs"
    - "Double FK pattern on user_id: FK to auth.users for referential integrity, FK to profiles for PostgREST embedding"

key-files:
  created:
    - supabase/migrations/20260310000000_fix_family_memberships.sql
  modified:
    - app/(tabs)/family/[id].tsx

key-decisions:
  - "Double FK on family_memberships.user_id: existing FK to auth.users kept for integrity; new FK to public.profiles enables PostgREST profiles() embedded join"
  - "confirmAction helper at module level: centralises Platform.OS branching for all destructive confirm dialogs in family detail"
  - "NOTIFY pgrst reload schema in migration: ensures PostgREST discovers create_family_invite RPC without server restart"

patterns-established:
  - "confirmAction(title, message, onConfirm): reusable helper for Platform-aware confirm dialogs; apply same pattern to any new destructive actions"

requirements-completed: [SCREEN-06]

# Metrics
duration: 15min
completed: 2026-03-10
---

# Phase 12 Plan 08: Family Detail Fix Summary

**PostgREST profiles join unblocked via second FK on family_memberships, DELETE RLS added on families, and web-safe window.confirm dialogs replacing Alert.alert for all destructive actions**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-03-10T00:00:00Z
- **Completed:** 2026-03-10T00:00:00Z
- **Tasks:** 2 of 3 complete (Task 3 awaits human action: deploy migration)
- **Files modified:** 2

## Accomplishments

- Migration file created that adds FK to profiles, DELETE RLS policy on families, and schema cache reload NOTIFY
- All destructive confirmation dialogs in family detail now use `confirmAction` helper (window.confirm on web, Alert.alert on native)
- Member profiles normalization made explicitly null-safe with empty-string fallbacks
- TypeScript compiles cleanly with no errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Create migration** - `a594aa6` (feat)
2. **Task 2: Fix family detail** - `914ff6d` (fix)
3. **Task 3: Deploy migration** - PENDING (human-action checkpoint)

## Files Created/Modified

- `supabase/migrations/20260310000000_fix_family_memberships.sql` - Adds FK family_memberships->profiles, DELETE RLS on families, NOTIFY pgrst schema reload
- `app/(tabs)/family/[id].tsx` - confirmAction helper, Platform import, null-safe member normalization

## Decisions Made

- Used double FK pattern on `user_id`: existing FK to `auth.users` kept (referential integrity), new FK to `public.profiles` added (PostgREST embedding). Standard pattern for Supabase apps.
- `confirmAction` extracted as module-level helper rather than inline per call site — avoids code duplication across four confirmation dialogs.
- `NOTIFY pgrst, 'reload schema'` included in migration — ensures `create_family_invite` RPC is visible to PostgREST immediately after migration, no server restart needed.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None during Tasks 1-2. Task 3 requires manual deployment (human-action checkpoint).

## User Setup Required

**Task 3 requires manual deployment of the migration to remote Supabase.**

Options:
- **CLI:** `npx supabase db push` from the project root
- **Dashboard:** Copy `supabase/migrations/20260310000000_fix_family_memberships.sql` into Supabase Dashboard SQL Editor and run

After applying, verify:
1. Family detail page loads members with display names (not "Not Found" error)
2. Leave button on web shows browser confirm dialog
3. Creating an invite succeeds (no 404 on create_family_invite RPC)

## Next Phase Readiness

- After migration is deployed: family detail, leave/delete actions, and invite creation should all be unblocked
- Plan 09 (next gap closure) can proceed in parallel since it targets different screens

## Self-Check: PASSED

All files verified on disk. Both task commits confirmed in git history.

---
*Phase: 12-remaining-screens*
*Completed: 2026-03-10 (partial — awaiting migration deployment)*
