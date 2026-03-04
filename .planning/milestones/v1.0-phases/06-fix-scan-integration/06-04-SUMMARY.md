---
phase: 06-fix-scan-integration
plan: 04
subsystem: database, api
tags: [supabase, scan, retry, subscription-tier, check-constraint, rls]

# Dependency graph
requires:
  - phase: 03-scan-to-draft
    provides: scan_jobs table, enhanced_job_status_system migration (subscription_tier on scan_jobs)
  - phase: 06-fix-scan-integration (plans 01-02)
    provides: service-layer and UI fixes for scan integration
provides:
  - Working retry flow for failed scan jobs
  - Correct subscription_tier reads from scan_jobs (no broken profiles join)
  - scan_jobs CHECK constraint accepting retrying and cancelled statuses
affects: [scan, retry, job-status]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Read subscription_tier directly from scan_jobs, not via profiles join"
    - "scan_jobs status CHECK includes retrying and cancelled"

key-files:
  created:
    - supabase/migrations/20260302000000_fix_scan_jobs_status_constraint.sql
  modified:
    - src/lib/scan/retry-recovery-service.ts
    - src/lib/scan/job-status-service.ts

key-decisions:
  - "No new patterns -- straightforward bug fix removing incorrect joins"

patterns-established:
  - "subscription_tier lives on scan_jobs, never join profiles for it"

requirements-completed: [SCAN-04]

# Metrics
duration: 2min
completed: 2026-03-02
---

# Phase 6 Plan 04: Fix Retry Failure Summary

**Fixed retry flow by removing broken profiles!inner joins and widening scan_jobs status CHECK to accept retrying/cancelled**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-03T00:30:36Z
- **Completed:** 2026-03-03T00:32:38Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Created migration to widen scan_jobs status CHECK constraint to include 'retrying' and 'cancelled'
- Removed 4 broken `profiles!inner` joins across RetryRecoveryService and JobStatusService
- Fixed 3 `job.profiles.subscription_tier` / `job.profiles?.subscription_tier` references to `job.subscription_tier`
- All 89 existing tests pass

## Task Commits

Each task was committed atomically:

1. **Task 1: Create migration to fix scan_jobs status CHECK constraint** - `923119d` (fix)
2. **Task 2: Fix broken profiles joins in retry-recovery-service.ts and job-status-service.ts** - `acdc013` (fix)

## Files Created/Modified
- `supabase/migrations/20260302000000_fix_scan_jobs_status_constraint.sql` - Widens scan_jobs status CHECK to include retrying, cancelled
- `src/lib/scan/retry-recovery-service.ts` - Removed profiles!inner joins in retryJob and getRecoveryActions; reads job.subscription_tier directly
- `src/lib/scan/job-status-service.ts` - Removed profiles!inner joins in getEnhancedJobStatus and getUserJobsEnhanced; reads job.subscription_tier directly

## Decisions Made
None - followed plan as specified. All changes were straightforward bug fixes.

## Deviations from Plan
None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Retry flow is ready to work once the migration is applied to remote Supabase
- All scan service-layer bugs from UAT are now fixed (plans 01-04)
- Deployment reminder: apply migration `20260302000000_fix_scan_jobs_status_constraint.sql` to remote Supabase

---
*Phase: 06-fix-scan-integration*
*Completed: 2026-03-02*
