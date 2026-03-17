---
estimated_steps: 4
estimated_files: 3
---

# T01: Write failing Jest contract tests for scan gate

**Slice:** S03 — Scan Gating + Paywall
**Milestone:** M006

## Description

Define the exact semantics of the scan gate before implementing it. Create the `react-native-purchases-ui` mock so Jest can resolve the module (mirroring the `react-native-purchases` mock pattern from S02). Write 4 contract tests covering: free user under limit passes, free user at limit is rejected with `ScanLimitError`, subscriber bypasses the gate entirely (no `incrementScanCount` call).

Tests will fail on assertion at the end of this task — that is correct. Implementation happens in T02.

## Steps

1. Create `__mocks__/react-native-purchases-ui.js` — export a `RevenueCatUI` object with `presentPaywallIfNeeded: jest.fn().mockResolvedValue(undefined)`. Match the `__mocks__/react-native-purchases.js` module shape pattern (`module.exports = { __esModule: true, default: { RevenueCatUI: ... }, RevenueCatUI: ... }`).
2. Add `'^react-native-purchases-ui$': '<rootDir>/__mocks__/react-native-purchases-ui.js'` to `moduleNameMapper` in `jest.config.js`.
3. Create `src/features/scan/__tests__/scan-gate.test.ts`. Mock `supabase.auth.getUser` to return `{ data: { user: { id: 'user-1' } } }`. Mock `src/features/subscriptions/scan-count` to control `incrementScanCount` behavior. Mock `supabase.from(...).insert(...).select().single()` to return a valid `ScanJob`. Write tests:
   - `free user, count 1: resolves with scan job` — `incrementScanCount` resolves with 1
   - `free user, count 2: resolves with scan job` — `incrementScanCount` resolves with 2
   - `free user, count 3 (limit): throws ScanLimitError` — `incrementScanCount` rejects with `new ScanLimitError(4)`
   - `subscriber: resolves and does not call incrementScanCount` — pass `{ isSubscriber: true }`; assert `incrementScanCount` not called
4. Run tests to confirm they are collected without resolution errors (expected to fail on assertion since T02 hasn't implemented the gate yet).

## Must-Haves

- [ ] `__mocks__/react-native-purchases-ui.js` exists with `presentPaywallIfNeeded` jest.fn()
- [ ] `jest.config.js` has moduleNameMapper entry for `react-native-purchases-ui`
- [ ] `scan-gate.test.ts` has ≥4 tests covering: under-limit passes, at-limit throws `ScanLimitError`, subscriber bypasses gate
- [ ] Tests are collected without import/resolution errors (may fail on assertion — expected)

## Verification

- `npx jest src/features/scan/__tests__/scan-gate.test.ts --no-coverage 2>&1 | grep -E "Tests:|Test Suites:|PASS|FAIL|Cannot find module"` — no "Cannot find module" errors; tests collected
- `ls __mocks__/react-native-purchases-ui.js` — file exists

## Observability Impact

- Signals added/changed: None (test-only artifacts)
- How a future agent inspects this: `npx jest src/features/scan/__tests__/scan-gate.test.ts` is the first diagnostic when gate behavior seems wrong
- Failure state exposed: `ScanLimitError` instanceof check in test establishes the failure contract

## Inputs

- `__mocks__/react-native-purchases.js` — existing mock file; use as structural template
- `jest.config.js` moduleNameMapper section — append new entry here
- `src/features/scan/errors.ts` — `ScanLimitError` class for test assertions
- S02-SUMMARY.md → `__mocks__` + moduleNameMapper pattern established in S02

## Expected Output

- `__mocks__/react-native-purchases-ui.js` — Jest mock for RevenueCatUI SDK
- `jest.config.js` — updated with react-native-purchases-ui mapper entry
- `src/features/scan/__tests__/scan-gate.test.ts` — 4 failing (but collected) contract tests
