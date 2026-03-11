---
id: S13
parent: M001
milestone: M001
provides:
  - Platform-branched ad banner component (AdMob native, placeholder web)
  - ATT permission prompt module for iOS ad tracking
  - Route-based ad placement logic (public screens only)
  - Ad configuration with centralized unit IDs and banner sizes
requires:
  - slice: S12
    provides: Rebuilt auth screens and public browsing foundation
affects: []
key_files:
  - src/features/ads/config.ts
  - src/features/ads/att.ts
  - src/features/ads/AdBanner.tsx
  - src/features/ads/useAdPlacement.ts
  - src/features/ads/index.ts
  - src/features/ads/types/expo-tracking-transparency.d.ts
  - src/features/ads/types/react-native-google-mobile-ads.d.ts
  - src/features/ads/__tests__/config.test.ts
  - src/features/ads/__tests__/att.test.ts
  - src/features/ads/__tests__/AdBanner.test.ts
  - src/features/ads/__tests__/useAdPlacement.test.ts
key_decisions:
  - Dynamic imports for native-only SDKs (AdMob, ATT) so web bundles are never polluted
  - Platform branching via runtime Platform.OS checks (not .native.tsx/.web.tsx file extensions) for single-test-environment compatibility
  - Route-pattern allowlist/denylist for ad placement (public-only, never auth screens)
  - Test ad unit IDs from Google documentation as defaults (must replace for production)
  - Type declarations for optional native modules to enable TypeScript compilation without installing packages
  - Graceful fallback to placeholder banner when AdMob SDK unavailable (Expo Go, dev builds)
patterns_established:
  - Optional native module pattern: type declarations + dynamic import() + catch fallback
  - Route-based feature gating via pattern matching on expo-router paths
  - Platform-branched components testable in single Node environment via Platform mock
observability_surfaces:
  - console.warn on ad load failure with error message
  - ATT status returns discriminated union (authorized/denied/restricted/undetermined/not-applicable/unavailable) — no hidden failure states
drill_down_paths: []
duration: ~30 minutes
verification_result: passed
completed_at: 2026-03-11
---

# S13: Advertising — AdMob banner integration on public screens, ATT permission prompt, platform-branched ad components

**Platform-branched ad banner component with AdMob native / placeholder web, iOS ATT permission prompt, and route-based ad placement restricted to public browsing screens**

## What Happened

Built the complete advertising module (`src/features/ads/`) from scratch with four core modules:

1. **config.ts** — Centralized ad configuration: platform detection (iOS/Android/web), banner size selection (320×50 mobile BANNER, 728×90 web LEADERBOARD), test ad unit IDs per platform, and route-based ad placement logic with public/private route pattern matching.

2. **att.ts** — App Tracking Transparency module for iOS. Wraps `expo-tracking-transparency` with platform guards (no-ops on Android/web), discriminated status types, and graceful fallback when the native module is unavailable. Uses dynamic `import()` to avoid bundling native modules on web.

3. **AdBanner.tsx** — Platform-branched ad banner React component. On web: renders a styled placeholder with dashed border and size label. On native: dynamically loads `react-native-google-mobile-ads` BannerAd; falls back to the same placeholder if the SDK is unavailable (common in Expo Go development).

4. **useAdPlacement.ts** — Hook and pure function for determining ad visibility. Evaluates the current route against public/private pattern lists. Ads only appear on `/public`, `/browse`, and `/discover` routes — never on auth, scan, family, recipe editing, collections, or settings screens.

Type declarations were added for both optional native modules (`expo-tracking-transparency`, `react-native-google-mobile-ads`) to enable TypeScript compilation without installing the packages.

## Verification

- **86 unit tests** across 4 test suites — all passing
  - `config.test.ts` (39 tests): platform detection, banner sizes, ad unit IDs, route-based ad placement with exhaustive public/private/non-public route coverage
  - `att.test.ts` (14 tests): ATT on Android/web (not-applicable), iOS with unavailable module (unavailable), status type completeness, export verification
  - `AdBanner.test.ts` (11 tests): platform branching for web/iOS/Android, banner size constants
  - `useAdPlacement.test.ts` (22 tests): evaluateAdPlacement for public, private, and non-public routes
- **TypeScript**: zero errors in ads module (verified via `tsc --noEmit`)
- **No regressions**: full test suite shows only pre-existing failures in scan-draft-service (unrelated to S13)

## Requirements Advanced

