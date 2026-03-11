---
id: T03
parent: S04
milestone: M002
provides:
  - Consent-gated AdBanner with dynamic personalization flag driven by canShowPersonalizedAds()
  - GdprConsentBanner web component with accept/decline that persists to AsyncStorage
  - AdSlot.native.tsx delegates mobile/leaderboard variants to real AdBanner
key_files:
  - src/features/ads/AdBanner.tsx
  - src/features/ads/GdprConsentBanner.tsx
  - src/components/public/AdSlot.native.tsx
  - src/features/ads/__tests__/AdBanner.test.ts
  - src/features/ads/index.ts
key_decisions:
  - AdBanner runs consent check in a separate useEffect from SDK loading, so both resolve independently and the component renders placeholder until both complete
  - GdprConsentBanner uses module-level Platform.OS check (const isWeb) to avoid hooks-after-early-return violation while keeping native as a no-op
  - AdSlot sidebar variant keeps static placeholder since AdBanner has no sidebar format support
patterns_established:
  - Consent-gated rendering pattern: useEffect resolves consent → stores in state → drives requestNonPersonalizedAdsOnly flag
  - Platform-gated component pattern: module-level const isWeb guards useEffect body and render, keeping all hooks unconditional
observability_surfaces:
  - "console.warn('[AdsConsent] Consent check failed at render time:')" in AdBanner if consent resolution fails
  - GdprConsentBanner visibility on web indicates pending consent — remains visible until user acts
  - requestNonPersonalizedAdsOnly prop passed to AdMob SDK reflects consent state
  - onConsentResult callback on GdprConsentBanner for parent coordination
duration: 15m
verification_result: passed
completed_at: 2026-03-11
blocker_discovered: false
---

# T03: Consent-gated AdBanner, GdprConsentBanner component, and AdSlot wiring

**Wired consent module into ad pipeline: AdBanner gates on consent status, GdprConsentBanner provides web accept/decline UI, AdSlot.native delegates to real AdBanner.**

## What Happened

Updated `AdBanner.tsx` NativeAdBanner to check consent on mount via a dedicated useEffect. When consent is `unknown` or `required`, it calls `requestConsent()` (triggers UMP form on native). The resolved consent status drives `requestNonPersonalizedAdsOnly` — only `'obtained'` enables personalized ads. On SDK unavailability or consent failure, falls back to non-personalized ads (safe default).

Created `GdprConsentBanner.tsx` as a fixed-bottom web-only banner. On mount, checks `getConsentStatus()`. If `unknown` or `required` on web, renders a privacy message with Accept and Decline buttons. Accept calls `setWebConsentStatus('obtained')`, Decline calls `setWebConsentStatus('not_required')`. Banner dismisses after either action. Uses design tokens for styling. On native, returns null (UMP handles consent UI). Accepts `onConsentResult` callback prop.

Updated `AdSlot.native.tsx` to import AdBanner and render it for mobile (BANNER_SIZE_MOBILE) and leaderboard (BANNER_SIZE_WEB) variants. Sidebar variant retains the static placeholder since AdBanner doesn't support that format.

Extended `AdBanner.test.ts` with consent-gated test cases verifying the consent→personalization mapping for all five ConsentStatus values, confirming only `'obtained'` enables personalized ads.

Exported `GdprConsentBanner` and `GdprConsentBannerProps` from the ads module index.

## Verification

- `npx jest src/features/ads/` — 145 tests pass (5 suites), including new consent-gated tests
- `npx jest` — 474 tests pass (21 suites), zero failures, zero regressions
- `npx tsc --noEmit` — zero TypeScript errors

Slice-level verification:
- ✅ `npx jest src/features/ads/__tests__/config.test.ts` — passes (T01)
- ✅ `npx jest src/features/ads/__tests__/consent.test.ts` — passes (T02)
- ✅ `npx jest src/features/ads/__tests__/AdBanner.test.ts` — passes (T03, this task)
- ✅ `npx tsc --noEmit` — zero errors
- ✅ `npx jest` — 474 tests pass, zero regressions

All slice verification checks pass. This is the final task of S04.

## Diagnostics

- Check `GdprConsentBanner` visibility on web to see if consent is pending
- `requestNonPersonalizedAdsOnly` prop on AdMob SDK banner reflects consent state at render time
- `console.warn('[AdsConsent]')` messages indicate consent resolution failures
- `getConsentStatus()` callable at any time to inspect current consent state
- AsyncStorage key `@ads_consent_status` inspectable on web for persisted value

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `src/features/ads/AdBanner.tsx` — Added consent imports, useEffect for consent resolution, dynamic requestNonPersonalizedAdsOnly flag
- `src/features/ads/GdprConsentBanner.tsx` — New web consent banner component with accept/decline
- `src/components/public/AdSlot.native.tsx` — Now delegates mobile/leaderboard to AdBanner, sidebar keeps placeholder
- `src/features/ads/__tests__/AdBanner.test.ts` — Extended with consent-gated personalization tests for all ConsentStatus values
- `src/features/ads/index.ts` — Added GdprConsentBanner and GdprConsentBannerProps exports
