---
id: T12
parent: S12
milestone: M001
provides:
  - "DraftReview.tsx with race-condition fix using job status subscription"
  - "Processing waiting state shown while edge function completes scan job"
requires: []
affects: []
key_files: []
key_decisions: []
patterns_established: []
observability_surfaces: []
drill_down_paths: []
duration: 8min
verification_result: passed
completed_at: 2026-03-10
blocker_discovered: false
---
# T12: 12-remaining-screens 12

**# Phase 12 Plan 12: Scan Draft Race Condition Fix Summary**

## What Happened

# Phase 12 Plan 12: Scan Draft Race Condition Fix Summary

**DraftReview now waits for edge function job completion via Supabase Realtime subscription before showing 'Draft not found', eliminating the UAT Test 11 blocker**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-03-10T20:15:00Z
- **Completed:** 2026-03-10T20:23:00Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Eliminated "Draft not found" error when navigating to DraftReview immediately after scan upload
- DraftReview now subscribes to scan_jobs realtime channel and waits up to 60 seconds for job completion
- Processing UI shows "Processing your scan..." with "This usually takes 10-30 seconds" hint
- Draft auto-loads as soon as job status transitions to 'completed'
- Proper cleanup: channel unsubscribed and timeout cleared on unmount or successful load

## Task Commits

Each task was committed atomically:

1. **Task 1: Add job status subscription and processing state to DraftReview** - `cd7f91f` (fix)

## Files Created/Modified
- `src/features/scans/DraftReview.tsx` - Added subscribeToJob import, jobStatus state, subscribe-then-retry logic, processing UI

## Decisions Made
- Subscribe-then-retry pattern: attempt getDraftByJobId on mount; if null, subscribe to realtime job updates; re-query draft on job.status === 'completed' (subscription payload is a ScanJob row, not the draft — must re-query getDraftByJobId)
- 60-second safety timeout prevents infinite waiting if edge function is unresponsive
- jobStatus state ('checking' | 'processing' | 'completed') drives informative loading copy without adding boolean flags

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- UAT Test 11 is unblocked: scan upload navigates to DraftReview, shows processing state, then loads draft when ready
- UAT Tests 12 and 13 (draft review layouts — mobile collapsible photo, tablet side-by-side) are also unblocked
- Phase 12 UAT round 2 can proceed with all scan flow tests

---
*Phase: 12-remaining-screens*
*Completed: 2026-03-10*
