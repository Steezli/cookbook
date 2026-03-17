# S04: Ad Suppression for Subscribers — Research

**Date:** 2026-03-17

## Summary

S04 is the simplest slice in M006 — it connects two already-built systems: `useSubscription()` from S02 and `AdBanner` from M002/S04. The change to `AdBanner` is a 5-line addition: call `useSubscription()` at the top of the component and return `null` for subscribers before any SDK/consent logic runs. The consent skip for subscribers follows the same pattern in `consent.ts`.

The Jest test strategy is also straightforward: `AdBanner.test.ts` already tests pure config/consent logic without a React renderer. The subscriber suppression tests can follow the same approach — mock `useSubscription` to return `isSubscriber: true`, assert the component returns null by testing the suppression logic as a pure condition, or add a minimal React renderer test. Given that the existing AdBanner tests deliberately avoid React rendering (noted as deferred to integration testing), the cleanest approach for S04 contract verification is exporting a thin `shouldSuppressAd(isSubscriber: boolean)` pure helper, or simply testing the condition directly.

For `consent.ts`, the subscriber skip is a single guard: if the caller is a subscriber, return `'not_required'` immediately from `getConsentStatus()`. This requires threading `isSubscriber` into the consent API — or alternatively, checking subscription state inside the consent functions themselves. The cleaner pattern (matching the codebase's philosophy of pure functions + injectable parameters) is to add an `isSubscriber` parameter to `getConsentStatus` and `requestConsent`, with default `false` so existing callers are unaffected.

## Recommendation

1. **Add `useSubscription()` call at the top of `AdBanner`** (before platform branching). If `isSubscriber` is true, return `null` immediately — no render, no consent check, no SDK load. This satisfies immediate suppression on purchase (the listener in `SubscriptionProvider` fires `setState` on `addCustomerInfoUpdateListener`, which triggers a re-render of `AdBanner` with the new `isSubscriber: true` value — no restart needed).

2. **Update `consent.ts`** to accept an optional `isSubscriber` parameter in `getConsentStatus` and `requestConsent`. When `isSubscriber: true`, return `'not_required'` immediately. This is more testable than having `consent.ts` import `useSubscription` (which would create a module-level React hook dependency).

3. **Test strategy**: mock `useSubscription` at the module level in `AdBanner.test.ts`, test that `isSubscriber: true` causes the component to render null. Since AdBanner tests already mock Platform and consent, adding a `useSubscription` mock is minimal. The pure consent-skip logic is testable without React by calling `getConsentStatus({ isSubscriber: true })` directly.

## Don't Hand-Roll

| Problem | Existing Solution | Why Use It |
|---------|------------------|------------|
| Immediate ad suppression on purchase | `addCustomerInfoUpdateListener` in `SubscriptionProvider` already fires on purchase | Re-render happens automatically — no polling, no restart needed |
| Module-level mock for `useSubscription` in tests | `moduleNameMapper` + `__mocks__/react-native-purchases.js` pattern from S02 | Same approach: add `__mocks__/@/features/subscriptions/SubscriptionContext.ts` or use `jest.mock()` inline |

## Existing Code and Patterns

- `src/features/ads/AdBanner.tsx` — **primary edit target**. The `AdBanner` function currently returns `<AdPlaceholder>` for web and `<NativeAdBanner>` for native. Add `useSubscription()` call at the function top and return `null` before the platform branch. `NativeAdBanner` component is untouched — suppression happens at the wrapper level.
- `src/features/subscriptions/SubscriptionContext.tsx` — `useSubscription()` is available; `isSubscriber` is the only field needed. `isLoading` should also be checked: while loading, render the placeholder (not `null`) to avoid layout shift; suppress only when `isLoading: false && isSubscriber: true`.
- `src/features/ads/consent.ts` — `getConsentStatus()` and `requestConsent()` are pure async functions. Adding an optional `isSubscriberHint?: boolean` parameter is backward-compatible. Called from `NativeAdBanner`'s `useEffect` — subscriber suppression already happens before consent runs at the `AdBanner` wrapper level, so the consent change is a secondary defense layer.
- `src/features/ads/__tests__/AdBanner.test.ts` — existing test file uses pure logic testing (no React renderer). Tests mock Platform via proxy. New subscriber tests follow the same pattern by mocking `useSubscription` return values. File already imports `getAdPlatform`, `getBannerAdUnitId`, `canShowPersonalizedAds` directly — subscriber suppression logic can also be extracted as a pure helper for the same testability.
- `__mocks__/react-native-purchases.js` — established pattern for module-level mocks. A `jest.mock('@/features/subscriptions/SubscriptionContext')` call in the test file is sufficient (no separate `__mocks__` file needed since the module path is internal).

## Constraints

- `useSubscription()` **must be called inside `SubscriptionProvider`** — AdBanner is always inside the provider (it's rendered inside the root layout which wraps `SubscriptionProvider`). No structural change needed.
- **`isLoading: true` case**: AdBanner should render the placeholder (not `null`) during the initial SDK loading phase on native, otherwise ad space collapses during loading then expands when subscriber state resolves — causes layout shift for non-subscribers. Only suppress when `isLoading === false && isSubscriber === true`.
- **Web path**: `SubscriptionProvider` returns `isSubscriber: false, isLoading: false` immediately on web. AdBanner web path already renders `<AdPlaceholder>` (not a real ad). Subscriber suppression on web returns `null` instead of the placeholder — fine, no real ad revenue is at stake.
- **Consent module change is optional**: Since subscriber suppression happens at the AdBanner wrapper level (before consent is checked), the consent module change is belt-and-suspenders. It's worth doing to prevent future paths where `getConsentStatus` is called in non-AdBanner contexts for subscribers, but it's not a correctness requirement for S04.

## Common Pitfalls

- **Suppressing during `isLoading`** — If AdBanner returns `null` while `isLoading: true`, non-subscriber users see a brief layout shift when the SDK resolves. Guard: `if (!isLoading && isSubscriber) return null`.
- **Calling `useSubscription()` inside `NativeAdBanner`** — The hook is called at the `AdBanner` wrapper level. Do not add it inside the `NativeAdBanner` inner component (double call, double subscription). The wrapper already short-circuits before reaching `NativeAdBanner`.
- **`useSubscription` hook not available outside provider** — AdBanner is always inside `SubscriptionProvider` in the real app tree, but test files need to mock it. Use `jest.mock('@/features/subscriptions/SubscriptionContext')` with a factory returning `{ useSubscription: jest.fn() }`.
- **Platform branch is after the subscriber check** — The check must come before the `if (platform === 'web')` branch to suppress on all platforms uniformly.

## Open Risks

- None. This is the lowest-risk slice in M006. Both dependencies (`useSubscription()` and `AdBanner`) are stable and well-tested. The change is additive and contained to `AdBanner.tsx` plus one optional guard in `consent.ts`.

## Skills Discovered

| Technology | Skill | Status |
|------------|-------|--------|
| React Native component testing | none specific — existing project pattern is sufficient | none found |

## Sources

- `AdBanner.tsx` pattern: dynamic import, consent check, platform branch (source: existing codebase)
- `SubscriptionContext.tsx` `useSubscription()` API and `isLoading` semantics (source: S02 implementation, S02-SUMMARY.md)
- `addCustomerInfoUpdateListener` immediate-update mechanism (source: S02-SUMMARY.md forward intelligence)
- Test mock pattern for internal modules (source: `src/features/ads/__tests__/AdBanner.test.ts` + `__mocks__/react-native-purchases.js`)
