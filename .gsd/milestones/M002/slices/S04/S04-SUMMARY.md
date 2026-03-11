---
id: S04
parent: M002
milestone: M002
provides:
  - Environment-variable-based ad unit ID resolution with test-ID fallback (getBannerAdUnitId reads EXPO_PUBLIC_ADMOB_* env vars)
  - app.config.ts with react-native-google-mobile-ads Expo plugin reading app IDs from env
  - Unified GDPR consent API (getConsentStatus, requestConsent, canShowPersonalizedAds, setWebConsentStatus) with platform-branched implementation
  - AdsConsent type declarations covering UMP SDK surface
  - GdprConsentBanner web component with accept/decline and AsyncStorage persistence
  - Consent-gated AdBanner with dynamic personalization flag
  - AdSlot.native.tsx delegates to real AdBanner (consent-gated)
  - .env.example documentation for all four ADMOB env vars
requires:
  - slice: none
    provides: Existing ads module (config.ts, AdBanner.tsx, att.ts, types, AdSlot)
affects:
  - S05
key_files:
  - src/features/ads/config.ts
  - src/features/ads/consent.ts
  - src/features/ads/AdBanner.tsx
  - src/features/ads/GdprConsentBanner.tsx
  - src/features/ads/__tests__/config.test.ts
  - src/features/ads/__tests__/consent.test.ts
  - src/features/ads/__tests__/AdBanner.test.ts
  - src/features/ads/types/react-native-google-mobile-ads.d.ts
  - src/features/ads/index.ts
  - src/components/public/AdSlot.native.tsx
  - app.config.ts
  - .env.example
key_decisions:
  - app.json → app.config.ts migration for env-based plugin config
  - UMP SDK on native, custom consent banner on web
  - Consent-gated ad personalization over blanket non-personalized
  - GDPR consent check before ATT prompt (recommended ordering)
  - canShowPersonalizedAds as pure function taking status parameter
  - Web requestConsent() returns 'required' to signal UI to show banner
  - Placeholder app ID pattern fallback in app.config.ts (not empty string)
patterns_established:
  - Env-var-with-fallback pattern for ad config (process.env.EXPO_PUBLIC_* || TEST_CONSTANT)
  - Dynamic import with try/catch fallback to 'unavailable' status for AdsConsent (mirrors att.ts)
  - Platform.OS === 'web' branching for web-specific AsyncStorage consent path
  - Consent-gated rendering pattern in AdBanner (useEffect resolves consent → drives requestNonPersonalizedAdsOnly)
  - Module-level Platform.OS check (const isWeb) to avoid hooks-after-early-return violation
observability_surfaces:
  - "getConsentStatus() returns typed ConsentStatus at any time for runtime inspection"
  - "AsyncStorage key '@ads_consent_status' inspectable on web for persisted consent value"
  - "console.warn('[AdsConsent]') on UMP SDK failure, unexpected status, storage errors"
  - "console.warn('[AdBanner]') on consent check failure at render time"
  - "GdprConsentBanner visibility on web indicates pending consent"
  - "'unavailable' status = SDK not present; 'unknown' = no consent decision yet"
drill_down_paths:
  - .gsd/milestones/M002/slices/S04/tasks/T01-SUMMARY.md
  - .gsd/milestones/M002/slices/S04/tasks/T02-SUMMARY.md
  - .gsd/milestones/M002/slices/S04/tasks/T03-SUMMARY.md
duration: 55m
verification_result: passed
completed_at: 2026-03-11
---

# S04: Production Ads + GDPR

**Ad config reads production unit IDs from environment variables with test-ID fallback; unified GDPR consent module gates ad personalization on native (UMP SDK) and web (custom banner with AsyncStorage); AdBanner dynamically sets personalization flag based on consent status.**

## What Happened

**T01** migrated `app.json` to `app.config.ts` (function-based Expo config) so the `react-native-google-mobile-ads` plugin can read app-level IDs from `EXPO_PUBLIC_ADMOB_IOS_APP_ID` / `EXPO_PUBLIC_ADMOB_ANDROID_APP_ID` at EAS Build time. Updated `getBannerAdUnitId()` to read `EXPO_PUBLIC_ADMOB_IOS_BANNER_ID` / `EXPO_PUBLIC_ADMOB_ANDROID_BANNER_ID` from env vars, falling back to Google's test IDs. Exported test ID constants for reuse. Added all four env vars to `.env.example`. 13 new tests covering env-var resolution, fallback, cross-platform isolation, and format validation.

**T02** created the unified consent API in `consent.ts` with platform-branched implementation. Native path uses `AdsConsent` (UMP SDK) via dynamic import — calls `requestInfoUpdate()` and `getConsentInfo()` to determine consent status, maps UMP enum values to unified `ConsentStatus` type. Web path reads/writes `@ads_consent_status` in AsyncStorage with value validation. `canShowPersonalizedAds()` is a pure function returning true only for `'obtained'` status. Extended the `.d.ts` type declarations with the complete AdsConsent API surface (AdsConsentStatus enum, AdsConsentDebugGeography enum, AdsConsentInfo interface, all methods). 38 tests covering both platform paths, all status mappings, edge cases, and fallback behavior.

