# S04: Logging & Dead Code Sweep — Research

**Date:** 2026-03-12

## Summary

S04 owns **QA-06** (console.log cleanup) and supports **QA-07** (dead code removal continuation from S01) and **QA-09** (error handling audit). The scope is well-bounded: 100 console.* calls across 24 client-side files, and a small cluster of potentially dead code in `src/lib/scan/` and unused exports in `scan-service.ts`.

The console cleanup is straightforward — 21 `console.log` calls are pure debug and should be removed unconditionally. 55 `console.error` calls follow a pattern where service methods log then throw (making the log redundant), and components log then set error state (also redundant). 23 `console.warn` calls split between debug leftovers and intentional operational warnings (ads consent module). The dead code sweep found one significant cluster: `error-classification-service.ts`, `job-status-service.ts`, and `retry-recovery-service.ts` form a chain whose only consumer is the unused `retryScanJob` export in `scan-service.ts`. `multi-recipe-parser.ts` has zero non-test importers but serves as the testable source-of-truth for edge function inlined logic — it should be kept.

## Recommendation

**Two tasks:** T01 removes all console.* calls from client-side code; T02 performs the dead code sweep.

**Console cleanup approach (T01):**
- Remove all 21 `console.log` calls unconditionally — they're debug traces
- Remove `console.error` calls in service methods that throw after logging (redundant — the caller catches and handles the error)
- Remove `console.error` calls in components that set error state after logging (redundant — the error is surfaced to the user)
- **Keep** `console.error` in `ErrorBoundary.componentDidCatch` — this is the app's intentional error reporting surface, documented in its JSDoc
- **Keep** `console.error` in `app/auth/callback.tsx` — auth callback errors are not displayed to the user (the page redirects), so the log is the only diagnostic
- Remove `console.warn` calls that are debug leftovers (loading errors, connection state)
- **Keep** `console.warn` calls in `src/features/ads/consent.ts` — they are documented operational observability for the GDPR consent module (`[AdsConsent]` prefix), serve as the only diagnostic surface for UMP SDK failures, and the module's JSDoc explicitly lists them as part of its API contract
- **Keep** `console.warn` in `src/features/ads/AdBanner.tsx` — ad loading failures are non-fatal and need diagnostic visibility
- **Keep** `console.warn` in `app/_layout.tsx` for consent sequence errors — non-fatal startup failures

**Dead code approach (T02):**
- Remove unused exports from `scan-service.ts`: `getJobStatus`, `cancelScanJob`, `retryScanJob`, `JobStatus` type
- After removing `retryScanJob`, the `RetryRecoveryService` import becomes unused → remove import
- Check if `retry-recovery-service.ts` still has any consumers after the import removal → if zero, delete
- Check if `error-classification-service.ts` and `job-status-service.ts` still have any consumers after retry-recovery removal → if zero, delete
- **Keep** `multi-recipe-parser.ts` — it's the testable source-of-truth for edge function logic per DECISIONS.md ("inlined pure functions" decision)
- Verify `npx tsc --noEmit` and `npx jest --ci` pass after all changes

## Don't Hand-Roll

| Problem | Existing Solution | Why Use It |
|---------|------------------|------------|
| Finding unused imports after deletion | `npx tsc --noEmit` | TypeScript catches broken imports immediately |
| Verifying no stale references | `rg '<symbol>' src/ app/` | Fast grep confirms zero importers before deletion |
| Verifying test suite still passes | `npx jest --ci` | 502 tests across 22 suites catch regressions |

## Existing Code and Patterns

- `src/lib/scan/scan-draft-service.ts` — 17 console calls. Pattern: `console.error` → `throw new Error(...)` in every method. All console.error calls are redundant since the error is re-thrown and caught by callers that handle it (set state, show UI).
- `src/lib/scan/job-status-service.ts` — 12 console calls. Same pattern: log then throw. All redundant.
- `src/features/scan/DraftListView.tsx` — 11 console calls. Mix of `console.log` debug traces and `console.error` in catch blocks that set error state.
- `src/features/scan/scan-photos.ts` — 9 console calls. Mix of debug traces and operational warnings for upload failures.
- `src/features/ads/consent.ts` — 6 `console.warn` calls, all prefixed with `[AdsConsent]`, documented in module JSDoc as intentional observability. **Keep these.**
- `src/components/ErrorBoundary.tsx` — 1 `console.error` in `componentDidCatch`. Documented as the app's error reporting surface. **Keep this.**
- `src/features/scan/scan-service.ts` — 4 exports with zero consumers: `getJobStatus`, `cancelScanJob`, `retryScanJob`, `JobStatus`
- `src/lib/scan/retry-recovery-service.ts` → `src/lib/scan/error-classification-service.ts` → `src/lib/scan/job-status-service.ts` — chain of services whose only consumer path leads to the unused `retryScanJob` export

## Constraints

