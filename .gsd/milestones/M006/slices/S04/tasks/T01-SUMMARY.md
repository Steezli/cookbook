---
id: T01
parent: S04
milestone: M006
provides:
  - Failing contract tests for shouldSuppressAd helper in AdBanner.test.ts
  - Failing contract tests for isSubscriber consent bypass in consent.test.ts
key_files:
  - src/features/ads/__tests__/AdBanner.test.ts
  - src/features/ads/__tests__/consent.test.ts
key_decisions:
  - Extended react-native mock in AdBanner.test.ts to include StyleSheet.create, View, Text, ActivityIndicator — required because importing shouldSuppressAd from AdBanner.tsx triggers module-level StyleSheet.create at init time
patterns_established:
  - @ts-expect-error guards on not-yet-exported symbols so tsc exits 0 while tests remain red
observability_surfaces:
  - none — tests are pure contract verification artifacts
duration: ~15min
verification_result: passed
completed_at: 2026-03-17
blocker_discovered: false
---

# T01: Write failing contract tests for subscriber ad suppression and consent skip

**Added three failing `shouldSuppressAd` tests to AdBanner.test.ts and two failing subscriber bypass tests to consent.test.ts; all 61 pre-existing tests still pass.**

## What Happened

- Added `jest.mock('@/features/subscriptions/SubscriptionContext', () => ({ useSubscription: jest.fn() }))` to `AdBanner.test.ts`.
- Added `// @ts-expect-error` import of `shouldSuppressAd` from `../AdBanner` — import succeeds at runtime (module loads) but the export doesn't exist, so calling it throws "is not a function".
- Extended the `react-native` mock in `AdBanner.test.ts` to include `StyleSheet.create`, `View`, `Text`, and `ActivityIndicator` — necessary because importing `AdBanner.tsx` runs module-level `StyleSheet.create({...})` at init time, which was crashing the test suite before this fix.
- Added three `shouldSuppressAd` tests: loaded+subscriber→true, loading+subscriber→false, loaded+non-subscriber→false. All three fail: "is not a function".
- Added `describe('subscriber consent bypass')` block to `consent.test.ts` with three tests: `getConsentStatus({ isSubscriber: true })` → `'not_required'`, `requestConsent({ isSubscriber: true })` → `'not_required'`, `getConsentStatus({ isSubscriber: false })` does not immediately return `'not_required'`. First two fail; third passes (current function ignores the unknown param, falls through to normal path returning 'unavailable' on iOS).

## Verification

```
npx jest src/features/ads/__tests__/AdBanner.test.ts --no-coverage
# → 22 passed, 3 failed (shouldSuppressAd is not a function) ✓

npx jest src/features/ads/__tests__/consent.test.ts --no-coverage
# → 39 passed, 2 failed (not_required not returned for isSubscriber:true) ✓

npx tsc --noEmit
# → exits 0 ✓
```

## Diagnostics

- `npx jest src/features/ads/__tests__/AdBanner.test.ts` — shouldSuppressAd tests fail until T02 exports the function
- `npx jest src/features/ads/__tests__/consent.test.ts` — subscriber bypass tests fail until T02 adds the `isSubscriber` parameter

## Deviations

- Had to extend the `react-native` mock with `StyleSheet`, `View`, `Text`, `ActivityIndicator` because importing `AdBanner.tsx` (needed to get `shouldSuppressAd`) runs `StyleSheet.create` at module init. The task plan didn't anticipate this, but it's a local mock fix — no plan-level impact.

## Known Issues

None.

## Files Created/Modified

- `src/features/ads/__tests__/AdBanner.test.ts` — added SubscriptionContext mock, extended react-native mock, added `shouldSuppressAd` import + 3 failing tests
- `src/features/ads/__tests__/consent.test.ts` — added `subscriber consent bypass` describe block with 3 tests (2 failing, 1 passing)
