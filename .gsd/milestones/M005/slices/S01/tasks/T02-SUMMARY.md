---
id: T02
parent: S01
milestone: M005
provides:
  - Fixed scan job retry logic with correct post-increment boundary check
  - Error messages preserved through retry cycle (never overwritten with "Retrying...")
  - Single atomic DB update per retry decision (no two-step failed→queued race)
  - Extracted computeRetryDecision() pure helper for testable retry logic
key_files:
  - supabase/functions/process-scan-job/index.ts
  - src/lib/scan/retry-logic.ts
  - src/lib/scan/__tests__/retry-logic.test.ts
key_decisions:
  - Use newRetryCount (post-increment) for comparison, not the stale job.retry_count
  - Single update per path (retry or permanent failure) instead of two sequential updates
  - Extract retry decision into a pure testable function in src/lib/scan/ so Jest can cover it
patterns_established:
  - computeRetryDecision(retryCount, maxRetries, errorMessage) for retry boundary logic
  - Always preserve original error_message when re-queuing — never overwrite with status text
observability_surfaces:
  - Edge function logs retry count and final status per job (console.log on re-queue, console.error on permanent failure)
  - scan_jobs table shows correct retry_count and preserved error_message
  - Response body includes retryCount and willRetry fields for downstream inspection
duration: 15m
verification_result: passed
completed_at: 2026-03-14
blocker_discovered: false
---

# T02: Fix scan retry logic and preserve error messages

**Fixed off-by-one in scan job retry comparison and eliminated error message overwrite during re-queue, replacing two-step DB update with single atomic update per retry path.**

## What Happened

The `process-scan-job` edge function had three bugs in its error handling:

1. **Off-by-one**: The code incremented `retry_count` in the first DB update but then compared the *old* `job.retry_count` against `max_retries`. With `max_retries=3` and `retry_count=2`, the DB would be set to 3 but the comparison `2 < 3` was still true, causing an extra retry beyond the limit.

2. **Error message overwritten**: A second DB update changed `error_message` to `"Retrying..."`, destroying the original error that caused the failure. This made scan_jobs rows useless for diagnosing why a job failed.

3. **Two-step update race**: The failed→queued transition used two separate DB updates (first set failed, then set queued), creating a window where another worker could pick up the job in the wrong state.

**Fix**: Compute `newRetryCount = job.retry_count + 1` once, compare that against `max_retries`, then issue a single update per path — either re-queue with the original error message preserved, or mark as permanently failed. The response body now includes `retryCount` and `willRetry` for downstream inspection.

Additionally extracted the pure retry decision logic into `src/lib/scan/retry-logic.ts` with `computeRetryDecision()` so the boundary logic can be unit-tested by Jest (the edge function itself runs on Deno and isn't covered by the project's Jest config).

## Verification

- `npx tsc --noEmit` exits 0 ✅
- `npx jest` — 571 tests pass, 25 suites ✅ (12 new retry-logic tests)
- New test: retry logic respects max_retries boundary ✅ (covers off-by-one, max=0, max=1, full sequence simulation)
- New test: error message preserved through retry cycle ✅ (never replaced with "Retrying...")
- Grep confirms no `"Retrying..."` string in process-scan-job/index.ts ✅
- Code review: single atomic update per retry decision path ✅

## Diagnostics

- **scan_jobs table**: `retry_count` reflects actual attempt count; `error_message` contains the original failure reason
- **Edge function logs**: `Re-queuing job <id> for retry (attempt N/M): <error>` on retry; `Job <id> failed permanently after N attempt(s): <error>` on final failure
- **Response body**: `{ retryCount, willRetry }` fields for programmatic inspection

## Deviations

- Extracted `computeRetryDecision()` into `src/lib/scan/retry-logic.ts` — not in the original plan but necessary to make the retry boundary testable with Jest since the edge function runs on Deno

## Known Issues

- `process-scan-queue/index.ts` has its own separate retry logic that was already correct (`newRetryCount <= max_retries`). The two functions use slightly different comparison operators (`<` vs `<=`) but both are now correct for their semantics — `process-scan-job` uses `<` with post-increment, `process-scan-queue` uses `<=` with post-increment. They should be unified in a future cleanup pass.

## Files Created/Modified

- `supabase/functions/process-scan-job/index.ts` — Fixed retry logic: single atomic update, post-increment comparison, error message preserved
- `src/lib/scan/retry-logic.ts` — New pure helper: `computeRetryDecision()` for testable retry boundary logic
- `src/lib/scan/__tests__/retry-logic.test.ts` — 12 tests covering off-by-one prevention, error preservation, and full retry sequence simulation
