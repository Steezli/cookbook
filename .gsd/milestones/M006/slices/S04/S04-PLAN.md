# S04: Ad Suppression for Subscribers

**Goal:** `AdBanner` returns `null` for active subscribers, GDPR consent flow is skipped for subscribers, ad suppression is immediate on purchase without app restart, and contract is verified by Jest.
**Demo:** After completing this slice, Jest shows `AdBanner` renders `null` when `isSubscriber: true` and renders the normal ad surface when `isSubscriber: false`; `getConsentStatus({ isSubscriber: true })` returns `'not_required'` immediately; `npx tsc --noEmit` exits 0; all tests pass.

## Must-Haves

- `AdBanner` calls `useSubscription()` and returns `null` when `!isLoading && isSubscriber`
- `AdBanner` renders placeholder (not `null`) while `isLoading: true`, even if subscriber state is unknown
- Platform branch (web/native) comes **after** the subscriber guard, so suppression is uniform
- `getConsentStatus` and `requestConsent` accept optional `isSubscriber?: boolean`; return `'not_required'` immediately when `true`
- Jest tests for subscriber suppression logic pass
- Jest tests for consent subscriber-skip logic pass
- `npx tsc --noEmit` exits 0
- `npx jest --no-coverage` — all tests green, no regressions

## Proof Level

- This slice proves: contract
- Real runtime required: no — subscriber state wires to `useSubscription()` which is provided via mock in tests; immediate-suppression behavior on purchase is guaranteed by the existing `addCustomerInfoUpdateListener` in `SubscriptionProvider` (S02)
- Human/UAT required: no — deferred to M006 DoD (device/EAS build)

## Verification

- `npx jest src/features/ads/__tests__/AdBanner.test.ts --no-coverage` — all existing tests pass + new subscriber suppression tests pass
- `npx jest src/features/ads/__tests__/consent.test.ts --no-coverage` — consent subscriber-skip tests pass
- `npx tsc --noEmit` — exits 0
- `npx jest --no-coverage` — zero failures, no regressions

## Observability / Diagnostics

- Runtime signals: existing `console.warn('[AdsConsent]')` and `console.warn('[AdBanner]')` paths unchanged; no new logging needed — subscriber suppression is a silent early return
- Inspection surfaces: `useSubscription()` `isSubscriber` and `isLoading` fields; check `npx jest src/features/ads/__tests__/AdBanner.test.ts` for contract state
- Failure visibility: if `AdBanner` renders an ad for a subscriber, the `isSubscriber: true` → `null` test will fail; if consent bypass is missing, the `isSubscriber: true` → `'not_required'` consent test will fail
- Redaction constraints: none — no secrets or PII involved

## Integration Closure

- Upstream surfaces consumed: `useSubscription()` from `src/features/subscriptions/SubscriptionContext.tsx` (S02); `getConsentStatus` / `requestConsent` from `src/features/ads/consent.ts` (existing)
- New wiring introduced in this slice: `useSubscription()` call added to `AdBanner` top-level function; `isSubscriber` optional param added to `getConsentStatus` and `requestConsent`
- What remains before the milestone is truly usable end-to-end: S05 (web billing), S06 (docs + end-to-end device verification); actual visual verification of ad suppression on a subscribed device deferred to M006 DoD

## Tasks

- [x] **T01: Write failing contract tests for subscriber ad suppression and consent skip** `est:20m`
  - Why: Establish the objective verification target before any implementation; tests should fail until T02 is complete
  - Files: `src/features/ads/__tests__/AdBanner.test.ts`, `src/features/ads/__tests__/consent.test.ts`
  - Do: In `AdBanner.test.ts`, add a `jest.mock('@/features/subscriptions/SubscriptionContext')` factory that returns `{ useSubscription: jest.fn() }`. Add a `shouldSuppressAd(isLoading: boolean, isSubscriber: boolean)` describe block: test returns `true` only when `!isLoading && isSubscriber`; returns `false` when `isLoading: true && isSubscriber: true`; returns `false` when `!isSubscriber`. In `consent.test.ts` (create file if missing), add tests for `getConsentStatus({ isSubscriber: true })` returns `'not_required'` and `requestConsent({ isSubscriber: true })` returns `'not_required'`. These tests must fail at this point — `shouldSuppressAd` doesn't exist yet and `getConsentStatus` doesn't accept a parameter.
  - Verify: `npx jest src/features/ads/__tests__/AdBanner.test.ts --no-coverage 2>&1 | tail -20` — new tests fail; existing tests pass. `npx jest src/features/ads/__tests__/consent.test.ts --no-coverage 2>&1 | tail -10` — new tests fail.
  - Done when: New subscriber tests exist and fail; all pre-existing tests in both files still pass; `npx tsc --noEmit` exits 0

- [x] **T02: Implement subscriber suppression in AdBanner and consent bypass** `est:25m`
  - Why: Make the T01 tests pass — additive changes to `AdBanner.tsx` and `consent.ts`
  - Files: `src/features/ads/AdBanner.tsx`, `src/features/ads/consent.ts`
  - Do: (1) In `AdBanner.tsx`: import `useSubscription` from `@/features/subscriptions/SubscriptionContext`. At the top of the `AdBanner` function (before the `platform` and `size` computation), call `const { isLoading, isSubscriber } = useSubscription()`. Add the guard: `if (!isLoading && isSubscriber) return null`. Export a `shouldSuppressAd(isLoading: boolean, isSubscriber: boolean): boolean` pure helper function so tests can exercise the logic directly. (2) In `consent.ts`: add optional `isSubscriber?: boolean` to both `getConsentStatus` and `requestConsent` signatures. Add guard at the top of each: `if (isSubscriber) return Promise.resolve('not_required')`. Default is `false` so all existing callers are unaffected. (3) Update the `NativeAdBanner` consent `useEffect` to pass `isSubscriber` hint if convenient — this is belt-and-suspenders, since subscriber suppression already short-circuits before `NativeAdBanner` renders. Not required for tests to pass.
  - Verify: `npx jest src/features/ads/__tests__/AdBanner.test.ts --no-coverage` — all pass. `npx jest src/features/ads/__tests__/consent.test.ts --no-coverage` — all pass. `npx tsc --noEmit` — exits 0. `npx jest --no-coverage` — zero failures.
  - Done when: All T01 tests pass; `npx tsc --noEmit` exits 0; `npx jest --no-coverage` shows zero failures

## Files Likely Touched

- `src/features/ads/AdBanner.tsx`
- `src/features/ads/consent.ts`
- `src/features/ads/__tests__/AdBanner.test.ts`
- `src/features/ads/__tests__/consent.test.ts`
