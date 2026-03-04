---
phase: 04-trust-collaboration-units-social
plan: 01
subsystem: database
tags: [postgresql, rls, recursive-cte, supabase, triggers, constraints]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: RLS patterns, helper functions (is_family_member, is_family_admin), recipes table, profiles table
provides:
  - recipe_comments table with self-referencing parent_comment_id for threading
  - recipe_ratings table with composite PK and half-star constraint (0.5 increments)
  - unit_preference column on profiles (metric/imperial)
  - rating_average and rating_count denormalized columns on recipes
  - get_recipe_comments function using recursive CTE for threaded display
  - update_recipe_rating trigger for automatic aggregate updates
  - RLS policies for comments and ratings that inherit recipe visibility
affects: [04-02, 04-03, 04-04, 04-05, phase-4-api, phase-4-ui, units, social, comments, ratings]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Security definer functions to avoid recursive RLS performance issues"
    - "Recursive CTE for hierarchical comment threading with path-based ordering"
    - "Trigger-based denormalization for rating aggregates"
    - "Check constraint for 0.5 increment validation: (rating * 2)::int = (rating * 2)"

key-files:
  created:
    - supabase/migrations/20260216000000_phase4_units_social.sql
  modified: []

key-decisions:
  - "Use security definer for get_recipe_comments to avoid recursive RLS performance issues on recipes table"
  - "Minimum rating is 0.5 (not 0) — a rating of 0 is meaningless in user experience"
  - "Comment moderation allows comment author, recipe owner, and family admin to delete"
  - "Rating visibility inherits recipe visibility at query time (family ratings become public if recipe visibility changes)"
  - "Denormalize rating aggregates on recipes table with trigger updates for performance"

patterns-established:
  - "RLS policies on child tables (comments, ratings) inherit parent table (recipes) access via EXISTS subquery"
  - "Recursive CTE returns depth and path for proper threaded ordering"
  - "Trigger functions handle both INSERT/UPDATE (NEW) and DELETE (OLD) for aggregate maintenance"

requirements-completed: [UNIT-01, UNIT-02, SOC-01, SOC-02]

# Metrics
duration: 2min
completed: 2026-02-16
---

# Phase 04 Plan 01: Database Schema for Units and Social Features

**PostgreSQL migration establishing recipe_comments with threading, recipe_ratings with half-star support, unit preferences, denormalized rating aggregates, RLS policies, recursive CTE function, and rating trigger**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-16T23:43:31Z
- **Completed:** 2026-02-16T23:45:42Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Created recipe_comments table with self-referencing parent_comment_id for unlimited threading depth
- Created recipe_ratings table with composite primary key and check constraint enforcing 0.5 increments (0.5-5.0 range)
- Extended profiles table with unit_preference column (metric/imperial, defaults to imperial)
- Extended recipes table with rating_average (numeric 2,1) and rating_count (int) for denormalized aggregates
- Implemented get_recipe_comments security definer function using recursive CTE to avoid RLS performance issues
- Implemented update_recipe_rating trigger to automatically maintain rating aggregates on insert/update/delete
- Established RLS policies for comments and ratings that inherit recipe visibility patterns from Phase 1

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Phase 4 database migration** - `b7fe780` (feat)

## Files Created/Modified
- `supabase/migrations/20260216000000_phase4_units_social.sql` - Complete Phase 4 schema with tables, indexes, RLS policies, functions, and triggers

## Decisions Made

**1. Security definer for get_recipe_comments**
- Rationale: Avoids recursive RLS performance issues where comment RLS policies would re-check recipe RLS for every row. Function validates access once at entry, then fetches without re-checking.

**2. Minimum rating 0.5 instead of 0**
- Rationale: A rating of 0 stars is meaningless in user experience. Requiring minimum 0.5 forces intentional ratings while supporting half-star granularity.

**3. Denormalized rating aggregates**
- Rationale: rating_average and rating_count on recipes table eliminates expensive joins for list views. Trigger maintains consistency automatically.

**4. Comment moderation rules**
- Rationale: Comment author can delete their own; recipe owner and family admin can both moderate (delete any comment). Aligns with privacy model and family admin role established in Phase 1.

**5. Path-based ordering in recursive CTE**
- Rationale: Concatenating UUIDs into path (e.g., "parent-uuid/child-uuid") enables ORDER BY path for natural threaded display without client-side sorting.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Database schema is complete. All subsequent Phase 4 plans (API endpoints, UI components, unit conversion utilities) can build on these tables, functions, and policies.

**Ready for:**
- Plan 02: Unit conversion utilities and ingredient parsing
- Plan 03: Comments API and UI
- Plan 04: Ratings API and UI
- Plan 05: Unit preference settings

**Notes:**
- Migration applied successfully to local database
- All verification checks passed (tables, columns, indexes, functions, triggers, RLS policies)
- TypeScript compilation had pre-existing tsconfig.json issue unrelated to migration
- Migration is idempotent (uses if not exists, drop/create patterns)

## Self-Check: PASSED

All claims verified:
- FOUND: supabase/migrations/20260216000000_phase4_units_social.sql
- FOUND: b7fe780 (commit exists in git history)
- Verified: Commit contains 309 line migration file

---
*Phase: 04-trust-collaboration-units-social*
*Completed: 2026-02-16*
