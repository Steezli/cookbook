---
id: T11
parent: S12
milestone: M001
provides:
  - Migration fixing search_path for create_family_invite and accept_family_invite to include extensions schema
  - parseIngredient fallback in displayIngredient on recipe detail screen
  - parseIngredient fallback in displayIngredient on cook mode screen
requires: []
affects: []
key_files: []
key_decisions: []
patterns_established: []
observability_surfaces: []
drill_down_paths: []
duration: 2min
verification_result: passed
completed_at: 2026-03-10
blocker_discovered: false
---
# T11: 12-remaining-screens 11

**# Phase 12 Plan 11: RPC Search Path Fix + Legacy Ingredient Unit Conversion Summary**

## What Happened

# Phase 12 Plan 11: RPC Search Path Fix + Legacy Ingredient Unit Conversion Summary

**SQL migration fixes pgcrypto search_path for family invite RPCs; parseIngredient fallback enables unit preference to affect legacy plain-text ingredients on recipe detail and cook mode.**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-10T23:04:55Z
- **Completed:** 2026-03-10T23:06:16Z
- **Tasks:** 2 of 2 complete
- **Files modified:** 3

## Accomplishments

- Created migration `20260310100000_fix_rpc_search_path.sql` with ALTER FUNCTION...SET search_path = public, extensions for both RPCs, fixing the "gen_random_bytes does not exist" failure (UAT Test 9 blocker)
- Added `parseIngredient` import and legacy fallback to `displayIngredient` in recipe detail screen — legacy ingredients (no structured amount/unit) now parse text at display time and convert based on unit preference (UAT Test 15 major)
- Applied same fallback to cook mode `displayIngredient` so unit preference works consistently in both views
- TypeScript compiles cleanly

## Task Commits

Each task was committed atomically:

1. **Task 1: Migration for RPC search_path + parseIngredient fallback** - `ec8d753` (fix)
2. **Task 2: Deploy search_path migration to remote Supabase** - (manual deployment confirmed by user)

## Files Created/Modified

- `supabase/migrations/20260310100000_fix_rpc_search_path.sql` - ALTER FUNCTION search_path fix + NOTIFY pgrst reload schema
- `app/(tabs)/recipes/[id].tsx` - Added parseIngredient import; displayIngredient legacy fallback
- `app/(tabs)/recipes/[id]/cook.tsx` - Added parseIngredient import; displayIngredient legacy fallback

## Decisions Made

- Display-time parseIngredient fallback: parse legacy ingredient text at display time (not re-ingest) so unit conversion applies without data migration. Only converts if parsed result has non-null amount + unit and is not ambiguous — otherwise falls through to raw text display.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## Deployment

Migration deployed to remote Supabase (confirmed by user). Family invite RPC and legacy ingredient unit conversion are now live.

## Next Phase Readiness

- Once migration is deployed, UAT Tests 9 (family invite blocker) and 15 (unit preference major) should pass on re-test
- No code changes needed beyond the migration deployment

---
*Phase: 12-remaining-screens*
*Completed: 2026-03-10*