**T03** wired consent into the ad pipeline. `AdBanner`'s NativeAdBanner now runs a consent check useEffect on mount — if consent is `unknown`/`required`, triggers `requestConsent()` (UMP form on native). The resolved status drives `requestNonPersonalizedAdsOnly` (only `'obtained'` enables personalized ads). Created `GdprConsentBanner` as a fixed-bottom web-only banner with Accept/Decline that persists choice via `setWebConsentStatus()`. Updated `AdSlot.native.tsx` to delegate mobile and leaderboard variants to real `AdBanner` (sidebar retains placeholder). Extended AdBanner tests with consent-gated scenarios for all five ConsentStatus values.

## Verification

- `npx jest src/features/ads/__tests__/config.test.ts` — 50 tests pass (37 existing + 13 new)
- `npx jest src/features/ads/__tests__/consent.test.ts` — 38 tests pass (all new)
- `npx jest src/features/ads/__tests__/AdBanner.test.ts` — 22 tests pass (11 existing + 11 new)
- `npx tsc --noEmit` — zero TypeScript errors
- `npx jest` — 474 tests pass (21 suites), zero failures, zero regressions

## Requirements Advanced

- ADS-04 — Production ad unit ID config now reads from env vars with test-ID fallback; ready to switch to production IDs by setting env vars
- ADS-05 — GDPR consent module built with unified API, platform-branched implementation, web banner component, and consent-gated ad loading

## Requirements Validated

- none — ADS-04 and ADS-05 require real-device testing with configured AdMob account for full validation (deferred to S05 UAT)

## New Requirements Surfaced

- none

## Requirements Invalidated or Re-scoped

- none

## Deviations

None.

## Known Limitations

- UMP consent form presentation requires a configured AdMob account with GDPR messaging — cannot be tested without production AdMob setup
- `GdprConsentBanner` is built but not yet integrated into the app root layout — deferred to S05
- ATT + GDPR sequencing (GDPR first, then ATT) is documented but not yet wired as a combined flow — deferred to S05
- AdSlot sidebar variant still renders static placeholder (AdBanner has no sidebar format)
- Web ads remain as placeholders (no web ad SDK); consent module on web is ready but only meaningful when web ads are implemented

## Follow-ups

- Integrate `GdprConsentBanner` into app root layout (S05)
- Wire GDPR consent → ATT prompt sequencing (S05)
- Configure AdMob GDPR message in AdMob console (operational, pre-release)
- Real-device UMP consent form testing (S05 UAT)
- Set production `EXPO_PUBLIC_ADMOB_*` env vars in deployment config

## Files Created/Modified

- `src/features/ads/config.ts` — Added env-var resolution to getBannerAdUnitId(), exported test ID constants
- `src/features/ads/__tests__/config.test.ts` — 13 new tests for env-var resolution, fallback, constant validation
- `app.config.ts` — New function-based Expo config replacing app.json, with AdMob plugin
- `app.json` — Deleted (replaced by app.config.ts)
- `.env.example` — Added four EXPO_PUBLIC_ADMOB_* variables with comments
- `src/features/ads/consent.ts` — New unified consent API with platform-branched implementation
- `src/features/ads/__tests__/consent.test.ts` — 38 tests for consent lifecycle
- `src/features/ads/types/react-native-google-mobile-ads.d.ts` — Extended with AdsConsent API surface
- `src/features/ads/index.ts` — Added consent and GdprConsentBanner exports
- `src/features/ads/AdBanner.tsx` — Added consent check useEffect, dynamic requestNonPersonalizedAdsOnly
- `src/features/ads/__tests__/AdBanner.test.ts` — Extended with consent-gated personalization tests
- `src/features/ads/GdprConsentBanner.tsx` — New web consent banner with accept/decline
- `src/components/public/AdSlot.native.tsx` — Delegates mobile/leaderboard to AdBanner

## Forward Intelligence

### What the next slice should know
- `GdprConsentBanner` exists and is exported but NOT integrated into any layout yet — S05 needs to add it to the app root or public layout
- The GDPR→ATT sequencing recommendation exists in DECISIONS.md but is not implemented as a combined flow — S05 should wire `requestConsent()` completion to trigger ATT prompt
- All ad config is ready for production IDs — just set the four `EXPO_PUBLIC_ADMOB_*` env vars

### What's fragile
- The consent module's UMP SDK path is tested only via mocks (SDK not installed) — first real-device test may reveal API shape mismatches
- `app.config.ts` uses placeholder app ID patterns as fallback — EAS Build will succeed but ads won't load without real app IDs

### Authoritative diagnostics
- Call `getConsentStatus()` at runtime to inspect current consent state — returns typed status, never throws
- Check AsyncStorage key `@ads_consent_status` on web for persisted value
- `getBannerAdUnitId()` return value reveals whether production or test IDs are active
- `console.warn('[AdsConsent]')` messages surface consent resolution failures

### What assumptions changed
- No assumptions changed — all three tasks completed as planned with no blockers or deviations
