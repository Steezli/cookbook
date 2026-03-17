---
estimated_steps: 4
estimated_files: 1
---

# T03: Wire Jest mocks and make all scan-count tests pass

**Slice:** S01 — Supabase Scan Count Infrastructure
**Milestone:** M006

## Description

Complete the test file with properly wired mocks so all 5 scan-count tests pass. Then run the full suite to confirm zero regressions. This is the slice verification step.

## Steps

1. Update `src/features/subscriptions/__tests__/scan-count.test.ts`: wire `mockRpc` to return `{ data: <count>, error: null }` for happy paths. Wire `mockMaybeSingle` for `getScanCount` tests (null for no-row case, `{ count: 2 }` for existing-row case). Wire mock chain for `supabase.from('user_scan_counts').select('count').eq(...).eq(...).maybeSingle()`.
2. Ensure test for `ScanLimitError` throw: mock rpc returning `{ data: 4, error: null }`; assert `await expect(incrementScanCount('user-1')).rejects.toThrow(ScanLimitError)`; assert `error.currentCount === 4`.
3. Ensure test for RPC error propagation: mock rpc returning `{ data: null, error: new Error('db error') }`; assert rejects.
4. Run `npx jest src/features/subscriptions/__tests__/scan-count.test.ts` (5 pass); then `npx jest` (full suite, no regressions).

## Must-Haves

- [ ] `getScanCount returns 0 when no row exists` passes
- [ ] `getScanCount returns stored count` passes
- [ ] `incrementScanCount returns new count from RPC` passes
- [ ] `incrementScanCount throws ScanLimitError when count exceeds 3` passes — with `instanceof ScanLimitError` assertion
- [ ] `incrementScanCount propagates RPC errors` passes
- [ ] `npx jest` full suite passes with no regressions
- [ ] `npx tsc --noEmit` exits 0

## Verification

- `npx jest src/features/subscriptions/__tests__/scan-count.test.ts --no-coverage` — 5/5 pass
- `npx jest` — full suite passes (602+ tests)
- `npx tsc --noEmit` — exits 0

## Observability Impact

- Signals added/changed: Tests themselves document the observable contract — `ScanLimitError` with `currentCount`, count=4 triggers limit
- How a future agent inspects this: `npx jest src/features/subscriptions/__tests__/scan-count.test.ts` gives instant contract verification
- Failure state exposed: Test output names exactly which contract assertion failed

## Inputs

- `src/features/subscriptions/scan-count.ts` (from T02) — implementation being tested
- `src/features/scan/errors.ts` (from T02) — `ScanLimitError` being asserted
- `src/features/scan/__tests__/scan-service.test.ts` — mock pattern reference

## Expected Output

- `src/features/subscriptions/__tests__/scan-count.test.ts` — 5 passing tests, mocks fully wired
- Full Jest suite green with no regressions
