---
id: T01
parent: S03
milestone: M006
provides:
  - react-native-purchases-ui Jest mock
  - scan-gate contract tests (4 tests, failing on assertion until T02)
  - CreateMultiPhotoScanJobOptions interface on scan-service
key_files:
  - __mocks__/react-native-purchases-ui.js
  - src/features/scan/__tests__/scan-gate.test.ts
  - jest.config.js
  - src/features/scan/scan-service.ts
key_decisions:
  - createMultiPhotoScanJob signature extended to accept CreateMultiPhotoScanJobOptions | string[] (backward-compatible) so tests compile before T02 implements the gate
patterns_established:
  - react-native-purchases-ui mock mirrors react-native-purchases mock pattern (module.exports with __esModule, default, and named RevenueCatUI)
observability_surfaces:
  - npx jest src/features/scan/__tests__/scan-gate.test.ts — gate contract, first diagnostic when gate behavior seems wrong
duration: ~10 min
verification_result: passed
completed_at: 2026-03-17
blocker_discovered: false
---

# T01: Write failing Jest contract tests for scan gate

**Created `__mocks__/react-native-purchases-ui.js`, added moduleNameMapper entry, and wrote 4 gate contract tests that are collected without module errors and fail on assertion (gate not yet implemented).**

## What Happened

1. Created `__mocks__/react-native-purchases-ui.js` matching the `react-native-purchases` mock shape (`__esModule`, `default`, named `RevenueCatUI`). `presentPaywallIfNeeded` is a `jest.fn()`.
2. Added `'^react-native-purchases-ui$'` to `moduleNameMapper` in `jest.config.js`.
3. Extended `createMultiPhotoScanJob` in `scan-service.ts` to accept `CreateMultiPhotoScanJobOptions | string[]` — the options object is the new intended API that T02 will gate; the `string[]` branch preserves backward compatibility for existing call sites.
4. Created `src/features/scan/__tests__/scan-gate.test.ts` with 4 tests: free user count=1 passes, count=2 passes, count=3 throws `ScanLimitError`, subscriber skips `incrementScanCount`.

## Verification

```
npx jest src/features/scan/__tests__/scan-gate.test.ts --no-coverage
→ FAIL (3 failed, 1 passed, 4 total)
→ No "Cannot find module" errors
→ Tests collected correctly
```

- Subscriber test passes (current impl never calls `incrementScanCount` — coincidentally satisfies the contract)
- Free-user count tests fail because gate logic not yet present (expected — T02 implements)
- `ScanLimitError` rejection test fails because gate not yet implemented (expected)
- `ls __mocks__/react-native-purchases-ui.js` → file exists ✓

## Diagnostics

`npx jest src/features/scan/__tests__/scan-gate.test.ts` is the primary diagnostic surface once the gate is live.

## Deviations

`createMultiPhotoScanJob` signature was extended in this task (rather than waiting for T02) to allow the tests to compile against the new options API. The gate logic itself is intentionally absent — T02 implements it.

## Known Issues

3 of 4 tests intentionally fail — gate implementation is T02's responsibility.

## Files Created/Modified

- `__mocks__/react-native-purchases-ui.js` — new Jest mock for RevenueCatUI SDK
- `jest.config.js` — added moduleNameMapper entry for react-native-purchases-ui
- `src/features/scan/__tests__/scan-gate.test.ts` — 4 gate contract tests
- `src/features/scan/scan-service.ts` — added `CreateMultiPhotoScanJobOptions` interface; signature accepts options object or legacy string[]
