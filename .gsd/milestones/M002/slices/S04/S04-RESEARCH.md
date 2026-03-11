# S04: Production Ads + GDPR — Research

**Date:** 2026-03-11

## Summary

This slice replaces hardcoded test ad unit IDs with environment-driven production IDs and adds GDPR consent gating for EU users. The existing ads module (`src/features/ads/`) is well-structured with clean platform branching, dynamic imports for native SDKs, and comprehensive test coverage (config, placement, ATT, banner). The main work is: (1) make `config.ts` read unit IDs from `EXPO_PUBLIC_*` env vars with test-ID fallback, (2) add the AdMob Expo plugin with production app IDs in `app.json`, (3) build a consent module that wraps the `AdsConsent` UMP SDK on native and provides a custom GDPR banner on web, (4) gate ad loading on consent status, and (5) persist consent via AsyncStorage.

The `react-native-google-mobile-ads` library provides `AdsConsent` (Google UMP SDK) which handles the full GDPR consent flow on native — form presentation, status persistence, and `canRequestAds` gating. On web, UMP is not available, so we need a lightweight custom consent banner that persists to AsyncStorage and controls the `requestNonPersonalizedAdsOnly` flag (or hides ads entirely if consent is declined).

Two parallel concerns exist: the public-screen `AdSlot` placeholder components (`src/components/public/AdSlot.{web,native}.tsx`) that are consumed by the public screens, and the `AdBanner` component in `src/features/ads/` that does the actual AdMob rendering. This slice should wire `AdSlot` to delegate to `AdBanner` on native (with consent gating), while keeping the web placeholder until a web ad solution arrives.

## Recommendation

**Approach:** Environment-driven config + native UMP consent + web custom consent banner.

1. **Production ad config via env vars** — Add `EXPO_PUBLIC_ADMOB_IOS_BANNER_ID` and `EXPO_PUBLIC_ADMOB_ANDROID_BANNER_ID` to `.env.example` and read in `config.ts`. Fall back to Google's test IDs when env vars are absent (safe dev default). Add the `react-native-google-mobile-ads` Expo plugin to `app.json` with production app IDs (the *app-level* IDs, not unit IDs) also sourced from `EXPO_PUBLIC_*` env vars.

2. **GDPR consent module** — Create `src/features/ads/consent.ts` with:
   - On native: wrap `AdsConsent.gatherConsent()` / `AdsConsent.requestInfoUpdate()` from UMP SDK (dynamic import)
   - On web: read/write consent state from AsyncStorage with a custom banner component
   - Expose `getConsentStatus()`, `requestConsent()`, `canShowPersonalizedAds()` as a unified API
   - Persist consent state key in AsyncStorage for web; UMP handles persistence on native

3. **Consent-gated ad loading** — Update `AdBanner` to check consent before loading ads. If consent is denied/undetermined, either show non-personalized ads or show nothing (configurable). Update `requestNonPersonalizedAdsOnly` based on consent status instead of hardcoding `true`.

4. **Wire AdSlot → AdBanner on native** — Update `AdSlot.native.tsx` to render `AdBanner` (consent-gated) instead of a static placeholder. Web remains a placeholder until a web ad integration is built.

5. **GDPR consent banner component** — `GdprConsentBanner` renders on web/native on first visit for applicable users. On native, it triggers the UMP form. On web, it shows a custom bottom banner with accept/decline.

## Don't Hand-Roll

| Problem | Existing Solution | Why Use It |
|---------|------------------|------------|
| Native GDPR consent form + status | `AdsConsent` from `react-native-google-mobile-ads` (UMP SDK) | Google's official consent framework; handles form presentation, status persistence, TCF v2 string, and `canRequestAds` gating. Required for AdMob compliance. |
| Consent state persistence (web) | `@react-native-async-storage/async-storage` (already installed) | Already used by Supabase auth. Cross-platform KV store. |
| ATT prompt (iOS) | `expo-tracking-transparency` via existing `att.ts` | Already implemented and tested in S13. |
| Platform detection / branching | Existing `getAdPlatform()` in `config.ts` | Tested, consistent pattern. |

## Existing Code and Patterns

- `src/features/ads/config.ts` — Centralizes ad unit IDs, banner sizes, platform detection, and public route checking. Currently hardcodes Google test unit IDs. **Modify** to read from `EXPO_PUBLIC_*` env vars with test-ID fallback.
- `src/features/ads/AdBanner.tsx` — Platform-branched banner: dynamic-imports AdMob on native, placeholder on web. Currently hardcodes `requestNonPersonalizedAdsOnly: true`. **Modify** to gate on consent status.
- `src/features/ads/att.ts` — ATT module with dynamic import pattern. **Reuse this pattern** for `AdsConsent` dynamic imports.
- `src/features/ads/useAdPlacement.ts` — Route-based ad visibility hook. **No changes needed** — placement logic is independent of consent.
- `src/components/public/AdSlot.{native,web}.tsx` — Static placeholder components used in public screens. **Modify native** to render real `AdBanner` when SDK available; keep web as placeholder.
- `src/features/ads/types/react-native-google-mobile-ads.d.ts` — Type declarations for the uninstalled native module. **Extend** with `AdsConsent`, `AdsConsentStatus`, `AdsConsentDebugGeography`, `AdsConsentInfo` types.
- `app.json` — Expo config. **Add** `react-native-google-mobile-ads` plugin with production app IDs.
- `.env.example` — **Add** `EXPO_PUBLIC_ADMOB_IOS_APP_ID`, `EXPO_PUBLIC_ADMOB_ANDROID_APP_ID`, `EXPO_PUBLIC_ADMOB_IOS_BANNER_ID`, `EXPO_PUBLIC_ADMOB_ANDROID_BANNER_ID`.

