---
id: T01
parent: S04
milestone: M003
provides:
  - Zero debug console.log/error/warn calls in client-side code
  - Only ~15 intentional console calls remain in 5 documented files
key_files:
  - src/features/scan/scan-photos.ts
  - src/features/scan/DraftListView.tsx
  - src/features/scan/scan-service.ts
  - src/lib/scan/scan-draft-service.ts
  - src/features/family/api.ts
key_decisions:
  - Removed console.error from all service methods that log-then-throw (error propagates to caller)
  - Removed console.error from components that log-then-set-error-state (error displayed in UI)
  - Replaced empty catch blocks with descriptive comments for clarity
patterns_established:
  - Service errors propagate via throw, not logged before rethrow
  - Component errors display via UI state, not console
observability_surfaces:
  - none — subtractive task, intentional surfaces (ErrorBoundary, auth callback, ads) preserved
duration: 15m
verification_result: passed
completed_at: 2026-03-12
blocker_discovered: false
---

# T01: Remove debug console.* calls from client-side code

**Removed ~86 debug console.log/error/warn calls across 19 client-side files; preserved ~15 intentional calls in 5 documented files.**

## What Happened

Systematically inventoried and removed all debug console.* calls from `src/` and `app/`:

1. **console.log (21 calls removed):** All were pure debug traces — scan job progress logging, draft creation/status traces, family creation traces, subscription connection messages. Zero console.log calls remain in client code.

2. **console.error (~45 calls removed):** Two redundant patterns eliminated:
   - **Service methods (scan-draft-service, retry-recovery-service, job-status-service, error-classification-service):** Every method logged the error then immediately re-threw it. The error propagates to the caller, making the log redundant.
   - **Component catch blocks (DraftManager, DraftEditor, DraftReview, DraftListView, RecentScans, profile, public browse, draft/[id]):** Each logged the error then set error state displayed in UI. The UI error message includes the actual error detail (via `err.message`), making the console.error redundant.

3. **console.warn (~20 calls removed):** Debug leftovers — photo loading failures, scan processing triggers, upload quality warnings, screen load errors, profile ensure failures. All were non-fatal situations where the UI handles the failure gracefully (empty state, stale data, returned error object).

4. **Preserved (~15 intentional calls):**
   - `ErrorBoundary.tsx` — 1 console.error (intentional crash reporter, JSDoc documented)
   - `app/auth/callback.tsx` — 2 console.error (only diagnostic on redirect page)
   - `src/features/ads/consent.ts` — 6 console.warn (documented `[AdsConsent]` operational observability)
   - `src/features/ads/AdBanner.tsx` — 2 console.warn (ad load failure diagnostics)
   - `app/_layout.tsx` — 1 console.warn (consent sequence error)

## Verification

- `rg 'console\.log' src/ app/ --glob '!**/__tests__/**' --glob '!**/test/**' -c` → exit code 1 (zero matches) ✅
- `rg 'console\.(warn|error)' src/ app/ --glob '!**/__tests__/**' --glob '!**/test/**' -l` → exactly 5 files: `ErrorBoundary.tsx`, `callback.tsx`, `consent.ts`, `AdBanner.tsx`, `_layout.tsx` ✅
- `npx tsc --noEmit` → exits 0, zero errors ✅
- `npx jest --ci` → 502 tests passed, 22 suites ✅

**Slice-level checks (T01 scope):**
- Zero console.log in client code ✅
- Only intentional console.warn/error in 5 files ✅
- tsc and jest pass ✅
- Dead file deletion and unused export removal → T02 (not yet run)

## Diagnostics

`rg 'console\.' src/ app/ --glob '!**/__tests__/**'` to audit remaining console usage. Should return only the ~15 intentional calls in the 5 known files.

## Deviations

None. All files identified in the research inventory were cleaned. The dead service files (retry-recovery-service, error-classification-service, job-status-service) had their console calls removed even though T02 will delete the files entirely — this keeps T01's verification clean.

## Known Issues

None.

## Files Created/Modified

- `src/features/family/api.ts` — removed 2 console.log, 2 console.error (simplified createFamily to direct throw)
- `src/features/scan/DraftManager.tsx` — removed 1 console.log, 3 console.error
- `src/features/scan/scan-photos.ts` — removed 2 console.log, 2 console.error, 5 console.warn
- `src/features/scan/DraftListView.tsx` — removed 4 console.log, 5 console.error, 1 console.warn
- `src/features/scan/scan-service.ts` — removed 2 console.log, 2 console.error (subscription callbacks simplified)
- `src/lib/scan/scan-draft-service.ts` — removed 5 console.log, 12 console.error
- `src/features/scan/DraftReview.tsx` — removed 2 console.error, 2 console.warn
- `src/features/scan/DraftEditor.tsx` — removed 2 console.error
- `src/features/scan/RecentScans.tsx` — removed 1 console.error
- `src/features/scan/scan-upload.ts` — removed 1 console.error, 1 console.warn
- `app/(public)/index.tsx` — removed 1 console.error
- `app/scan/draft/[id].tsx` — removed 2 console.error
- `app/(tabs)/profile.tsx` — removed 1 console.error
- `app/(tabs)/recipes/index.tsx` — removed 2 console.warn
- `app/(tabs)/index.tsx` — removed 1 console.warn
- `src/features/auth/session.tsx` — removed 1 console.warn
- `src/lib/scan/retry-recovery-service.ts` — removed 1 console.log, 6 console.error
- `src/lib/scan/error-classification-service.ts` — removed 1 console.error
- `src/lib/scan/job-status-service.ts` — removed 3 console.log, 9 console.error
