# S04: Production Ads + GDPR — UAT

**Milestone:** M002
**Written:** 2026-03-11

## UAT Type

- UAT mode: artifact-driven
- Why this mode is sufficient: All deliverables are pure logic modules (config resolution, consent state machine, consent-gated rendering) testable as unit tests. UMP consent form presentation and real ad loading require a configured AdMob account and physical device — deferred to S05 UAT. 110 tests across 3 test suites prove contract and operational behavior.

## Preconditions

- Node.js and project dependencies installed (`npm install`)
- No running servers or env vars required — all tests use mocks

## Smoke Test

Run `npx jest src/features/ads/ --no-coverage` — all 110 tests across 5 suites should pass with zero failures.

## Test Cases

### 1. Environment-variable-based ad config resolution

1. Run `npx jest src/features/ads/__tests__/config.test.ts --no-coverage`
2. **Expected:** 50 tests pass, including:
   - `getBannerAdUnitId()` returns env var value when `EXPO_PUBLIC_ADMOB_IOS_BANNER_ID` is set (iOS)
   - `getBannerAdUnitId()` returns env var value when `EXPO_PUBLIC_ADMOB_ANDROID_BANNER_ID` is set (Android)
   - Falls back to test ID when env var is empty string
   - Cross-platform isolation (Android env var ignored on iOS and vice versa)
   - Web always returns `'placeholder'` regardless of env vars
   - Never returns undefined for any platform

### 2. GDPR consent lifecycle — native UMP path

1. Run `npx jest src/features/ads/__tests__/consent.test.ts --no-coverage`
2. **Expected:** 38 tests pass, including:
   - `getConsentStatus()` maps UMP REQUIRED → `'required'`, NOT_REQUIRED → `'not_required'`, OBTAINED → `'obtained'`, UNKNOWN → `'unknown'`
   - `getConsentStatus()` returns `'unavailable'` when SDK is not present
   - `requestConsent()` calls UMP `loadAndShowConsentFormIfRequired` and returns mapped status
   - Unexpected UMP status values log warning and return `'unknown'`

### 3. GDPR consent lifecycle — web AsyncStorage path

1. Run `npx jest src/features/ads/__tests__/consent.test.ts --no-coverage`
2. **Expected:** Tests include:
   - `getConsentStatus()` reads from AsyncStorage key `@ads_consent_status`
   - Returns `'unknown'` for null/empty/invalid stored values
   - `setWebConsentStatus()` persists valid values to AsyncStorage
   - `requestConsent()` on web returns `'required'` (signals banner to show)

### 4. Consent-gated ad personalization

1. Run `npx jest src/features/ads/__tests__/AdBanner.test.ts --no-coverage`
2. **Expected:** 22 tests pass, including:
   - Consent `'obtained'` → `requestNonPersonalizedAdsOnly: false` (personalized ads)
   - Consent `'not_required'` → `requestNonPersonalizedAdsOnly: true`
   - Consent `'unavailable'` → `requestNonPersonalizedAdsOnly: true` (safe default)
   - Consent `'unknown'` → `requestNonPersonalizedAdsOnly: true`
   - Consent `'required'` → `requestNonPersonalizedAdsOnly: true`

### 5. TypeScript compilation

1. Run `npx tsc --noEmit`
2. **Expected:** Zero errors. All new types (AdsConsent, AdsConsentStatus, ConsentStatus, GdprConsentBannerProps) compile cleanly.

### 6. Full regression check

1. Run `npx jest --no-coverage`
2. **Expected:** 474+ tests pass across 21+ suites with zero failures. No regressions from S01–S03 work.

## Edge Cases

### SDK unavailable fallback

1. consent.test.ts verifies: when dynamic import of `react-native-google-mobile-ads` fails, `getConsentStatus()` returns `'unavailable'` (not throw)
2. **Expected:** Graceful degradation — ads fall back to non-personalized mode

### Invalid AsyncStorage value

1. consent.test.ts verifies: when AsyncStorage contains an unexpected string value
2. **Expected:** Returns `'unknown'` with console warning, does not crash

### Empty env var treated as unset

1. config.test.ts verifies: `EXPO_PUBLIC_ADMOB_IOS_BANNER_ID = ''` falls back to test ID
2. **Expected:** Empty string is treated same as undefined — test ID returned

## Failure Signals

- Any test failure in `src/features/ads/` indicates broken consent logic or config resolution
- TypeScript errors in `src/features/ads/types/` indicate type declaration drift from SDK API
- `console.warn('[AdsConsent]')` in production logs indicates consent resolution failures
- `requestNonPersonalizedAdsOnly` always `true` even after consent could indicate broken `canShowPersonalizedAds()`

## Requirements Proved By This UAT

- ADS-04 — Config reads production unit IDs from env vars with test-ID fallback; proven by 13 config tests covering resolution, fallback, cross-platform isolation
- ADS-05 — GDPR consent module with unified API, platform branching, web banner, and consent-gated ad loading; proven by 38 consent tests + 11 consent-gated AdBanner tests

## Not Proven By This UAT

- UMP consent form actually renders on a real device (requires configured AdMob account with GDPR messaging)
- Production ad IDs actually load ads (requires AdMob production approval)
- GdprConsentBanner renders correctly in the app layout (not yet integrated — S05)
- ATT + GDPR combined flow sequencing (documented but not wired — S05)
- Real EU geolocation triggering UMP consent requirement (operational)

## Notes for Tester

- All testing is artifact-driven — no running app needed
- The UMP SDK is not installed as a native dependency; all native paths are tested via mocks with `{ virtual: true }`
- `GdprConsentBanner` exists as a standalone component but is NOT in any layout yet — visual QA deferred to S05
- To manually verify config fallback: check that `getBannerAdUnitId()` returns test IDs when no env vars are set, and production IDs when they are
