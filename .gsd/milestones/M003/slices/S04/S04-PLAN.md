# S04: Logging & Dead Code Sweep

**Goal:** Client-side code free of debug console.* calls, remaining dead code removed, TypeScript and tests still clean.
**Demo:** `rg 'console\.(log|warn|error)' src/ app/ --no-filename` returns only the ~15 intentional calls documented in research. `npx tsc --noEmit` and `npx jest --ci` pass. Dead service chain (`retry-recovery-service.ts`, `error-classification-service.ts`, `job-status-service.ts`) and unused `scan-service.ts` exports are gone.

## Must-Haves

- All ~21 debug `console.log` calls removed from client-side code
- All redundant `console.error` calls removed (service methods that throw after logging, components that set error state after logging)
- All debug-leftover `console.warn` calls removed
- Intentional console calls preserved: ErrorBoundary, auth callback, ads consent, ad banner, layout consent
- Unused `scan-service.ts` exports removed: `getJobStatus`, `cancelScanJob`, `retryScanJob`, `JobStatus`
- Dead service chain deleted: `retry-recovery-service.ts`, `error-classification-service.ts`, `job-status-service.ts`
- `multi-recipe-parser.ts` kept (testable source-of-truth per DECISIONS.md)
- `npx tsc --noEmit` exits 0
- `npx jest --ci` passes (502+ tests)
- Edge functions (`supabase/functions/`) untouched

## Proof Level

- This slice proves: contract
- Real runtime required: no
- Human/UAT required: no

## Verification

- `npx tsc --noEmit` exits 0 — all imports resolve after dead code removal
- `npx jest --ci` — 502+ tests pass, no regressions
- `rg 'console\.log' src/ app/ --glob '!**/__tests__/**' --glob '!**/test/**' -c` returns 0 matches (zero debug console.log in client code)
- `rg 'console\.(warn|error)' src/ app/ --glob '!**/__tests__/**' --glob '!**/test/**' -l` returns only the intentional files: `ErrorBoundary.tsx`, `callback.tsx`, `consent.ts`, `AdBanner.tsx`, `_layout.tsx`
- `test ! -f src/lib/scan/retry-recovery-service.ts` — dead file removed
- `test ! -f src/lib/scan/error-classification-service.ts` — dead file removed
- `test ! -f src/lib/scan/job-status-service.ts` — dead file removed
- `rg 'retryScanJob|cancelScanJob|getJobStatus' src/lib/scan/scan-service.ts` returns 0 matches — unused exports removed

## Observability / Diagnostics

- Runtime signals: none — this is a cleanup slice with no new runtime behavior
- Inspection surfaces: `rg 'console\.'` across `src/` and `app/` is the primary diagnostic for verifying cleanup completeness
- Failure visibility: `npx tsc --noEmit` immediately surfaces any broken imports from dead code removal
- Redaction constraints: none

## Integration Closure

- Upstream surfaces consumed: consolidated `src/features/scan/` from S01, confirmed dead file list from S01 summary
- New wiring introduced in this slice: none — purely subtractive (removing code)
- What remains before the milestone is truly usable end-to-end: S05 full app audit and cross-platform verification

## Tasks

- [x] **T01: Remove debug console.* calls from client-side code** `est:30m`
  - Why: QA-06 requires zero debug console.* in client code. 100 calls across 24 files need individual triage — remove ~85, keep ~15 intentional.
  - Files: ~24 files across `src/` and `app/` containing console.* calls (see research inventory for full list)
  - Do: Remove all `console.log` debug traces. Remove redundant `console.error` in service methods that throw after logging and in components that set error state after logging. Remove debug-leftover `console.warn` calls. Preserve intentional calls in ErrorBoundary, auth callback, ads consent, ad banner, and layout consent. Check each component catch block individually — if the error message shown to the user is generic, the console.error may need to stay as the only diagnostic (per research open risk).
  - Verify: `rg 'console\.log' src/ app/ --glob '!**/__tests__/**' -c` returns 0. `rg 'console\.(warn|error)' src/ app/ --glob '!**/__tests__/**' -l` returns only the 5 intentional files. `npx tsc --noEmit` exits 0. `npx jest --ci` passes.
  - Done when: zero debug console.* in client code, only intentional calls remain, tsc and tests pass

- [x] **T02: Remove dead service chain and unused scan-service exports** `est:20m`
  - Why: QA-07 continuation — S01 removed 13 dead files but the retry/cancel/status service chain was not yet confirmed dead. Research confirmed these are dead: their only consumer path leads to unused `retryScanJob` export.
  - Files: `src/lib/scan/scan-service.ts`, `src/lib/scan/retry-recovery-service.ts`, `src/lib/scan/error-classification-service.ts`, `src/lib/scan/job-status-service.ts`
  - Do: Remove unused exports from `scan-service.ts` (`getJobStatus`, `cancelScanJob`, `retryScanJob`, `JobStatus` type). Remove the now-unused `RetryRecoveryService` import. Verify `error-classification-service.ts` and `job-status-service.ts` have zero remaining consumers via `rg`, then delete all three service files. Verify `multi-recipe-parser.ts` still has test importers and is kept. Check if any test files exist for the deleted services — if so, remove those too.
  - Verify: `test ! -f src/lib/scan/retry-recovery-service.ts`. `test ! -f src/lib/scan/error-classification-service.ts`. `test ! -f src/lib/scan/job-status-service.ts`. `rg 'retryScanJob|cancelScanJob|getJobStatus' src/lib/scan/scan-service.ts` returns 0. `npx tsc --noEmit` exits 0. `npx jest --ci` passes (502+ or slightly fewer if dead code had tests).
  - Done when: dead service files deleted, unused exports removed, tsc and tests pass

## Files Likely Touched

- ~24 client-side files with console.* calls (T01)
- `src/lib/scan/scan-service.ts` (T02)
- `src/lib/scan/retry-recovery-service.ts` (T02 — deleted)
- `src/lib/scan/error-classification-service.ts` (T02 — deleted)
- `src/lib/scan/job-status-service.ts` (T02 — deleted)
