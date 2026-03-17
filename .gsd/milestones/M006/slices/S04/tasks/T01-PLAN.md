---
estimated_steps: 4
estimated_files: 2
---

# T01: Write failing contract tests for subscriber ad suppression and consent skip

**Slice:** S04 — Ad Suppression for Subscribers
**Milestone:** M006

## Description

Write the Jest contract tests that define the slice's objective verification target before any implementation exists. Tests must fail until T02 is complete. This follows the project's established pattern: pure-logic tests without a React renderer, with module-level mocks for React hooks.

Two test targets:
1. `AdBanner.test.ts` — add `shouldSuppressAd(isLoading, isSubscriber)` tests that assert the suppression guard semantics
2. `consent.test.ts` — add tests for the `isSubscriber` parameter that causes `getConsentStatus` and `requestConsent` to return `'not_required'` immediately

## Steps

1. **Open `src/features/ads/__tests__/AdBanner.test.ts`** — read it to understand the existing mock setup (Platform proxy, `afterEach` reset). The file already mocks `react-native`. Add at the top of the file a `jest.mock('@/features/subscriptions/SubscriptionContext', () => ({ useSubscription: jest.fn() }))` call. Add a new `describe('shouldSuppressAd helper')` block with three tests:
   - `shouldSuppressAd(false, true)` returns `true` (loaded + subscriber → suppress)
   - `shouldSuppressAd(true, true)` returns `false` (loading + subscriber → do not suppress, avoid layout shift)
   - `shouldSuppressAd(false, false)` returns `false` (loaded + non-subscriber → do not suppress)
   Import `shouldSuppressAd` from `../AdBanner` — this import will fail until T02 exports it.

2. **Check if `src/features/ads/__tests__/consent.test.ts` exists** — if not, create it. Add a `describe('subscriber consent bypass')` block with:
   - `getConsentStatus({ isSubscriber: true })` resolves to `'not_required'`
   - `requestConsent({ isSubscriber: true })` resolves to `'not_required'`
   - `getConsentStatus({ isSubscriber: false })` does NOT immediately return `'not_required'` (proceeds to normal path)
   The file must mock `react-native` (Platform) using the same proxy pattern as `AdBanner.test.ts`.

3. **Run the new tests** to confirm they fail for the right reason (missing export / missing parameter), and existing tests still pass.

4. **Run `npx tsc --noEmit`** — confirm 0 TypeScript errors from test files themselves (the import of `shouldSuppressAd` will produce a TS error until T02 — that's acceptable; the test file may need a `// @ts-expect-error` comment as a temporary marker until T02 adds the export).

## Must-Haves

- [ ] `jest.mock('@/features/subscriptions/SubscriptionContext')` added to `AdBanner.test.ts`
- [ ] Three `shouldSuppressAd` tests exist in `AdBanner.test.ts` — they fail because the export doesn't exist yet
- [ ] All pre-existing tests in `AdBanner.test.ts` still pass
- [ ] `consent.test.ts` exists with `isSubscriber: true` tests for both `getConsentStatus` and `requestConsent`
- [ ] New consent tests fail because the parameter doesn't exist yet; pre-existing consent logic tests (if any) pass

## Verification

- `npx jest src/features/ads/__tests__/AdBanner.test.ts --no-coverage 2>&1 | tail -20` — existing tests pass; new `shouldSuppressAd` tests fail with "not a function" or similar
- `npx jest src/features/ads/__tests__/consent.test.ts --no-coverage 2>&1 | tail -20` — new subscriber bypass tests fail
- `npx tsc --noEmit` — exits 0 (or the only errors are in the test file for the missing `shouldSuppressAd` export, which can be guarded with `// @ts-expect-error`)

## Observability Impact

- Signals added/changed: None — tests are pure contract verification artifacts
- How a future agent inspects this: `npx jest src/features/ads/__tests__/AdBanner.test.ts` and `npx jest src/features/ads/__tests__/consent.test.ts`
- Failure state exposed: Failing tests are the intended state at end of T01; they become the unambiguous completion signal for T02

## Inputs

- `src/features/ads/__tests__/AdBanner.test.ts` — existing test file; read before editing to understand mock setup
- `src/features/ads/consent.ts` — read to understand current function signatures before writing tests against the new signatures
- `src/features/subscriptions/SubscriptionContext.tsx` — read to confirm `useSubscription` export name and return shape (`{ isLoading, isSubscriber, ... }`)

## Expected Output

- `src/features/ads/__tests__/AdBanner.test.ts` — modified: `jest.mock` for SubscriptionContext added; three new `shouldSuppressAd` tests added (failing)
- `src/features/ads/__tests__/consent.test.ts` — created or modified: subscriber bypass tests added (failing)
