---
estimated_steps: 4
estimated_files: 4
---

# T02: GDPR consent module with type declarations and tests

**Slice:** S04 — Production Ads + GDPR
**Milestone:** M002

## Description

Create the GDPR consent module (`consent.ts`) that provides a unified API for consent lifecycle management across native (Google UMP SDK) and web (AsyncStorage). Extend the `react-native-google-mobile-ads` type declarations with `AdsConsent` API surface. Write comprehensive tests covering both platform paths, status mapping, persistence, and fallback behavior. This module is the core logic that T03 will wire into AdBanner and the consent banner component.

## Steps

1. Extend `src/features/ads/types/react-native-google-mobile-ads.d.ts` with: `AdsConsentStatus` enum (`REQUIRED`, `NOT_REQUIRED`, `OBTAINED`, `UNKNOWN`), `AdsConsentInfo` interface (`status`, `canRequestAds`, `isConsentFormAvailable`), `AdsConsentDebugGeography` enum, and `AdsConsent` namespace with `requestInfoUpdate()`, `loadAndShowConsentFormIfRequired()`, `getConsentInfo()`, `reset()` methods. Follow the library's actual API shape from the research sources.
2. Create `src/features/ads/consent.ts` with: `ConsentStatus` type (`'unknown' | 'required' | 'obtained' | 'not_required' | 'unavailable'`), `CONSENT_STORAGE_KEY` constant (`'@ads_consent_status'`), platform-branched implementation: (a) on native — `getConsentStatus()` calls `AdsConsent.requestInfoUpdate()` + `AdsConsent.getConsentInfo()` via dynamic import with try/catch returning `'unavailable'` on failure; `requestConsent()` calls `AdsConsent.loadAndShowConsentFormIfRequired()` returning updated status; (b) on web — `getConsentStatus()` reads from AsyncStorage; `requestConsent()` returns `'required'` (signals UI to show banner). Shared: `canShowPersonalizedAds()` returns true only when status is `'obtained'`; `setWebConsentStatus(status)` writes to AsyncStorage (called by GdprConsentBanner in T03).
3. Write `src/features/ads/__tests__/consent.test.ts` with test groups: (a) native platform — mock dynamic import of `AdsConsent`, test `getConsentStatus()` maps UMP statuses correctly, test `requestConsent()` calls UMP flow, test fallback to `'unavailable'` when SDK absent; (b) web platform — mock AsyncStorage, test `getConsentStatus()` reads storage, test `setWebConsentStatus()` writes storage, test `requestConsent()` returns `'required'`; (c) `canShowPersonalizedAds()` — returns true for `'obtained'`, false for all other statuses; (d) edge cases — empty/null storage returns `'unknown'`, invalid storage value returns `'unknown'`.
4. Export `getConsentStatus`, `requestConsent`, `canShowPersonalizedAds`, `setWebConsentStatus`, `ConsentStatus`, and `CONSENT_STORAGE_KEY` from `src/features/ads/index.ts`.

## Must-Haves

- [ ] Type declarations compile and cover `AdsConsent`, `AdsConsentStatus`, `AdsConsentInfo`, `AdsConsentDebugGeography`
- [ ] `getConsentStatus()` works on native (UMP) and web (AsyncStorage) paths
- [ ] `requestConsent()` triggers UMP on native, returns `'required'` on web
- [ ] `canShowPersonalizedAds()` returns boolean based on consent status
- [ ] `setWebConsentStatus()` persists to AsyncStorage
- [ ] Fallback to `'unavailable'` when UMP SDK is not available (dynamic import fails)
- [ ] All consent tests pass
- [ ] Exported from `index.ts`

## Verification

- `npx jest src/features/ads/__tests__/consent.test.ts` — all consent lifecycle tests pass
- `npx tsc --noEmit` — zero TypeScript errors (type declarations valid)
- `npx jest` — full suite passes (no regressions)

## Observability Impact

- Signals added/changed: `console.warn('[AdsConsent]')` on UMP SDK failure or unexpected status
- How a future agent inspects this: call `getConsentStatus()` to see current state; read AsyncStorage key `@ads_consent_status` on web
- Failure state exposed: `'unavailable'` status indicates SDK not present; `'unknown'` indicates no consent decision yet

## Inputs

- `src/features/ads/att.ts` — dynamic import pattern to replicate for `AdsConsent`
- `src/features/ads/types/react-native-google-mobile-ads.d.ts` — existing type stubs to extend
- `src/features/ads/config.ts` — `getAdPlatform()` for platform branching
- S04-RESEARCH.md — UMP API shape from Context7 docs, AsyncStorage key naming, consent flow order (GDPR before ATT)

## Expected Output

- `src/features/ads/types/react-native-google-mobile-ads.d.ts` — extended with AdsConsent types
- `src/features/ads/consent.ts` — unified consent API module
- `src/features/ads/__tests__/consent.test.ts` — comprehensive consent lifecycle tests
- `src/features/ads/index.ts` — updated exports
