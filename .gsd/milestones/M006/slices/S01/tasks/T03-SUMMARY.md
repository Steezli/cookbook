---
id: T03
parent: S01
milestone: M006
provides:
  - src/features/subscriptions/__tests__/scan-count.test.ts — 5 fully wired and passing tests
key_files:
  - src/features/subscriptions/__tests__/scan-count.test.ts
key_decisions: []
patterns_established:
  - mockEq.mockReturnValue({ eq: mockEq, maybeSingle }) for chained .eq() query mocks
  - mockRpc.mockResolvedValue({ data: N, error: null }) pattern for RPC happy/error path
observability_surfaces:
  - npx jest src/features/subscriptions/__tests__/scan-count.test.ts — instant contract verification
duration: <5 min
verification_result: passed
completed_at: 2026-03-17
blocker_discovered: false
---

# T03: Wire Jest mocks and make all scan-count tests pass

**All 5 scan-count tests already fully wired and passing; full suite (617 tests) green; tsc clean.**

## What Happened

The test file written in T01 and updated in T02 was already fully wired with correct mocks. No changes were needed. Running the targeted suite confirmed 5/5 pass; running the full suite confirmed 617/617 pass with zero regressions; `tsc --noEmit` exits 0.

## Verification

- `npx jest src/features/subscriptions/__tests__/scan-count.test.ts --no-coverage` → 5/5 pass
- `npx jest --no-coverage` → 617/617 pass, 29 suites
- `npx tsc --noEmit` → exits 0

## Diagnostics

`npx jest src/features/subscriptions/__tests__/scan-count.test.ts` is the canonical contract verification command for the scan-count wrappers and ScanLimitError behavior.

## Deviations

none — test file was already complete from T02

## Known Issues

none

## Files Created/Modified

- `src/features/subscriptions/__tests__/scan-count.test.ts` — no changes needed; already passing
