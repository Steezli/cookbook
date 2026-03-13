---
estimated_steps: 5
estimated_files: 4
---

# T02: Remove dead service chain and unused scan-service exports

**Slice:** S04 — Logging & Dead Code Sweep
**Milestone:** M003

## Description

Remove the dead retry/cancel/status service chain from `src/lib/scan/`. S01 removed 13 confirmed dead files but left this cluster because the consumer path was less obvious. Research confirmed the chain is dead: `retryScanJob` in `scan-service.ts` is the only entry point, it has zero consumers, and it pulls in `RetryRecoveryService` → `ErrorClassificationService` → `JobStatusService`. Remove the unused exports from `scan-service.ts` and delete the three service files. Keep `multi-recipe-parser.ts` (testable source-of-truth per DECISIONS.md).

## Steps

1. Verify zero consumers of `retryScanJob`, `cancelScanJob`, `getJobStatus`, and `JobStatus` type via `rg` across `src/` and `app/` (excluding the definition file itself). Confirm the research findings still hold.
2. Remove the unused exports and their implementations from `scan-service.ts`: `getJobStatus`, `cancelScanJob`, `retryScanJob`, and the `JobStatus` type. Remove the now-unused `RetryRecoveryService` import.
3. Verify `retry-recovery-service.ts`, `error-classification-service.ts`, and `job-status-service.ts` have zero remaining importers via `rg`. Check for any test files that test these services. Delete the service files (and any associated test files for dead code).
4. Run `npx tsc --noEmit` to verify no broken imports.
5. Run `npx jest --ci` to verify test suite passes (count may drop slightly if dead services had test files, otherwise 502+).

## Must-Haves

- [ ] Unused exports removed from `scan-service.ts`: `getJobStatus`, `cancelScanJob`, `retryScanJob`, `JobStatus`
- [ ] `retry-recovery-service.ts` deleted (zero consumers)
- [ ] `error-classification-service.ts` deleted (zero consumers after retry-recovery removal)
- [ ] `job-status-service.ts` deleted (zero consumers after chain removal)
- [ ] `multi-recipe-parser.ts` preserved (testable source-of-truth)
- [ ] `npx tsc --noEmit` exits 0
- [ ] `npx jest --ci` passes

## Verification

- `test ! -f src/lib/scan/retry-recovery-service.ts` — deleted
- `test ! -f src/lib/scan/error-classification-service.ts` — deleted
- `test ! -f src/lib/scan/job-status-service.ts` — deleted
- `test -f src/lib/scan/multi-recipe-parser.ts` — preserved
- `rg 'retryScanJob|cancelScanJob|getJobStatus' src/lib/scan/scan-service.ts` — 0 matches
- `npx tsc --noEmit` exits 0
- `npx jest --ci` passes

## Observability Impact

- Signals added/changed: None — purely subtractive
- How a future agent inspects this: `rg` for any of the removed symbols confirms they're gone. `npx tsc --noEmit` catches broken references.
- Failure state exposed: None changed

## Inputs

- S04 research: confirmed dead service chain (`retry-recovery-service.ts` → `error-classification-service.ts` → `job-status-service.ts`) with only consumer being unused `retryScanJob` export
- S01 summary: 13 dead files already removed, these 3 were left for S04
- DECISIONS.md: "Inlined pure functions" decision requires keeping `multi-recipe-parser.ts`

## Expected Output

- `src/lib/scan/scan-service.ts` — unused exports and imports removed
- `src/lib/scan/retry-recovery-service.ts` — deleted
- `src/lib/scan/error-classification-service.ts` — deleted
- `src/lib/scan/job-status-service.ts` — deleted
- TypeScript compilation and test suite clean