- ADS-01 — Ad banner component implemented with platform branching: 320×50 mobile (AdMob native), 728×90 web (placeholder). Dynamic SDK loading with graceful fallback.
- ADS-02 — Route-based ad placement logic implemented: ads only on /public, /browse, /discover routes. Exhaustive deny-list for auth/scan/family/edit/collections/settings screens.
- ADS-03 — ATT permission module implemented with iOS-only prompting, discriminated status types, and graceful degradation when module unavailable.

## Requirements Validated

- ADS-01 — 50 unit tests prove platform detection, size selection, ad unit ID mapping, and branching logic
- ADS-02 — 35+ route pattern tests prove ads appear only on public screens and never on authenticated screens
- ADS-03 — 14 tests prove ATT platform guards, unavailable-module handling, and status type coverage

## New Requirements Surfaced

- ADS-04 (candidate) — Production ad unit ID configuration: current implementation uses Google test IDs; production IDs must be configured before App Store submission (via environment variables or build-time config)
- ADS-05 (candidate) — Ad consent management for GDPR compliance: ATT covers iOS IDFA but EU users need additional consent UI for personalized ads

## Requirements Invalidated or Re-scoped

- none

## Deviations

- No deviations from plan. The plan was open-ended (empty tasks/files sections), so implementation was designed from requirements.

## Known Limitations

- **Test ad unit IDs only** — Google's test IDs are hardcoded; production IDs need to be injected before release
- **No actual native SDK installed** — `react-native-google-mobile-ads` and `expo-tracking-transparency` are type-declared but not in package.json; they get installed when building native apps (EAS Build)
- **AdBanner component not yet placed in routes** — the component and placement hook are ready but not yet wired into actual public route screens (those routes need to be created first)
- **Pre-existing test failures** — 2 tests in scan-draft-service.test.ts fail (steps format mismatch); unrelated to S13

## Follow-ups

- Install `react-native-google-mobile-ads` and `expo-tracking-transparency` as dependencies when building native development client
- Wire `<AdBanner />` into public browsing screen layouts using `useAdPlacement()` hook
- Add `NSUserTrackingUsageDescription` to `app.json` iOS config for ATT prompt text
- Configure production AdMob ad unit IDs via environment-based config
- Consider adding ad frequency capping and impression tracking

## Files Created/Modified

- `src/features/ads/config.ts` — Ad configuration: platform detection, banner sizes, route-based placement logic
- `src/features/ads/att.ts` — iOS App Tracking Transparency permission prompt wrapper
- `src/features/ads/AdBanner.tsx` — Platform-branched ad banner component (AdMob native, placeholder web)
- `src/features/ads/useAdPlacement.ts` — Route-based ad visibility hook and pure evaluator
- `src/features/ads/index.ts` — Public API barrel export
- `src/features/ads/types/expo-tracking-transparency.d.ts` — Type declarations for optional native ATT module
- `src/features/ads/types/react-native-google-mobile-ads.d.ts` — Type declarations for optional AdMob module
- `src/features/ads/__tests__/config.test.ts` — 39 tests for ad config and route placement
- `src/features/ads/__tests__/att.test.ts` — 14 tests for ATT module
- `src/features/ads/__tests__/AdBanner.test.ts` — 11 tests for banner platform branching
- `src/features/ads/__tests__/useAdPlacement.test.ts` — 22 tests for ad placement logic

## Forward Intelligence

### What the next slice should know
- The ads module is self-contained at `src/features/ads/` with a barrel export — import from `@/features/ads`
- AdBanner component gracefully degrades when native SDKs aren't available — safe to render in any environment
- The `shouldShowAds()` function and `evaluateAdPlacement()` are pure functions — easy to test downstream consumers

### What's fragile
- Route patterns in `config.ts` must be kept in sync with actual expo-router file structure — if public routes change paths, the ad placement patterns need updating
- Dynamic `import()` for native modules depends on the exact package names; if the packages are renamed or forked, imports break silently (caught by the fallback)

### Authoritative diagnostics
- `npx jest src/features/ads/` — 86 tests covering all ad module logic
- `console.warn('[AdBanner]')` in browser/device console indicates ad load failures with error details

### What assumptions changed
- Original assumption: public browsing routes exist at `/(public)/` — Actually no public route group exists yet; ad placement uses `/public`, `/browse`, `/discover` prefixes which will need to match the actual route structure when public browsing is implemented
