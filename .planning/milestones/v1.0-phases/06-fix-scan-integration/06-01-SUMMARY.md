---
phase: 06-fix-scan-integration
plan: 01
subsystem: api
tags: [supabase, auth, scan, retry, typescript, jest]

# Dependency graph
requires:
  - phase: 03-scan-to-draft-photo-to-structured
    provides: scan-service.ts and scan-draft-service.ts service layer
provides:
  - Fixed auth wiring for getUserScanJobs (filters by authenticated user)
  - Fixed retry mechanism via RetryRecoveryService delegation
  - Fixed subscribeToUserJobs to accept userId parameter
  - Fixed convertToRecipe column names matching recipes table schema
  - Fixed mapScoreToStatus returning correct status for confidence scores
  - Fixed ScanDraftService to use shared Supabase client singleton
affects: [06-02-PLAN, scan-ui, scan-integration]

# Tech tracking
tech-stack:
  added: []
  patterns: [TDD red-green for service-layer bug fixes, shared Supabase client singleton pattern]

key-files:
  created:
    - src/features/scan/__tests__/scan-service.test.ts
    - src/lib/scan/__tests__/scan-draft-service.test.ts
  modified:
    - src/features/scan/scan-service.ts
    - src/lib/scan/scan-draft-service.ts
    - src/features/scan/ScanJobList.tsx
    - jest.config.js

key-decisions:
  - "Delegate retryScanJob to RetryRecoveryService instead of fixing the broken nested-RPC approach"
  - "subscribeToUserJobs accepts userId param from caller instead of async auth lookup"
  - "convertToRecipe defaults visibility to private per privacy-first principle"

patterns-established:
  - "All scan service functions use supabase.auth.getUser() for authentication"
  - "Real-time subscriptions accept userId parameter from component auth context"

requirements-completed: [SCAN-01, SCAN-03, SCAN-04]

# Metrics
duration: 4min
completed: 2026-03-02
---

# Phase 6 Plan 1: Fix Scan Service Layer Summary

**Fixed 6 service-layer bugs in scan-service.ts and scan-draft-service.ts: auth wiring, user filtering, retry delegation, column name mapping, score inversion, and Supabase client singleton**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-02T23:42:47Z
- **Completed:** 2026-03-02T23:47:24Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- getUserScanJobs now authenticates and filters by user_id (was returning all jobs)
- retryScanJob delegates to RetryRecoveryService (was nesting a Promise as an update value)
- subscribeToUserJobs accepts userId param (was calling getCurrentUserId() which returned null)
- convertToRecipe uses correct column names: owner_user_id, steps, visibility (was using user_id, instructions, status, scan_draft_id)
- mapScoreToStatus returns correct values: >= 0.8 is 'ready', < 0.5 is 'needs_enhancement' (was inverted)
- ScanDraftService uses shared supabase import instead of creating its own client

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix scan-service.ts (auth, user filter, retry)** - `51aab0e` (feat)
2. **Task 2: Fix scan-draft-service.ts (Supabase client, convertToRecipe, mapScoreToStatus)** - `ae3403e` (feat)

_Both tasks followed TDD: RED (failing tests) then GREEN (implementation fixes)_

## Files Created/Modified
- `src/features/scan/__tests__/scan-service.test.ts` - 8 unit tests for auth, filtering, retry, subscription
- `src/lib/scan/__tests__/scan-draft-service.test.ts` - 8 unit tests for score mapping, column names, client usage
- `src/features/scan/scan-service.ts` - Fixed getUserScanJobs, retryScanJob, subscribeToUserJobs; removed getCurrentUserId
- `src/lib/scan/scan-draft-service.ts` - Fixed convertToRecipe columns, mapScoreToStatus, shared Supabase client
- `src/features/scan/ScanJobList.tsx` - Updated subscribeToUserJobs call to pass session.user.id
- `jest.config.js` - Added moduleNameMapper for @/ path alias resolution

## Decisions Made
- Delegated retryScanJob to RetryRecoveryService rather than fixing the broken nested-RPC pattern -- RetryRecoveryService has backoff, jitter, error classification, and retry history already
- subscribeToUserJobs accepts userId as a parameter from the caller (component auth context) rather than doing an async auth lookup -- real-time subscriptions need synchronous filter values
- convertToRecipe defaults visibility to 'private' per the project's privacy-first principle

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added moduleNameMapper to jest.config.js**
- **Found during:** Task 1 (test creation)
- **Issue:** Jest could not resolve @/lib/supabase imports in test files -- path alias not mapped
- **Fix:** Added `moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' }` to jest.config.js
- **Files modified:** jest.config.js
- **Verification:** All tests resolve imports correctly
- **Committed in:** 51aab0e (Task 1 commit)

**2. [Rule 3 - Blocking] Updated ScanJobList.tsx caller for changed subscribeToUserJobs signature**
- **Found during:** Task 1 (after changing subscribeToUserJobs signature)
- **Issue:** ScanJobList.tsx called subscribeToUserJobs with only a callback (old 1-arg signature); new signature requires userId as first param
- **Fix:** Added useSession() import, extracted session.user.id, passed as first argument
- **Files modified:** src/features/scan/ScanJobList.tsx
- **Verification:** TypeScript compilation passes, no runtime errors
- **Committed in:** 51aab0e (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** Both auto-fixes necessary for tests to run and for the signature change to not break the only caller. No scope creep.

## Issues Encountered
- Jest 30 uses `--testPathPatterns` (plural) instead of `--testPathPattern`, and `--bail` instead of `-x` -- adapted commands accordingly

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Service-layer scan bugs are fixed; scan flow can now authenticate, filter, retry, and convert correctly
- Plan 06-02 can proceed with UI/navigation fixes (draft/[id].tsx params, DraftEditor navigation)
- All 84 project tests pass with zero regressions

## Self-Check: PASSED

- [x] src/features/scan/__tests__/scan-service.test.ts exists
- [x] src/lib/scan/__tests__/scan-draft-service.test.ts exists
- [x] .planning/phases/06-fix-scan-integration/06-01-SUMMARY.md exists
- [x] Commit 51aab0e found
- [x] Commit ae3403e found

---
*Phase: 06-fix-scan-integration*
*Completed: 2026-03-02*