- **Edge functions excluded** — `supabase/functions/` console calls are server-side logging and explicitly out of scope per DECISIONS.md ("Console.log policy — keep edge functions, clean client")
- **ErrorBoundary.console.error is intentional** — documented in JSDoc, serves as the only error reporting surface for uncaught component errors
- **consent.ts warns are operational** — documented API contract for GDPR consent diagnostics
- **multi-recipe-parser.ts must not be deleted** — serves as source-of-truth for edge function inlined logic per DECISIONS.md, has 422-line test file
- **Test suite must remain at 502+ tests passing** — if dead code has associated test files, those tests should also be removed (they test dead code)
- **Branch is `gsd/M003/S04`** — already checked out, `tsc --noEmit` passes clean

## Common Pitfalls

- **Removing console.error from ErrorBoundary** — this is the app's intentional crash reporter. Removing it would leave unhandled errors invisible. Must be preserved.
- **Deleting multi-recipe-parser.ts** — looks dead (zero non-test importers) but is the testable canonical source for edge function logic. Deletion would lose the only way to test that parser outside the edge function environment.
- **Deleting consent.ts warns** — these are documented operational diagnostics, not debug leftovers. UMP SDK failures need visibility.
- **Breaking import chains** — removing `retry-recovery-service.ts` requires verifying that `error-classification-service.ts` and `job-status-service.ts` have no other consumers first. Deletion order matters.
- **Missing the `console.warn` in JSDoc comments** — `consent.ts` line 12 mentions `console.warn` in a JSDoc comment, not as actual code. The grep count includes this — don't try to "remove" a comment.

## Open Risks

- **Dead service cluster deletion may drop test count** — `retry-recovery-service.ts`, `error-classification-service.ts`, and `job-status-service.ts` don't appear to have dedicated test files (no matching files in `__tests__/`), so test count should be unaffected. But verify.
- **Unused scan-service exports might be planned for future retry UI** — `retryScanJob`, `cancelScanJob`, `getJobStatus` look like they were built for a retry/cancel UX that was never wired up. Removing them is safe since they can be rebuilt if needed, but worth noting.
- **Some console.error calls in component catch blocks may be the only diagnostic** — if a component sets `error` state but the error message shown to the user is generic ("Failed to load"), the console.error may be the only place the actual error details are visible. Check each one individually.

## Scope Inventory

### Console Calls — 100 total across 24 files

| Category | Count | Action |
|----------|-------|--------|
| `console.log` — pure debug traces | 21 | Remove all |
| `console.error` — service methods that throw after logging | ~30 | Remove (redundant — error propagates to caller) |
| `console.error` — components that set error state after logging | ~18 | Remove (redundant — error displayed in UI) |
| `console.error` — ErrorBoundary | 1 | **Keep** (intentional crash reporter) |
| `console.error` — auth callback | 2 | **Keep** (only diagnostic — page redirects, no error UI) |
| `console.warn` — ads consent observability | 6 | **Keep** (documented API contract) |
| `console.warn` — ad banner load failures | 2 | **Keep** (non-fatal diagnostic) |
| `console.warn` — layout consent sequence | 1 | **Keep** (non-fatal startup) |
| `console.warn` — debug leftovers | ~14 | Remove |
| `console.error` — family API debug logs | 2 | Remove (redundant) |
| `console.log` — family API debug logs | 2 | Remove |

**Net result: ~85 calls removed, ~15 intentional calls kept**

### Dead Code Candidates

| File | Status | Action |
|------|--------|--------|
| `src/lib/scan/retry-recovery-service.ts` | Only consumer is unused `retryScanJob` | Delete (after removing import) |
| `src/lib/scan/error-classification-service.ts` | Only consumers are retry-recovery + job-status | Delete if zero consumers remain |
| `src/lib/scan/job-status-service.ts` | Only consumers are retry-recovery + error-classification | Delete if zero consumers remain |
| `src/lib/scan/multi-recipe-parser.ts` | Zero non-test importers, but testable source-of-truth | **Keep** |
| `scan-service.ts` exports: `getJobStatus`, `cancelScanJob`, `retryScanJob`, `JobStatus` | Zero consumers | Remove exports |

## Skills Discovered

| Technology | Skill | Status |
|------------|-------|--------|
| Expo / React Native | `jezweb/claude-skills@react-native-expo` (744 installs) | available — not directly relevant to cleanup task |
| Dead code detection | `pproenca/dot-skills@knip-deadcode` (46 installs) | available — not needed, manual analysis is sufficient for this scope |

## Sources

- Console call inventory via `rg` across `src/` and `app/` (100 calls, 24 files, excluding tests and edge functions)
- Import analysis via `rg` for each `src/lib/scan/` service file
- DECISIONS.md "Console.log policy" and "Inlined pure functions" decisions
- ErrorBoundary.tsx JSDoc documenting intentional `console.error` usage
- consent.ts JSDoc documenting intentional `console.warn` usage
