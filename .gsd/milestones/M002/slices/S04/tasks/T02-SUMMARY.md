---
id: T02
parent: S04
milestone: M002
provides:
  - Unified GDPR consent API (getConsentStatus, requestConsent, canShowPersonalizedAds, setWebConsentStatus)
  - AdsConsent type declarations covering UMP SDK surface (AdsConsentStatus, AdsConsentInfo, AdsConsentDebugGeography)
  - Platform-branched consent: native via UMP SDK dynamic import, web via AsyncStorage
  - ConsentStatus type and CONSENT_STORAGE_KEY constant exported from ads module
key_files:
  - src/features/ads/consent.ts
  - src/features/ads/__tests__/consent.test.ts
  - src/features/ads/types/react-native-google-mobile-ads.d.ts
  - src/features/ads/index.ts
key_decisions:
  - canShowPersonalizedAds takes status as parameter (pure function) rather than reading it internally, enabling test isolation and reuse without async
  - Web requestConsent() returns 'required' to signal UI to show banner rather than managing UI itself — keeps consent module as pure logic
  - UMP status enum values mapped via string switch rather than numeric comparison for clarity and robustness against SDK changes
  - Stored AsyncStorage values validated against allowlist set; invalid values return 'unknown' with warning
patterns_established:
  - Dynamic import with try/catch fallback to 'unavailable' status (mirrors att.ts pattern for AdsConsent)
  - Platform.OS === 'web' branching for web-specific AsyncStorage consent path
  - jest.mock with { virtual: true } for mocking uninstalled native module (react-native-google-mobile-ads)
  - Mutable nativeSdkAvailable flag + getter-based mock to simulate SDK presence/absence per test
observability_surfaces:
  - "console.warn('[AdsConsent]') on UMP SDK failure, unexpected status, storage errors"
  - "getConsentStatus() returns typed status at any time for runtime inspection"
  - "AsyncStorage key '@ads_consent_status' inspectable on web"
  - "'unavailable' = SDK not present; 'unknown' = no consent decision yet"
duration: 25m
verification_result: passed
completed_at: 2026-03-11
blocker_discovered: false
---

# T02: GDPR consent module with type declarations and tests

**Created unified consent API with full UMP SDK type declarations, platform-branched implementation (native UMP + web AsyncStorage), and 38 comprehensive tests.**

## What Happened

Extended `react-native-google-mobile-ads.d.ts` with the complete AdsConsent API surface: `AdsConsentStatus` enum (REQUIRED, NOT_REQUIRED, OBTAINED, UNKNOWN), `AdsConsentDebugGeography` enum (DISABLED, EEA, NOT_EEA), `AdsConsentInfo` interface (status, canRequestAds, isConsentFormAvailable), `AdsConsentInfoUpdateOptions`, and the `AdsConsent` namespace with all methods (requestInfoUpdate, loadAndShowConsentFormIfRequired, gatherConsent, getConsentInfo, getGdprApplies, getPurposeConsents, getUserChoices, reset). Types match the library's actual API shape from Context7 docs.

Created `consent.ts` with platform-branched implementation:
- **Native path**: `getConsentStatus()` calls `AdsConsent.requestInfoUpdate()` + `getConsentInfo()` via dynamic import, mapping UMP enum to unified `ConsentStatus`. `requestConsent()` calls `loadAndShowConsentFormIfRequired()`. Both fall back to `'unavailable'` on any error.
- **Web path**: `getConsentStatus()` reads from AsyncStorage with validation. `requestConsent()` returns `'required'` to signal the UI to show the custom banner. `setWebConsentStatus()` persists the user's decision.
- **Shared**: `canShowPersonalizedAds(status)` is a pure function returning true only for `'obtained'`.

Wrote 38 tests covering: all four UMP status mappings, unexpected status warning, Android native path, SDK unavailable fallback, SDK runtime errors, all AsyncStorage read scenarios (valid values, empty, null, invalid), web requestConsent behavior, setWebConsentStatus persistence, canShowPersonalizedAds for all five statuses, and type/constant validation.

Updated `index.ts` with all new exports.

## Verification

- `npx jest src/features/ads/__tests__/consent.test.ts` — **38/38 passed** (native UMP, web AsyncStorage, status mapping, edge cases)
- `npx jest src/features/ads/__tests__/config.test.ts` — **50/50 passed** (no regressions)
- `npx tsc --noEmit` — **zero TypeScript errors**
- `npx jest` — **463/463 passed**, zero regressions

### Slice-level verification status (T02 of 3):
- ✅ `npx jest src/features/ads/__tests__/config.test.ts` — 50 passed
- ✅ `npx jest src/features/ads/__tests__/consent.test.ts` — 38 passed
- ⏳ `npx jest src/features/ads/__tests__/AdBanner.test.ts` — not yet updated (T03)
- ✅ `npx tsc --noEmit` — zero errors
- ✅ `npx jest` — 463 passed, zero regressions

## Diagnostics

- Call `getConsentStatus()` to inspect current consent state at runtime
- On web, read AsyncStorage key `@ads_consent_status` to see persisted value
- `'unavailable'` status indicates the UMP SDK is not present (web, Expo Go, or missing native module)
- `'unknown'` indicates no consent decision has been made yet
- `console.warn('[AdsConsent]')` messages appear on: SDK import failure, unexpected UMP status values, AsyncStorage read/write failures, invalid stored values

## Deviations

- Added `gatherConsent()`, `getGdprApplies()`, `getPurposeConsents()`, `getUserChoices()`, and `AdsConsentInfoUpdateOptions` to the type declarations beyond what was in the plan — these are used in the library's documented examples and needed for complete type coverage. The consent.ts module itself only uses the methods specified in the plan.

## Known Issues

None.

## Files Created/Modified

- `src/features/ads/types/react-native-google-mobile-ads.d.ts` — Extended with AdsConsent namespace, AdsConsentStatus/AdsConsentDebugGeography enums, AdsConsentInfo/AdsConsentInfoUpdateOptions interfaces
- `src/features/ads/consent.ts` — New unified consent API module with platform-branched implementation
- `src/features/ads/__tests__/consent.test.ts` — New comprehensive test suite (38 tests)
- `src/features/ads/index.ts` — Added consent module exports (getConsentStatus, requestConsent, canShowPersonalizedAds, setWebConsentStatus, CONSENT_STORAGE_KEY, ConsentStatus)
