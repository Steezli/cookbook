---
id: T02
parent: S04
milestone: M003
provides:
  - Dead retry/cancel/status service chain fully removed
  - scan-service.ts exports only live code
key_files:
  - src/features/scan/scan-service.ts
  - src/features/scan/__tests__/scan-service.test.ts
key_decisions:
  - Removed 3 retryScanJob tests from scan-service.test.ts since they tested dead code (test count 502→499)
patterns_established:
  - none
observability_surfaces:
  - none — purely subtractive
duration: ~5 minutes
verification_result: passed
completed_at: 2026-03-12
blocker_discovered: false
---

# T02: Remove dead service chain and unused scan-service exports

**Deleted 3 dead service files and 4 unused exports from scan-service.ts, removing the entire retry/cancel/status chain.**

## What Happened

Verified zero consumers of `retryScanJob`, `cancelScanJob`, `getJobStatus`, and `JobStatus` across `src/` and `app/`. The only references outside the definition file were in `scan-service.test.ts` (testing `retryScanJob`) and local variable names in `DraftReview.tsx` (unrelated `jobStatus` state variable, not the type).

Removed from `src/features/scan/scan-service.ts`:
- `JobStatus` type export
- `getJobStatus()` function
- `cancelScanJob()` function
- `retryScanJob()` function
- `RetryRecoveryService` import

Removed from `src/features/scan/__tests__/scan-service.test.ts`:
- `RetryRecoveryService` mock setup
- `retryScanJob` import
- 3 test cases in `describe('retryScanJob')` block

Deleted 3 dead service files from `src/lib/scan/`:
- `retry-recovery-service.ts` — only consumer was the removed `retryScanJob`
- `error-classification-service.ts` — only consumer was `retry-recovery-service.ts`
- `job-status-service.ts` — only consumers were the two files above

Confirmed `multi-recipe-parser.ts` preserved per DECISIONS.md.

## Verification

- `test ! -f src/lib/scan/retry-recovery-service.ts` — PASS (deleted)
- `test ! -f src/lib/scan/error-classification-service.ts` — PASS (deleted)
- `test ! -f src/lib/scan/job-status-service.ts` — PASS (deleted)
- `test -f src/lib/scan/multi-recipe-parser.ts` — PASS (preserved)
- `rg 'retryScanJob|cancelScanJob|getJobStatus' src/features/scan/scan-service.ts` — 0 matches (PASS)
- `npx tsc --noEmit` — exits 0 (PASS)
- `npx jest --ci` — 22 suites, 499 tests passed (PASS, down from 502 due to 3 removed dead-code tests)
- Slice-level: zero `console.log` in client code, only 5 intentional `console.warn/error` files — PASS

## Diagnostics

None — purely subtractive change. `rg` for any removed symbol confirms absence. `npx tsc --noEmit` catches broken references.

## Deviations

Task plan referenced `src/lib/scan/scan-service.ts` but the exports were actually in `src/features/scan/scan-service.ts`. Research findings were correct about the dead chain; the path was a minor inaccuracy in the plan.

## Known Issues

None.

## Files Created/Modified

- `src/features/scan/scan-service.ts` — removed `JobStatus` type, `getJobStatus`, `cancelScanJob`, `retryScanJob` exports and `RetryRecoveryService` import
- `src/features/scan/__tests__/scan-service.test.ts` — removed `retryScanJob` tests and `RetryRecoveryService` mock
- `src/lib/scan/retry-recovery-service.ts` — deleted
- `src/lib/scan/error-classification-service.ts` — deleted
- `src/lib/scan/job-status-service.ts` — deleted