## Constraints

- **No native module at dev time** — `react-native-google-mobile-ads` requires an EAS Build / dev build. All code must compile and test without the package installed. Use dynamic `import()` with try/catch (established pattern).
- **Type declarations only** — The `.d.ts` files serve as the compile-time contract. Must extend them for `AdsConsent` API surface.
- **AsyncStorage already available** — `@react-native-async-storage/async-storage@2.2.0` is installed (used by Supabase). Safe to use for web consent persistence.
- **Web has no real ads** — `react-native-google-mobile-ads` is native-only. Web consent banner is a UX-only concern (shows intent, stores preference) until web ad integration is built.
- **Expo plugin config is build-time** — The `react-native-google-mobile-ads` Expo plugin reads app IDs from `app.json` at build time, not runtime. App IDs can't be dynamically switched via env vars in the plugin config — they're baked into the native binary. However, `app.config.ts` can read `process.env` at build time (EAS Build passes env vars).
- **Public route patterns are the ad surface** — Ads only appear on `PUBLIC_ROUTE_PATTERNS` routes (decision from S13). Consent applies globally but ads render only on these routes.
- **Test environment** — Tests run in Node.js with jest. All new consent logic must be testable as pure functions without React rendering.

## Common Pitfalls

- **Hardcoding production app IDs in app.json** — App IDs in the Expo plugin config are compiled into the native binary. Use `app.config.ts` (JS config) to read from `process.env` at EAS Build time, so dev/staging/prod can use different IDs. Document that `app.json` alone won't work for env-based switching.
- **Forgetting test-ID fallback** — If `EXPO_PUBLIC_ADMOB_*` env vars are not set, the app must still compile and show test ads (or placeholders). Never crash or show blank slots because production IDs aren't configured yet.
- **UMP SDK only works on native** — `AdsConsent` from `react-native-google-mobile-ads` throws on web. The consent module must platform-branch: UMP on native, AsyncStorage-based custom flow on web. Follow the dynamic import pattern from `att.ts`.
- **Double consent prompts** — ATT (iOS) and GDPR (UMP) are separate. The recommended flow (per library docs) is: gather GDPR consent first, then check if ATT should be prompted based on GDPR purpose-one consent. Don't prompt both independently.
- **Consent state on fresh install** — UMP SDK resets on app reinstall. Web AsyncStorage persists in the browser. The consent module should handle "unknown" state gracefully (treat as "needs consent").
- **AdMob test mode vs production** — Google serves test ads when the device is registered as a test device OR when test unit IDs are used. Production unit IDs with test device registration is the correct interim state (shows test ads safely with production config).

## Open Risks

- **AdMob production account approval** — Google reviews ad implementations before enabling live ads. The app may have production IDs configured but still show test ads until approval. This is an acceptable interim state per the roadmap.
- **UMP form availability** — `AdsConsent.requestInfoUpdate()` may report `isConsentFormAvailable: false` if no GDPR message is configured in the AdMob console. Need to configure the GDPR message in AdMob dashboard before consent flow works end-to-end.
- **Web consent compliance** — The custom web consent banner is a UX placeholder. For full GDPR compliance on a production web property, a proper Consent Management Platform (CMP) may be needed. Acceptable for MVP since web ads aren't live yet.
- **app.config.ts migration** — Converting from `app.json` to `app.config.ts` to support env-var-based app IDs is a minor but necessary step. Must verify Expo Router and all other plugins still work after the conversion.

## Skills Discovered

| Technology | Skill | Status |
|------------|-------|--------|
| react-native-google-mobile-ads | — | none found |
| GDPR consent | `wshobson/agents@gdpr-data-handling` (2.9K installs) | available — general GDPR data handling, not specific to AdMob UMP. Tangential. |
| GDPR consent | `borghei/claude-skills@gdpr-dsgvo-expert` (40 installs) | available — GDPR/DSGVO expert. Tangential. |
| Expo | `expo/skills@building-native-ui` (16.7K installs) | available — general Expo UI building. Not directly relevant to ad config. |

No skills are directly relevant to the core work (AdMob production config + UMP consent integration). The established codebase patterns (dynamic imports, `.d.ts` type stubs, platform branching) are sufficient.

## Sources

- `react-native-google-mobile-ads` GDPR / European User Consent docs (source: [Context7 — invertase/react-native-google-mobile-ads](https://github.com/invertase/react-native-google-mobile-ads/blob/main/docs/european-user-consent.mdx))
- `react-native-google-mobile-ads` Expo plugin config (source: [Context7 — invertase/react-native-google-mobile-ads](https://github.com/invertase/react-native-google-mobile-ads/blob/main/docs/index.mdx))
- `react-native-google-mobile-ads` v5 migration — AdsConsent API changes (source: [Context7 — invertase/react-native-google-mobile-ads](https://github.com/invertase/react-native-google-mobile-ads/blob/main/docs/migrating-to-v5.mdx))
