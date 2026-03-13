# S04: Logging & Dead Code Sweep — UAT

**Milestone:** M003
**Written:** 2026-03-12

## UAT Type

- UAT mode: artifact-driven
- Why this mode is sufficient: This is a purely subtractive cleanup slice with no new runtime behavior. All verification is confirmable via static analysis (`rg` pattern search), TypeScript compilation, and test execution. No UI changes, no API changes, no new features to exercise at runtime.

## Preconditions

- Repository checked out on `gsd/M003/S04` branch
- Node modules installed (`npm install`)
- No dev server needed — all checks are static

## Smoke Test

`rg 'console\.log' src/ app/ --glob '!**/__tests__/**' --glob '!**/test/**' -c` exits with code 1 (zero matches). This confirms the primary deliverable: zero debug console.log in client code.

## Test Cases

### 1. Zero console.log in client code

1. Run: `rg 'console\.log' src/ app/ --glob '!**/__tests__/**' --glob '!**/test/**' -c`
2. **Expected:** Exit code 1 (no matches found)

### 2. Console.warn/error only in intentional files

1. Run: `rg 'console\.(warn|error)' src/ app/ --glob '!**/__tests__/**' --glob '!**/test/**' -l`
2. **Expected:** Exactly 5 files listed:
   - `src/components/ErrorBoundary.tsx`
   - `app/auth/callback.tsx`
   - `src/features/ads/consent.ts`
   - `src/features/ads/AdBanner.tsx`
   - `app/_layout.tsx`

### 3. Dead service files deleted

1. Run: `test ! -f src/lib/scan/retry-recovery-service.ts && echo PASS`
2. Run: `test ! -f src/lib/scan/error-classification-service.ts && echo PASS`
3. Run: `test ! -f src/lib/scan/job-status-service.ts && echo PASS`
4. **Expected:** All three print PASS

### 4. Unused exports removed from scan-service.ts

1. Run: `rg 'retryScanJob|cancelScanJob|getJobStatus' src/features/scan/scan-service.ts`
2. **Expected:** Zero matches (exit code 1)

### 5. multi-recipe-parser.ts preserved

1. Run: `test -f src/lib/scan/multi-recipe-parser.ts && echo PASS`
2. **Expected:** PASS (kept per DECISIONS.md)

### 6. TypeScript compilation clean

1. Run: `npx tsc --noEmit`
2. **Expected:** Exit code 0, zero errors

### 7. Test suite passes

1. Run: `npx jest --ci`
2. **Expected:** 499 tests pass, 22 suites, zero failures

## Edge Cases

### Console calls inside test files are acceptable

1. Run: `rg 'console\.' src/ app/ --glob '**/__tests__/**' -c`
2. **Expected:** May return matches — test files are excluded from the cleanup scope

### Edge functions untouched

1. Run: `rg 'console\.' supabase/functions/ -c`
2. **Expected:** May return matches — edge functions retain server-side logging per policy

## Failure Signals

- `rg 'console\.log'` finds matches in `src/` or `app/` (excluding tests) — missed cleanup
- `npx tsc --noEmit` fails — broken import from deleted file
- `npx jest --ci` fails or test count drops below 499 — regression from code removal
- Any of the 3 dead service files still exist — incomplete deletion

## Requirements Proved By This UAT

- QA-06 — Zero debug console.* in client code. Verified by `rg` audit showing zero console.log and console.warn/error only in 5 intentional files.
- QA-07 — Dead code removal complete. S01 removed 13 files, S04 removed 3 more (retry-recovery-service, error-classification-service, job-status-service). Systematic sweep found no additional dead files.

## Not Proven By This UAT

- QA-08 — Button/interaction audit (S05 scope)
- QA-09 — Full error handling audit (S05 scope; S04 removed redundant console.error but did not audit error UX)
- QA-10 — Cross-platform verification (S05 scope)
- Runtime behavior — this UAT only proves static/compilation correctness, not that the app runs correctly without the removed logging

## Notes for Tester

- Test count is 499 (down from 502). The 3 removed tests covered `retryScanJob` which was dead code — this is expected, not a regression.
- The `multi-recipe-parser.ts` file appears to have no runtime consumers but is intentionally kept as the testable source-of-truth for inlined edge function logic (see DECISIONS.md).
- All verification is runnable without a dev server or browser.
