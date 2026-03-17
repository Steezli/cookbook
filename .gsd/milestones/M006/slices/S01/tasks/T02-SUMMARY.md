---
id: T02
parent: S01
milestone: M006
provides:
  - src/features/scan/errors.ts — ScanLimitError class with currentCount property
  - src/features/subscriptions/scan-count.ts — getScanCount and incrementScanCount client wrappers
key_files:
  - src/features/scan/errors.ts
  - src/features/subscriptions/scan-count.ts
  - src/features/subscriptions/__tests__/scan-count.test.ts
key_decisions:
  - Used (supabase.from as Function) cast for user_scan_counts table (not yet in generated types)
  - Fixed mockEq chain in test to return { eq: mockEq, maybeSingle } to support two .eq() calls
patterns_established:
  - (supabase.from as Function) cast pattern for tables not yet in Supabase generated types
  - mockEq.mockReturnValue({ eq: mockEq, maybeSingle }) for chained .eq() mocks
observability_surfaces:
  - ScanLimitError.currentCount — exact count at limit-reached time, inspectable at catch sites
  - instanceof ScanLimitError check distinguishes limit-reached from other errors
duration: ~15min
verification_result: passed
completed_at: 2026-03-17
blocker_discovered: false
---

# T02: Implement ScanLimitError and scan-count client wrappers

**Created `ScanLimitError` typed class and `getScanCount`/`incrementScanCount` wrappers; all 5 scan-count tests pass and full suite (617 tests) is green.**

## What Happened

Created `src/features/scan/errors.ts` with `ScanLimitError extends Error`, `name = 'ScanLimitError'`, and `currentCount: number` property. Created `src/features/subscriptions/scan-count.ts` with `getScanCount` (queries `user_scan_counts` for current month via `maybeSingle`, returns 0 on null) and `incrementScanCount` (calls `increment_scan_count` RPC, throws `ScanLimitError` when `data > 3`).

One deviation: the test mock's `mockEq` only returned `{ maybeSingle }` but the implementation calls two `.eq()` chains. Fixed by updating `mockEq.mockReturnValue({ eq: mockEq, maybeSingle: mockMaybeSingle })` to support chaining.

Also used `(supabase.from as Function)` cast since `user_scan_counts` is not yet in the Supabase-generated TypeScript types.

## Verification

- `npx tsc --noEmit` — exits 0
- `npx jest src/features/subscriptions/__tests__/scan-count.test.ts --no-coverage` — 5/5 pass
- `npx jest --no-coverage` — 617/617 pass, no regressions

## Diagnostics

- `instanceof ScanLimitError` at catch sites to distinguish limit-reached from other errors
- `error.currentCount` gives exact count when limit is reached
- `getScanCount(userId)` queryable directly for inspection

## Deviations

- Test mock `mockEq.mockReturnValue` updated to chain `{ eq: mockEq, maybeSingle }` — the T01 skeleton only supported one `.eq()` call but the implementation correctly uses two (user_id + year_month filters).
- `(supabase.from as Function)` cast used for `user_scan_counts` (consistent with RPC cast pattern; table not yet in generated types).

## Known Issues

none

## Files Created/Modified

- `src/features/scan/errors.ts` — ScanLimitError class, named export
- `src/features/subscriptions/scan-count.ts` — getScanCount, incrementScanCount, currentYearMonth (private)
- `src/features/subscriptions/__tests__/scan-count.test.ts` — fixed mockEq chain for two .eq() calls
