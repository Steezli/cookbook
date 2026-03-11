---
id: T01
parent: S04
milestone: M002
provides:
  - Environment-variable-based ad unit ID resolution with test-ID fallback
  - app.config.ts with react-native-google-mobile-ads Expo plugin
  - .env.example documentation for all four ADMOB env vars
key_files:
  - src/features/ads/config.ts
  - app.config.ts
  - .env.example
  - src/features/ads/__tests__/config.test.ts
key_decisions:
  - Exported test ID constants (TEST_BANNER_ID_IOS, TEST_BANNER_ID_ANDROID, TEST_BANNER_ID_WEB) for test reuse and clarity
  - Used placeholder app ID pattern (ca-app-pub-xxxxxxxxxxxxxxxx~yyyyyyyyyy) as fallback in app.config.ts instead of empty string to avoid build-time crashes
patterns_established:
  - Env-var-with-fallback pattern for ad config: process.env.EXPO_PUBLIC_* || TEST_CONSTANT
observability_surfaces:
  - none (config is compile-time/startup only; test-ID fallback is the observable failure mode)
duration: 15m
verification_result: passed
completed_at: 2026-03-11
blocker_discovered: false
---

# T01: Environment-driven ad config and app.config.ts migration

**`getBannerAdUnitId()` now reads production ad unit IDs from `EXPO_PUBLIC_ADMOB_*` env vars, falling back to Google test IDs; `app.json` replaced by `app.config.ts` with AdMob Expo plugin.**

## What Happened

1. Updated `config.ts` to read `EXPO_PUBLIC_ADMOB_IOS_BANNER_ID` and `EXPO_PUBLIC_ADMOB_ANDROID_BANNER_ID` from `process.env` with `||` fallback to exported test ID constants. Web always returns `'placeholder'` regardless of env vars.

2. Created `app.config.ts` as a function-based Expo config that preserves all existing fields from `app.json` and adds the `react-native-google-mobile-ads` plugin entry. The plugin reads `ios_app_id` from `EXPO_PUBLIC_ADMOB_IOS_APP_ID` and `android_app_id` from `EXPO_PUBLIC_ADMOB_ANDROID_APP_ID`, with placeholder pattern fallbacks.

3. Deleted `app.json` — `app.config.ts` is the sole Expo config now.

4. Added all four `EXPO_PUBLIC_ADMOB_*` env vars to `.env.example` with descriptive comments distinguishing app-level IDs (build-time plugin) from unit IDs (runtime).

5. Extended `config.test.ts` with 13 new tests: env-var resolution on iOS/Android, empty-string fallback, cross-platform isolation (Android env var ignored on iOS), web ignores all env vars, never-returns-undefined safety check, and test ID format validation.

## Verification

- `npx jest src/features/ads/__tests__/config.test.ts` — **50 tests pass** (37 existing + 13 new)
- `npx tsc --noEmit` — **zero TypeScript errors**
- `npx jest` — **425 tests pass**, 20 suites, zero failures
- `app.json` deleted, `app.config.ts` exists — confirmed via filesystem check

### Slice-level verification status (T01 is intermediate):
- ✅ `npx jest src/features/ads/__tests__/config.test.ts` — passes
- ⬜ `npx jest src/features/ads/__tests__/consent.test.ts` — not yet created (T02)
- ⬜ `npx jest src/features/ads/__tests__/AdBanner.test.ts` — not yet updated (T03)
- ✅ `npx tsc --noEmit` — passes
- ✅ `npx jest` — all 425 tests pass

## Diagnostics

Read `getBannerAdUnitId()` return value to check whether production or test IDs are active. Check `.env` or `.env.example` for expected variable names. Test-ID fallback is the observable "no production config" state — always safe, never crashes.

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `src/features/ads/config.ts` — Added env-var resolution to `getBannerAdUnitId()`, exported test ID constants
- `src/features/ads/__tests__/config.test.ts` — 13 new tests for env-var resolution, fallback, and constant validation
- `app.config.ts` — New function-based Expo config replacing `app.json`, with AdMob plugin
- `app.json` — Deleted (replaced by `app.config.ts`)
- `.env.example` — Added four `EXPO_PUBLIC_ADMOB_*` variables with comments
