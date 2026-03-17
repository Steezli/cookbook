---
estimated_steps: 5
estimated_files: 2
---

# T02: Implement subscriber suppression in AdBanner and consent bypass

**Slice:** S04 — Ad Suppression for Subscribers
**Milestone:** M006

## Description

Make the T01 tests pass with minimal, additive changes to `AdBanner.tsx` and `consent.ts`. No structural changes — the AdBanner platform branch, NativeAdBanner, and consent SDK paths are all preserved. Subscriber suppression is a guard at the `AdBanner` wrapper top before any platform logic runs.

## Steps

1. **Edit `src/features/ads/AdBanner.tsx`**:
   - Add import: `import { useSubscription } from '@/features/subscriptions/SubscriptionContext';`
   - At the top of the `AdBanner` function body (before `const platform = getAdPlatform()`), add:
     ```ts
     const { isLoading, isSubscriber } = useSubscription();
     if (!isLoading && isSubscriber) return null;
     ```
   - Export a pure helper after the imports (before `AdBanner`):
     ```ts
     export function shouldSuppressAd(isLoading: boolean, isSubscriber: boolean): boolean {
       return !isLoading && isSubscriber;
     }
     ```
   - No other changes to `AdBanner` or `NativeAdBanner`.

2. **Edit `src/features/ads/consent.ts`**:
   - Add `options?: { isSubscriber?: boolean }` parameter to `getConsentStatus()` and `requestConsent()`.
   - At the top of each function, add: `if (options?.isSubscriber) return Promise.resolve('not_required');`
   - All existing callers pass no arguments — the default `undefined` is backward-compatible.

3. **Run the full test suite** to confirm T01 tests now pass and no regressions exist.

4. **Run `npx tsc --noEmit`** to confirm TypeScript is clean. The `shouldSuppressAd` export resolves any `@ts-expect-error` from T01.

5. **Remove any `// @ts-expect-error` markers** added in T01 now that the export exists.

## Must-Haves

- [ ] `useSubscription()` called at the top of `AdBanner` function — before `getAdPlatform()` and before `getBannerSize()`
- [ ] Guard is `if (!isLoading && isSubscriber) return null` — not just `if (isSubscriber)` (must protect against layout shift during loading)
- [ ] `shouldSuppressAd(isLoading, isSubscriber)` exported as a named pure function from `AdBanner.tsx`
- [ ] `getConsentStatus` and `requestConsent` accept `options?: { isSubscriber?: boolean }` — default undefined, existing callers unaffected
- [ ] Both consent functions return `'not_required'` immediately when `options?.isSubscriber` is `true`
- [ ] `npx jest src/features/ads/__tests__/AdBanner.test.ts --no-coverage` — all tests pass (including new T01 tests)
- [ ] `npx jest src/features/ads/__tests__/consent.test.ts --no-coverage` — all tests pass
- [ ] `npx tsc --noEmit` — exits 0
- [ ] `npx jest --no-coverage` — zero failures, zero regressions

## Verification

- `npx jest src/features/ads/__tests__/AdBanner.test.ts --no-coverage` — all pass
- `npx jest src/features/ads/__tests__/consent.test.ts --no-coverage` — all pass
- `npx tsc --noEmit` — exits 0
- `npx jest --no-coverage` — zero failures

## Observability Impact

- Signals added/changed: No new log lines — subscriber suppression is a silent `return null`. Existing `console.warn('[AdsConsent]')` and `console.warn('[AdBanner]')` paths are untouched.
- How a future agent inspects this: `npx jest src/features/ads/__tests__/AdBanner.test.ts` is the primary diagnostic. If subscriber sees ads, the `shouldSuppressAd(false, true) → true` test is the first check.
- Failure state exposed: `isLoading` and `isSubscriber` observable via `useSubscription()` at runtime; logic is validated at contract level by Jest.

## Inputs

- `src/features/ads/__tests__/AdBanner.test.ts` — T01 output: failing tests that define the required `shouldSuppressAd` signature
- `src/features/ads/__tests__/consent.test.ts` — T01 output: failing tests that define the required `options.isSubscriber` signature
- `src/features/subscriptions/SubscriptionContext.tsx` — S02 output: `useSubscription()` returning `{ isLoading, isSubscriber, ... }`

## Expected Output

- `src/features/ads/AdBanner.tsx` — modified: `useSubscription` import added; subscriber guard at top of `AdBanner`; `shouldSuppressAd` exported
- `src/features/ads/consent.ts` — modified: `options?: { isSubscriber?: boolean }` added to `getConsentStatus` and `requestConsent`; immediate `'not_required'` return when subscriber
