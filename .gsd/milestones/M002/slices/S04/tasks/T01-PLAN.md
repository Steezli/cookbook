---
estimated_steps: 5
estimated_files: 5
---

# T01: Environment-driven ad config and app.config.ts migration

**Slice:** S04 — Production Ads + GDPR
**Milestone:** M002

## Description

Replace hardcoded test ad unit IDs in `config.ts` with environment-variable-based resolution (`EXPO_PUBLIC_ADMOB_IOS_BANNER_ID`, `EXPO_PUBLIC_ADMOB_ANDROID_BANNER_ID`) that falls back to Google's test IDs when env vars are absent. Migrate `app.json` to `app.config.ts` so the `react-native-google-mobile-ads` Expo plugin can read app-level IDs from `EXPO_PUBLIC_ADMOB_IOS_APP_ID` / `EXPO_PUBLIC_ADMOB_ANDROID_APP_ID` at build time. Update `.env.example` with all four new variables.

## Steps

1. Update `config.ts`: change `getBannerAdUnitId()` to read `process.env.EXPO_PUBLIC_ADMOB_IOS_BANNER_ID` (ios) and `process.env.EXPO_PUBLIC_ADMOB_ANDROID_BANNER_ID` (android) with existing test IDs as fallback defaults. Extract test IDs into named constants for clarity.
2. Convert `app.json` to `app.config.ts`: export an `ExpoConfig` object preserving all existing fields. Add the `react-native-google-mobile-ads` plugin entry reading `ios_app_id` from `process.env.EXPO_PUBLIC_ADMOB_IOS_APP_ID` and `android_app_id` from `process.env.EXPO_PUBLIC_ADMOB_ANDROID_APP_ID`, with placeholder/empty fallbacks that don't crash.
3. Delete `app.json` (replaced by `app.config.ts`).
4. Add `EXPO_PUBLIC_ADMOB_IOS_APP_ID`, `EXPO_PUBLIC_ADMOB_ANDROID_APP_ID`, `EXPO_PUBLIC_ADMOB_IOS_BANNER_ID`, `EXPO_PUBLIC_ADMOB_ANDROID_BANNER_ID` to `.env.example` with descriptive comments.
5. Add tests to `config.test.ts`: test that `getBannerAdUnitId()` returns env var value when set (using `process.env` manipulation), returns test ID when env var is absent, and never returns undefined/empty.

## Must-Haves

- [ ] `getBannerAdUnitId()` reads env vars on ios/android, falls back to test IDs
- [ ] `app.config.ts` replaces `app.json` with identical config plus AdMob plugin
- [ ] `.env.example` documents all four ADMOB env vars
- [ ] New tests cover env-var resolution and fallback
- [ ] `app.json` is deleted (not both files present)
- [ ] All existing config tests still pass

## Verification

- `npx jest src/features/ads/__tests__/config.test.ts` — all tests pass including new env-var tests
- `npx tsc --noEmit` — zero TypeScript errors
- `npx jest` — full suite passes (no regressions from app.config.ts migration)

## Observability Impact

- Signals added/changed: None (config is compile-time/startup only)
- How a future agent inspects this: read `getBannerAdUnitId()` return value; check `.env` or `.env.example` for expected var names
- Failure state exposed: test-ID fallback is the failure mode — always safe, never crashes

## Inputs

- `src/features/ads/config.ts` — current hardcoded test IDs to replace
- `src/features/ads/__tests__/config.test.ts` — existing tests to preserve and extend
- `app.json` — current Expo config to migrate
- `.env.example` — current env var documentation
- S04-RESEARCH.md — constraint that `app.config.ts` reads `process.env` at EAS Build time

## Expected Output

- `src/features/ads/config.ts` — env-var-based `getBannerAdUnitId()` with test-ID fallback
- `src/features/ads/__tests__/config.test.ts` — extended with env-var resolution tests
- `app.config.ts` — new Expo config with AdMob plugin
- `.env.example` — updated with ADMOB env vars
- `app.json` — deleted
