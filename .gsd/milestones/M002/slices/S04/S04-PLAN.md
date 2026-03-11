# S04: Production Ads + GDPR

**Goal:** Ad config reads production unit IDs from environment variables (falling back to test IDs), and EU users see a GDPR consent prompt before personalized ads load. Consent state persists and gates whether ads are personalized, non-personalized, or hidden.
**Demo:** Config tests prove env-var-based ID resolution with test-ID fallback. Consent module tests prove the full consent lifecycle (unknown → prompted → accepted/declined) with correct ad-gating behavior on both native (UMP SDK) and web (AsyncStorage). AdBanner test proves consent-gated ad loading. App compiles with zero TypeScript errors.

## Must-Haves

- `config.ts` reads `EXPO_PUBLIC_ADMOB_IOS_BANNER_ID` and `EXPO_PUBLIC_ADMOB_ANDROID_BANNER_ID` with test-ID fallback
- `app.json` → `app.config.ts` migration with `react-native-google-mobile-ads` plugin reading app IDs from env
- `.env.example` updated with all four `EXPO_PUBLIC_ADMOB_*` vars
- Type declarations extended with `AdsConsent`, `AdsConsentStatus`, `AdsConsentInfo` types
- `consent.ts` module with unified API: `getConsentStatus()`, `requestConsent()`, `canShowPersonalizedAds()`
- Native consent path uses `AdsConsent` (UMP SDK) via dynamic import
- Web consent path uses AsyncStorage for persistence
- `GdprConsentBanner` component for web with accept/decline
- `AdBanner` gates ad loading on consent status; uses `requestNonPersonalizedAdsOnly` based on consent
- `AdSlot.native.tsx` renders `AdBanner` (consent-gated) instead of static placeholder
- All existing tests pass + new tests for config env vars, consent lifecycle, consent-gated ad loading
- Zero TypeScript errors

## Proof Level

- This slice proves: contract + operational
- Real runtime required: no (all code uses dynamic imports with fallback; tested as pure functions)
- Human/UAT required: yes — UMP consent form presentation requires a configured AdMob account and device; deferred to S05

## Verification

- `npx jest src/features/ads/__tests__/config.test.ts` — env-var-based ID resolution, test-ID fallback
- `npx jest src/features/ads/__tests__/consent.test.ts` — full consent lifecycle (native UMP path, web AsyncStorage path, status mapping, persistence)
- `npx jest src/features/ads/__tests__/AdBanner.test.ts` — consent-gated ad loading logic
- `npx tsc --noEmit` — zero TypeScript errors
- `npx jest` — all 415+ tests pass with zero regressions

## Observability / Diagnostics

- Runtime signals: `console.warn('[AdBanner]')` on ad load failure (existing); `console.warn('[AdsConsent]')` on consent check failure (new)
- Inspection surfaces: `getConsentStatus()` returns current consent state at any time; AsyncStorage key `@ads_consent_status` inspectable on web
- Failure visibility: consent module returns typed status (`unknown`, `required`, `obtained`, `not_required`, `unavailable`) — never throws; AdBanner falls back to placeholder on any consent/SDK failure
- Redaction constraints: none — no secrets in ad config (unit IDs are public)

## Integration Closure

- Upstream surfaces consumed: `src/features/ads/config.ts`, `src/features/ads/AdBanner.tsx`, `src/features/ads/att.ts` (pattern reuse), `src/features/ads/types/react-native-google-mobile-ads.d.ts`, `src/components/public/AdSlot.native.tsx`, `app.json`
- New wiring introduced in this slice: `consent.ts` module consumed by `AdBanner`; `app.config.ts` replaces `app.json`; `AdSlot.native.tsx` delegates to `AdBanner`; `GdprConsentBanner` component available for layout integration
- What remains before the milestone is truly usable end-to-end: AdMob console GDPR message configuration (operational); production account approval (external); `GdprConsentBanner` integration into app root layout (S05 polish); real-device UMP form testing (S05 UAT)

## Tasks

- [x] **T01: Environment-driven ad config and app.config.ts migration** `est:45m`
  - Why: Production ads require env-based unit IDs (not hardcoded test IDs) and the Expo plugin needs app-level IDs at build time. `app.json` can't read env vars — must migrate to `app.config.ts`.
  - Files: `src/features/ads/config.ts`, `src/features/ads/__tests__/config.test.ts`, `app.json` → `app.config.ts`, `.env.example`
  - Do: (1) Update `config.ts` to read `EXPO_PUBLIC_ADMOB_IOS_BANNER_ID` / `EXPO_PUBLIC_ADMOB_ANDROID_BANNER_ID` from env vars, falling back to Google's test IDs. (2) Convert `app.json` to `app.config.ts` preserving all existing config, adding `react-native-google-mobile-ads` plugin with app IDs from `EXPO_PUBLIC_ADMOB_IOS_APP_ID` / `EXPO_PUBLIC_ADMOB_ANDROID_APP_ID`. (3) Add all four env vars to `.env.example`. (4) Add new config tests for env-var resolution and fallback behavior.
  - Verify: `npx jest src/features/ads/__tests__/config.test.ts` passes with new env-var tests; `npx tsc --noEmit` passes; existing tests unaffected
  - Done when: `getBannerAdUnitId()` returns env var value when set, test ID when not set; `app.config.ts` loads without error; `.env.example` has all ADMOB vars

