# S03: Scan Gating + Paywall — UAT

**Milestone:** M006
**Written:** 2026-03-17

## UAT Type

- UAT mode: artifact-driven (contract tests + TypeScript compilation)
- Why this mode is sufficient: S03 is explicitly scoped to contract verification (Jest) + implementation completeness. Real runtime (RevenueCatUI rendering, Stripe checkout, device 3-scan enforcement) is deferred to M006 DoD. The gate semantics, TypeScript types, and paywall trigger wiring are fully verifiable without a device.

## Preconditions

- Node dependencies installed (`npm install`)
- Jest and TypeScript tooling available via `npx`
- No EAS build or device required for this slice's verification

## Smoke Test

`npx jest src/features/scan/__tests__/scan-gate.test.ts --no-coverage` → 4 tests pass in ~1s.

## Test Cases

### 1. Scan gate — free user at limit throws ScanLimitError

1. Run `npx jest src/features/scan/__tests__/scan-gate.test.ts --no-coverage`
2. **Expected:** Test "free user, count 3 (limit): throws ScanLimitError" passes. `createMultiPhotoScanJob` rejects with a `ScanLimitError` instance.

### 2. Scan gate — free user below limit resolves

1. Run `npx jest src/features/scan/__tests__/scan-gate.test.ts --no-coverage`
2. **Expected:** Tests for count=1 and count=2 pass. `createMultiPhotoScanJob` resolves with a scan job result.

### 3. Scan gate — subscriber bypasses increment

1. Run `npx jest src/features/scan/__tests__/scan-gate.test.ts --no-coverage`
2. **Expected:** Subscriber test passes. `incrementScanCount` is not called (mock assertion verified).

### 4. TypeScript compiles clean

1. Run `npx tsc --noEmit`
2. **Expected:** Exits 0 with no output. Confirms `react-native-purchases-ui.d.ts`, `isSubscriber` parameter types, and PaywallPlaceholder props all compile.

### 5. Full test suite passes

1. Run `npx jest --no-coverage`
2. **Expected:** 628 tests, 31 suites, 0 failures.

### 6. ScanLimitError catch present in scan screen

1. Run `rg "ScanLimitError" app/(tabs)/scan/index.tsx`
2. **Expected:** Matches in import statement and in `catch` block — confirms paywall trigger wiring.

### 7. Remaining scans badge present in scan screen

1. Run `rg "scansRemaining" app/(tabs)/scan/index.tsx`
2. **Expected:** Matches in `useSubscription` destructure and in badge render condition.

## Edge Cases

### Mock file exists for react-native-purchases-ui

1. Run `ls __mocks__/react-native-purchases-ui.js`
2. **Expected:** File present — confirms Jest resolution won't break for any test importing this module.

### ScanLimitError currentCount field

1. Inspect `src/features/scan/errors.ts` for `ScanLimitError` class definition
2. **Expected:** `currentCount` field present — diagnostic information propagates to callers.

## Failure Signals

- Any Jest test failure in `scan-gate.test.ts` → gate logic or mock is broken
- `npx tsc --noEmit` output → type declaration or threading type mismatch
- `rg "ScanLimitError" app/(tabs)/scan/index.tsx` returns nothing → paywall trigger wiring missing
- `rg "scansRemaining" app/(tabs)/scan/index.tsx` returns nothing → badge render missing
- `Cannot find module 'react-native-purchases-ui'` in Jest output → moduleNameMapper not applied

## Requirements Proved By This UAT

- SUB-01 (partial) — `createMultiPhotoScanJob` gate enforces subscriber check; free/subscriber code paths are distinct and tested
- SUB-02 (partial) — `ScanLimitError` catch triggers `paywallVisible = true`; `PaywallPlaceholder` component exists and renders; native RevenueCatUI dynamic import path is wired (rendering requires EAS build)
- SUB-05 (partial) — gate fires at count=3; free scan count is incremented per upload attempt; subscriber bypasses increment entirely
- SUB-06 (partial) — `scansRemaining` badge render condition is present in scan screen; `useSubscription()` is the data source

## Not Proven By This UAT

- Real RevenueCatUI paywall rendering on iOS or Android (requires EAS build — deferred to M006 DoD)
- Stripe web checkout (deferred to S05)
- Actual month-boundary scan count reset on device
- End-to-end 3-scan enforcement on real device (deferred to M006 DoD)
- Purchase restoration on new device (deferred to M006 DoD)
- Subscriber no-ads experience (S04)

## Notes for Tester

- All verification for this slice is automated — run `npx jest --no-coverage` and `npx tsc --noEmit`.
- Web subscribe button in `PaywallPlaceholder` shows "Coming Soon" alert — this is intentional and replaced in S05.
- Native RevenueCatUI presentation cannot be observed without an EAS dev build. The dynamic import + fallback path will fire `showAlert` in local dev — this is expected behavior, not a bug.
- `scansRemaining` badge only shows when count is between 1 and 3. Subscribers and users at 0 remaining don't see it.
