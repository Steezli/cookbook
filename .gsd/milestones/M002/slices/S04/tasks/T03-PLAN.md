---
estimated_steps: 6
estimated_files: 5
---

# T03: Consent-gated AdBanner, GdprConsentBanner component, and AdSlot wiring

**Slice:** S04 — Production Ads + GDPR
**Milestone:** M002

## Description

Wire the consent module (T02) into the ad rendering pipeline. Update `AdBanner` to gate ad loading on consent status and control personalization. Build the `GdprConsentBanner` component for web users to accept/decline consent. Update `AdSlot.native.tsx` to render real `AdBanner` (consent-gated) instead of a static placeholder. This task closes the full loop: env-based IDs (T01) → consent check (T02) → consent-gated ad rendering (T03).

## Steps

1. Update `AdBanner.tsx` `NativeAdBanner` component: on mount, call `getConsentStatus()`. If status is `'unknown'` or `'required'`, call `requestConsent()` (triggers UMP form on native). After consent resolution, read `canShowPersonalizedAds()` and set `requestNonPersonalizedAdsOnly` accordingly (was hardcoded `true`). If consent status is `'unavailable'`, continue showing ads with `requestNonPersonalizedAdsOnly: true` (safe default). Store consent status in component state to avoid re-checking on every render.
2. Create `src/features/ads/GdprConsentBanner.tsx`: a React component that checks `getConsentStatus()` on mount. If status is `'unknown'` or `'required'` and platform is `'web'`, renders a fixed-bottom banner with privacy message, "Accept" button (calls `setWebConsentStatus('obtained')`), and "Decline" button (calls `setWebConsentStatus('not_required')`). Dismisses after either action. Uses design tokens for styling. On native, returns `null` (UMP handles the UI). Accepts an optional `onConsentResult` callback prop for parent coordination.
3. Update `src/components/public/AdSlot.native.tsx`: import `AdBanner` from `@/features/ads` and `getBannerSize` / `BANNER_SIZE_MOBILE` from config. For `mobile` variant, render `<AdBanner size={BANNER_SIZE_MOBILE} />`. For `leaderboard` variant, render `<AdBanner size={BANNER_SIZE_WEB} />`. For `sidebar` variant, keep the existing placeholder (AdBanner doesn't support sidebar format). Pass through `style` prop.
4. Update `src/features/ads/__tests__/AdBanner.test.ts`: add test cases for consent-gated loading. Mock `getConsentStatus` to return various statuses and verify the component's behavior: (a) when consent is `'obtained'`, `requestNonPersonalizedAdsOnly` should be false; (b) when consent is `'not_required'`, non-personalized should be true; (c) when consent is `'unavailable'`, non-personalized should be true (safe default). These are logic tests on the config/consent interaction, not React rendering tests.
5. Export `GdprConsentBanner` from `src/features/ads/index.ts`.
6. Run full test suite (`npx jest`) and TypeScript check (`npx tsc --noEmit`) to verify zero regressions across all 415+ tests.

## Must-Haves

- [ ] `AdBanner` checks consent before loading ads
- [ ] `requestNonPersonalizedAdsOnly` driven by `canShowPersonalizedAds()`, not hardcoded
- [ ] `GdprConsentBanner` renders accept/decline on web when consent needed
- [ ] `GdprConsentBanner` is a no-op on native (UMP handles it)
- [ ] `AdSlot.native.tsx` renders `AdBanner` for mobile/leaderboard variants
- [ ] `AdSlot.web.tsx` unchanged (remains placeholder)
- [ ] All existing tests pass plus new consent-gated tests
- [ ] Zero TypeScript errors

## Verification

- `npx jest src/features/ads/` — all ad module tests pass
- `npx jest` — full suite passes (415+ tests, zero regressions)
- `npx tsc --noEmit` — zero TypeScript errors

## Observability Impact

- Signals added/changed: `console.warn('[AdsConsent]')` in AdBanner if consent check fails at render time
- How a future agent inspects this: check `GdprConsentBanner` visibility on web; check `requestNonPersonalizedAdsOnly` prop passed to AdMob SDK
- Failure state exposed: AdBanner falls back to non-personalized ads on any consent failure; GdprConsentBanner remains visible until user acts

## Inputs

- `src/features/ads/consent.ts` — T02's consent module (`getConsentStatus`, `requestConsent`, `canShowPersonalizedAds`, `setWebConsentStatus`)
- `src/features/ads/config.ts` — T01's updated `getBannerAdUnitId()` and banner size constants
- `src/features/ads/AdBanner.tsx` — existing component to modify
- `src/components/public/AdSlot.native.tsx` — placeholder to upgrade

## Expected Output

- `src/features/ads/AdBanner.tsx` — consent-gated ad loading with dynamic personalization flag
- `src/features/ads/GdprConsentBanner.tsx` — web consent banner component (new)
- `src/components/public/AdSlot.native.tsx` — delegates to AdBanner for mobile/leaderboard
- `src/features/ads/__tests__/AdBanner.test.ts` — extended with consent-gated scenarios
- `src/features/ads/index.ts` — exports GdprConsentBanner
