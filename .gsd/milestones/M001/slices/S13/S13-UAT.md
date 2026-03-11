# S13: Advertising — UAT

**Milestone:** M001
**Written:** 2026-03-11

## UAT Type

- UAT mode: artifact-driven
- Why this mode is sufficient: The advertising module is a self-contained feature layer with pure business logic (route matching, platform detection, size selection, ATT status mapping) that is fully verifiable through unit tests. The AdBanner component gracefully falls back to a placeholder when native SDKs aren't available, so visual rendering is consistent and predictable. Live-runtime verification would require native builds with AdMob SDK which is deferred to native development client setup.

## Preconditions

- Node.js and npm installed
- Project dependencies installed (`npm install`)
- Jest configured and working (`npx jest --passWithNoTests`)

## Smoke Test

Run `npx jest src/features/ads/` — all 86 tests should pass across 4 suites (config, att, AdBanner, useAdPlacement).

## Test Cases

### 1. Platform branching — banner sizes match spec

1. Run `npx jest src/features/ads/__tests__/config.test.ts --verbose`
2. Verify "getBannerSize" tests all pass
3. **Expected:** iOS/Android → 320×50 BANNER, Web → 728×90 LEADERBOARD

### 2. Platform branching — ad unit IDs per platform

1. Run `npx jest src/features/ads/__tests__/config.test.ts --verbose`
2. Verify "getBannerAdUnitId" tests all pass
3. **Expected:** iOS and Android return distinct `ca-app-pub-` test IDs, Web returns `placeholder`

### 3. Ad placement — public screens only

1. Run `npx jest src/features/ads/__tests__/config.test.ts --verbose`
2. Verify all "shouldShowAds" tests pass
3. **Expected:** Returns true for `/public/*`, `/browse/*`, `/discover/*`; returns false for `/(auth)/*`, `/(scan)/*`, `/(family)/*`, `/recipes/create`, `/settings`, `/collections`, and all other routes

### 4. ATT — iOS prompts, other platforms skip

1. Run `npx jest src/features/ads/__tests__/att.test.ts --verbose`
2. **Expected:** Android/web return `not-applicable` without calling tracking module; iOS with unavailable module returns `unavailable`; all status types are defined

### 5. Ad placement hook — evaluateAdPlacement

1. Run `npx jest src/features/ads/__tests__/useAdPlacement.test.ts --verbose`
2. **Expected:** Returns `{ showAds: true }` for public routes, `{ showAds: false }` for private and non-public routes

### 6. TypeScript compilation

1. Run `npx tsc --noEmit 2>&1 | grep "src/features/ads"`
2. **Expected:** No output (zero TypeScript errors in ads module)

## Edge Cases

### Empty route path

1. Call `shouldShowAds('')`
2. **Expected:** Returns false — no ads on empty/undefined routes

### Unknown platform

1. Mock `Platform.OS` as `'windows'`
2. Call `getAdPlatform()`
3. **Expected:** Returns `'web'` (safe fallback)

### ATT module unavailable on iOS

1. On iOS with no `expo-tracking-transparency` installed
2. Call `requestTrackingPermission()`
3. **Expected:** Returns `'unavailable'` (no crash, no unhandled rejection)

### Private route takes precedence

1. Call `shouldShowAds('/(auth)/login')` — explicitly private
2. **Expected:** Returns false even though route doesn't match public patterns

## Failure Signals

- Any of the 86 unit tests failing
- TypeScript errors in `src/features/ads/` files
- `shouldShowAds()` returning true for authenticated routes (security violation)
- ATT functions throwing instead of returning status values
- Import of `AdBanner` causing bundle errors on web (native module leak)

## Requirements Proved By This UAT

- ADS-01 — Ad banner component with correct sizes (320×50 mobile, 728×90 web) and platform branching (AdMob native, placeholder web). Proved by 11 AdBanner tests + 10 config size/platform tests.
- ADS-02 — Ad placement restricted to public browsing screens. Proved by 35+ route pattern tests covering public, private, and edge-case routes.
- ADS-03 — ATT permission prompt on iOS with graceful handling on other platforms. Proved by 14 ATT tests covering all platforms and module availability states.

## Not Proven By This UAT

- Actual AdMob ad rendering on native devices (requires native build with SDK installed)
- Real ATT prompt display on iOS device (requires native build + device testing)
- Visual appearance of AdBanner placeholder in running app (requires app launch)
- Ad impression tracking and revenue reporting
- GDPR consent management for EU users

## Notes for Tester

- The 2 pre-existing test failures in `scan-draft-service.test.ts` are unrelated to S13 and should be ignored for this UAT
- Test ad unit IDs are from Google's official documentation — they serve test ads only, never real ads
- The ads module is designed to be self-contained; it doesn't modify any existing files
- When native SDKs are eventually installed, the dynamic import fallback path will be replaced by actual SDK rendering — the same tests will still pass
