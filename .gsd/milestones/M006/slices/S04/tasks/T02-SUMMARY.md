---
id: T02
parent: S04
milestone: M006
provides:
  - shouldSuppressAd exported pure helper from AdBanner.tsx
  - useSubscription subscriber guard at top of AdBanner function
  - getConsentStatus and requestConsent accept options.isSubscriber for immediate not_required bypass
key_files:
  - src/features/ads/AdBanner.tsx
  - src/features/ads/consent.ts
  - src/features/ads/__tests__/AdBanner.test.ts
  - src/features/ads/__tests__/consent.test.ts
key_decisions:
  - shouldSuppressAd placed before AdBanner component definition so it can be tree-shaken independently
  - Guard uses !isLoading && isSubscriber to prevent layout shift during subscription loading
patterns_established:
  - Subscriber suppression is a silent early return null — no logging needed
  - options?.isSubscriber pattern for consent bypass keeps existing callers unaffected
observability_surfaces:
  - npx jest src/features/ads/__tests__/AdBanner.test.ts — primary diagnostic for subscriber suppression contract
  - shouldSuppressAd(false, true) → true test is first check if subscriber sees ads
duration: short
verification_result: passed
completed_at: 2026-03-17
blocker_discovered: false
---

# T02: Implement subscriber suppression in AdBanner and consent bypass

**Added `shouldSuppressAd` export and subscriber guard to `AdBanner.tsx`, and `options.isSubscriber` bypass to both consent functions — making all T01 contract tests pass.**

## What Happened

Made minimal additive changes to two files:

1. **`AdBanner.tsx`**: Added `import { useSubscription }` from SubscriptionContext, exported `shouldSuppressAd(isLoading, isSubscriber)` pure helper before the component, and added `if (!isLoading && isSubscriber) return null` at the top of the `AdBanner` function body before any platform logic.

2. **`consent.ts`**: Added `options?: { isSubscriber?: boolean }` to both `getConsentStatus()` and `requestConsent()`. Each function short-circuits with `return Promise.resolve('not_required')` when `options?.isSubscriber` is true. All existing callers pass no arguments — fully backward-compatible.

3. **Test cleanup**: Removed `@ts-expect-error` guards from `AdBanner.test.ts` (1 line) and `consent.test.ts` (3 lines) now that the exports exist.

## Verification

- `npx jest src/features/ads/__tests__/AdBanner.test.ts --no-coverage` — all pass (including new shouldSuppressAd tests)
- `npx jest src/features/ads/__tests__/consent.test.ts --no-coverage` — all pass (including subscriber bypass tests)
- `npx jest --no-coverage` — 634 tests, 31 suites, zero failures
- `npx tsc --noEmit` — exits 0

## Diagnostics

- Runtime: subscriber suppression is a silent `return null` — no log lines added
- Contract check: `npx jest src/features/ads/__tests__/AdBanner.test.ts` is the primary diagnostic
- If subscriber sees ads: check `shouldSuppressAd(false, true) → true` test first
- If consent bypass fails: check `getConsentStatus({ isSubscriber: true }) → 'not_required'` test

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `src/features/ads/AdBanner.tsx` — added useSubscription import, shouldSuppressAd export, subscriber guard at top of AdBanner
- `src/features/ads/consent.ts` — added options.isSubscriber bypass to getConsentStatus and requestConsent
- `src/features/ads/__tests__/AdBanner.test.ts` — removed @ts-expect-error guard
- `src/features/ads/__tests__/consent.test.ts` — removed 3 @ts-expect-error guards