- [x] **T02: GDPR consent module with type declarations and tests** `est:1h`
  - Why: Core consent logic — the unified API that gates ad personalization. Must handle native (UMP SDK) and web (AsyncStorage) paths with typed statuses, following the dynamic-import pattern from `att.ts`.
  - Files: `src/features/ads/consent.ts`, `src/features/ads/__tests__/consent.test.ts`, `src/features/ads/types/react-native-google-mobile-ads.d.ts`, `src/features/ads/index.ts`
  - Do: (1) Extend `.d.ts` with `AdsConsent` API surface (`requestInfoUpdate`, `loadAndShowConsentFormIfRequired`, `getConsentInfo`, `reset`), `AdsConsentStatus` enum, `AdsConsentInfo` type, and `AdsConsentDebugGeography`. (2) Create `consent.ts` with: `ConsentStatus` type (`unknown | required | obtained | not_required | unavailable`), `getConsentStatus()` (native: UMP via dynamic import, web: AsyncStorage read), `requestConsent()` (native: UMP gather flow, web: returns `required` to trigger banner), `canShowPersonalizedAds()` (boolean helper), `setWebConsentStatus()` (for web banner to call), `CONSENT_STORAGE_KEY` constant. (3) Write comprehensive tests covering: native UMP path mock, web AsyncStorage path mock, status mapping, fallback on unavailable SDK, `canShowPersonalizedAds` derivation. (4) Export from `index.ts`.
  - Verify: `npx jest src/features/ads/__tests__/consent.test.ts` passes; `npx tsc --noEmit` passes
  - Done when: `getConsentStatus()`, `requestConsent()`, `canShowPersonalizedAds()`, `setWebConsentStatus()` all tested with both platform paths; type declarations compile

- [x] **T03: Consent-gated AdBanner, GdprConsentBanner component, and AdSlot wiring** `est:1h`
  - Why: Closes the loop — AdBanner uses consent status to control ad personalization, web users get a consent banner, and native AdSlot renders real (consent-gated) ads instead of a placeholder.
  - Files: `src/features/ads/AdBanner.tsx`, `src/features/ads/__tests__/AdBanner.test.ts`, `src/features/ads/GdprConsentBanner.tsx`, `src/components/public/AdSlot.native.tsx`, `src/features/ads/index.ts`
  - Do: (1) Update `AdBanner` to check `getConsentStatus()` on mount and set `requestNonPersonalizedAdsOnly` based on `canShowPersonalizedAds()`. If consent is `unknown`/`required`, call `requestConsent()` to trigger the UMP flow on native. On web, remain as placeholder (no change). (2) Create `GdprConsentBanner` component: renders a bottom sheet/banner on web with "Accept" and "Decline" buttons; calls `setWebConsentStatus()` and dismisses; only renders when consent status is `unknown` or `required`. (3) Update `AdSlot.native.tsx` to import and render `AdBanner` with consent gating, mapping variant to AdBanner size prop. (4) Update AdBanner tests to cover consent-gated loading scenarios. (5) Export `GdprConsentBanner` from `index.ts`. (6) Run full test suite to verify zero regressions.
  - Verify: `npx jest src/features/ads/` passes all ad tests; `npx jest` passes full suite (415+); `npx tsc --noEmit` passes
  - Done when: AdBanner reads consent before loading ads; GdprConsentBanner component exists with accept/decline; AdSlot.native delegates to AdBanner; all tests pass with zero regressions

## Files Likely Touched

- `src/features/ads/config.ts`
- `src/features/ads/__tests__/config.test.ts`
- `src/features/ads/consent.ts` (new)
- `src/features/ads/__tests__/consent.test.ts` (new)
- `src/features/ads/AdBanner.tsx`
- `src/features/ads/__tests__/AdBanner.test.ts`
- `src/features/ads/GdprConsentBanner.tsx` (new)
- `src/features/ads/types/react-native-google-mobile-ads.d.ts`
- `src/features/ads/index.ts`
- `src/components/public/AdSlot.native.tsx`
- `app.json` → `app.config.ts`
- `.env.example`
