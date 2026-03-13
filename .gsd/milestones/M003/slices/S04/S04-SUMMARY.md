---
id: S04
parent: M003
milestone: M003
provides:
  - Zero debug console.log/error/warn in client-side code
  - Only ~15 intentional console calls remain in 5 documented files (ErrorBoundary, auth callback, ads consent, ad banner, layout consent)
  - Dead retry/cancel/status service chain removed (3 files deleted)
  - Unused scan-service.ts exports removed (getJobStatus, cancelScanJob, retryScanJob, JobStatus)
requires:
  - slice: S01
    provides: Consolidated src/features/scan/ directory — reduced surface area to audit
affects:
  - S05
key_files:
  - src/features/scan/scan-service.ts
  - src/features/scan/scan-photos.ts
  - src/features/scan/DraftListView.tsx
  - src/lib/scan/scan-draft-service.ts
  - src/features/family/api.ts
key_decisions:
  - Service errors propagate via throw — console.error before rethrow is redundant
  - Component errors display via UI state — console.error before setError is redundant
  - Console.log policy codified — keep edge functions, clean client code
patterns_established:
  - Service methods throw errors without pre-logging; callers handle display
  - Component catch blocks set error state for UI display without console.error
observability_surfaces:
  - none — purely subtractive slice; intentional diagnostic surfaces (ErrorBoundary, auth callback, ads consent) preserved
drill_down_paths:
  - .gsd/milestones/M003/slices/S04/tasks/T01-SUMMARY.md
  - .gsd/milestones/M003/slices/S04/tasks/T02-SUMMARY.md
duration: ~20m
verification_result: passed
completed_at: 2026-03-12
---

# S04: Logging & Dead Code Sweep

**Removed ~86 debug console.* calls across 19 files and deleted 3 dead service files, leaving client code clean with only ~15 intentional console calls in 5 documented files.**

## What Happened

**T01 — Console cleanup:** Systematically inventoried and removed all debug console.* calls from `src/` and `app/`. Removed 21 console.log traces (scan progress, draft creation, family creation), ~45 redundant console.error calls (service methods that log-then-throw, components that log-then-set-error-state), and ~20 debug console.warn calls (photo loading failures, scan triggers, upload quality warnings). Preserved ~15 intentional calls across ErrorBoundary (crash reporting), auth callback (redirect diagnostics), ads consent/banner (operational observability), and layout consent error.

**T02 — Dead service chain removal:** Verified zero consumers of `retryScanJob`, `cancelScanJob`, `getJobStatus`, and `JobStatus` across the codebase. Removed all four exports from `scan-service.ts`, deleted the `RetryRecoveryService` import, and deleted three dead service files (`retry-recovery-service.ts`, `error-classification-service.ts`, `job-status-service.ts`). Removed 3 dead-code tests from `scan-service.test.ts`. Confirmed `multi-recipe-parser.ts` preserved per DECISIONS.md.

## Verification

- `rg 'console\.log' src/ app/ --glob '!**/__tests__/**' -c` → exit code 1 (zero matches) ✅
- `rg 'console\.(warn|error)' src/ app/ --glob '!**/__tests__/**' -l` → exactly 5 files ✅
- `test ! -f src/lib/scan/retry-recovery-service.ts` ✅
- `test ! -f src/lib/scan/error-classification-service.ts` ✅
- `test ! -f src/lib/scan/job-status-service.ts` ✅
- `rg 'retryScanJob|cancelScanJob|getJobStatus' src/features/scan/scan-service.ts` → 0 matches ✅
- `npx tsc --noEmit` → exits 0 ✅
- `npx jest --ci` → 499 tests passed, 22 suites ✅ (down from 502 — 3 dead-code tests removed)

## Requirements Advanced

- QA-06 — All debug console.log/warn/error removed from client-side code. Only ~15 intentional calls remain in 5 documented files.
- QA-07 — Dead service chain (retry-recovery, error-classification, job-status) removed. Total dead files removed across M003: 16 (13 in S01 + 3 in S04).
- QA-09 — Partially advanced: redundant console.error calls removed from service/component catch blocks, but error display to users preserved. Full error handling audit remains for S05.

## Requirements Validated

- QA-06 — Zero debug console.* in client code verified by `rg` audit. Only intentional calls remain in ErrorBoundary, auth callback, ads consent, ad banner, and layout consent. Edge functions untouched per policy.
- QA-07 — All confirmed dead files now removed (13 in S01 + 3 in S04). Systematic sweep complete; no additional dead files discovered.

## New Requirements Surfaced

- none

## Requirements Invalidated or Re-scoped

- none

## Deviations

T02 plan referenced `src/lib/scan/scan-service.ts` but the actual exports were in `src/features/scan/scan-service.ts`. This was a minor path inaccuracy in the plan; research findings were correct about the dead chain.

## Known Limitations

- Edge functions (`supabase/functions/`) retain their console logging — intentional per policy since server-side logs are the primary diagnostic surface.
- `multi-recipe-parser.ts` is kept despite having no runtime consumers — it's the testable source-of-truth for the inlined edge function logic per DECISIONS.md.

## Follow-ups

- none — S05 (Full App Audit) picks up remaining QA-08, QA-09, QA-10 work.

## Files Created/Modified

- 19 client-side files with console.* calls removed (T01 — see T01-SUMMARY for full list)
- `src/features/scan/scan-service.ts` — removed 4 unused exports and RetryRecoveryService import (T02)
- `src/features/scan/__tests__/scan-service.test.ts` — removed 3 dead-code tests (T02)
- `src/lib/scan/retry-recovery-service.ts` — deleted (T02)
- `src/lib/scan/error-classification-service.ts` — deleted (T02)
- `src/lib/scan/job-status-service.ts` — deleted (T02)

## Forward Intelligence

### What the next slice should know
- Client code is now clean of debug logging. Any new console.* found during S05 audit would be a regression or something missed (unlikely given exhaustive `rg` verification).
- Test count is 499 (down from 502) — the 3 removed tests covered dead code that was deleted.
- The 5 files with intentional console calls are documented and should not be flagged during S05 audit.

### What's fragile
- Nothing introduced — this was a purely subtractive slice.

### Authoritative diagnostics
- `rg 'console\.' src/ app/ --glob '!**/__tests__/**'` — shows all remaining console usage; should return only the ~15 intentional calls in 5 known files.
- `npx tsc --noEmit` — catches any broken references from dead code removal.

### What assumptions changed
- Test count assumed 502+ in the plan — actual is 499 after removing 3 tests for deleted dead code. This is expected, not a regression.
