# M006: Subscriptions — Research

**Date:** 2026-03-17

## Summary

RevenueCat is the correct choice for subscription management across iOS, Android, and web. It handles StoreKit, Google Play Billing, receipt validation, cross-platform entitlement sync, and promotional grant management — exactly the spread this app needs. The `react-native-purchases` SDK is native-only (same as AdMob), so the existing dynamic-import + try/catch fallback pattern from `AdBanner.tsx` is the established model to follow. Web billing uses a completely separate package (`@revenuecat/purchases-js`) with its own initialization and checkout API. The Supabase user ID is the natural `appUserID` for RevenueCat since it's already stable across all three platforms.

The subscription system has two distinct concerns that should be sliced independently: (1) RevenueCat SDK integration + entitlement checking (the native/web infrastructure layer), and (2) scan gating + count tracking (the Supabase-backed business logic layer). Scan count tracking must be server-side to prevent client manipulation — this requires a new migration (`user_scan_counts` table with a `month` column + atomic RPC). The gating logic belongs in `createMultiPhotoScanJob` (the single entry point for all scan jobs), not in the UI layer, so it can't be bypassed.

Ad suppression for subscribers is straightforward: `AdBanner` already has a dynamic-import pattern and reads consent status at mount — the same pattern works for a subscriber check. The key implementation risk is RevenueCat's SDK requiring EAS builds (not Expo Go), which is the same constraint as AdMob and already understood by the project. Development/testing must happen on EAS dev builds or TestFlight for real purchase flows.

## Recommendation

Slice order should be: (S01) Supabase scan count infrastructure → (S02) RevenueCat SDK integration + subscription context → (S03) Scan gating + paywall → (S04) Ad suppression + web billing → (S05) Setup guides + promotional entitlement docs. Prove the server-side count logic first (testable in Jest), then layer in RevenueCat, then wire the UI gates.

## Don't Hand-Roll

| Problem | Existing Solution | Why Use It |
|---------|------------------|------------|
| In-app purchase receipts, StoreKit 2 vs 1, cross-device entitlement sync | RevenueCat (`react-native-purchases`) | Handles all three stores plus receipt validation, promotional grants, and entitlement sync. Building this manually requires implementing StoreKit, Google Play Billing, server-side receipt validation, and webhook sync |
| Paywall UI (price display, subscription terms, purchase button) | `RevenueCatUI.presentPaywallIfNeeded()` | Apple review requires specific paywall elements. Built-in UI is pre-approved. Custom UI risks App Store rejection for incomplete subscription terms display |
| Web subscription checkout | `@revenuecat/purchases-js` + RevenueCat Web Billing | Handles Stripe integration, checkout session, and entitlement sync back to RevenueCat. Custom Stripe integration would need separate webhook sync with RevenueCat to keep entitlements consistent cross-platform |
| Entitlement caching between app sessions | RevenueCat SDK | SDK caches customer info locally and handles refresh automatically. Manual caching would need to handle stale data, offline scenarios, and token refresh |

## Existing Code and Patterns

- `src/features/ads/AdBanner.tsx` — **primary pattern to follow** for RevenueCat native SDK loading. Dynamic `import('react-native-purchases')` in a `useEffect` with try/catch fallback; `sdkAvailable` boolean state gates the real SDK vs placeholder path. RevenueCat's `useSubscription` hook should follow the same structure.
- `src/features/ads/config.ts` — env var pattern for API keys (`process.env.EXPO_PUBLIC_*`). RevenueCat iOS/Android API keys follow the same shape.
- `src/features/ads/types/react-native-google-mobile-ads.d.ts` — **type declaration pattern** for native-only packages. A `react-native-purchases.d.ts` file with minimal type declarations enables TypeScript in local dev without installing the native package.
- `app.config.ts` — `fs.existsSync(path.join(__dirname, 'node_modules', 'react-native-purchases'))` guard for Expo plugin. Same pattern required for RevenueCat plugin.
- `src/features/scan/scan-service.ts` `createMultiPhotoScanJob()` — **gate insertion point**. Before the `supabase.from('scan_jobs').insert(...)`, check entitlement and scan count. Throw a typed `ScanLimitError` to distinguish "limit reached" from other errors.
- `src/features/scan/scan-upload.ts` `uploadScanPhotosWithValidation()` — currently delegates to `createMultiPhotoScanJob` after uploading photos. The gate check should be in the service layer (before the insert), not the upload layer, so photos aren't uploaded if the user is over limit.
- `app/(tabs)/scan/index.tsx` — scan upload screen. Needs to (a) display remaining scan count for free users, and (b) catch `ScanLimitError` and show paywall. Also the natural place to initialize RevenueCat if not already initialized.
- `src/features/auth/session.ts` — Supabase session provider. The RevenueCat `configure()` call with `appUserID: session.user.id` should happen at auth session establish time (same place the app currently sets up the Supabase client).
- `supabase/migrations/` — migration naming pattern: `20260317000000_add_scan_counts.sql`. The scan count tracking needs: `user_scan_counts` table (user_id, year_month TEXT like '2026-03', count INTEGER), RLS policy (users read/write own rows), and an atomic `increment_scan_count(p_user_id uuid, p_year_month text)` RPC returning the new count.

## Constraints

- `react-native-purchases` and `react-native-purchases-ui` are **native-only** — require EAS builds. Cannot test real purchase flows in Expo Go or local dev. The dynamic import fallback pattern from AdBanner enables the app to run locally without the package installed.
- `@revenuecat/purchases-js` (web) is a **different package** from `react-native-purchases` (native). Different initialization API, different entitlement check API, different checkout flow. Must be platform-branched with `Platform.OS === 'web'`.
- RevenueCat SDK must be configured **before** any entitlement checks. It should be initialized once at session-establish time, not on-demand at the paywall.
- Apple App Store requires subscription paywalls to display: price, subscription period, auto-renewal disclosure, cancellation instructions link, and links to Terms of Service and Privacy Policy. RevenueCat's built-in paywall handles this; a custom paywall must include all of these.
- Scan count `month` key must be computed server-side or validated server-side (not trusted from client). The RPC should compute `TO_CHAR(NOW(), 'YYYY-MM')` rather than accepting a client-provided string.
- `react-native-google-mobile-ads` is already in `node_modules` (installed). RevenueCat will follow the same pattern since it's also needed for EAS builds.
- All alerts must use `showAlert`/`confirmAction` from `@/lib/alert` (not raw `Alert.alert`).
- All new UI must use tokens from `src/lib/tokens.ts`.

## Common Pitfalls

- **SDK initialization race condition** — If RevenueCat is configured after the first entitlement check runs, the check returns "no entitlement" for legitimate subscribers. Fix: initialize at app startup in `app/_layout.tsx` or in the session provider as soon as a user ID is available, not lazily on the paywall screen.
- **Web platform check missing** — `react-native-purchases` crashes on web if statically imported or if `Purchases.configure()` is called without Platform guard. The `Platform.OS === 'web'` branch must use `@revenuecat/purchases-js` exclusively.
- **Scan count race condition** — Two simultaneous uploads could both read count < 3 and both succeed. Fix: use a Postgres atomic increment RPC (`UPDATE ... RETURNING count`) or a unique constraint on `(user_id, year_month)` with ON CONFLICT DO UPDATE, rather than SELECT then INSERT/UPDATE from the client.
- **Failed scan still counted** — Per requirements, failed scans (photo upload succeeds, edge function fails) must NOT count against the limit. Gate: increment count only in the RPC called at `createMultiPhotoScanJob` insert time (photo upload succeeded), but consider reverting on edge function failure. Simpler: count = photo uploads, not recipe extractions. Document the chosen definition clearly.
- **Month rollover** — Storing count as a single integer without a `year_month` column means the count never resets. Must store `year_month TEXT` (e.g., '2026-03') so a new month automatically starts at 0.
- **Subscriber ad suppression requires context, not prop drilling** — Passing `isSubscriber` as a prop through every component that contains `AdBanner` is fragile. A `useSubscription()` hook backed by a context provider is the right approach. `AdBanner` calls `useSubscription()` directly and returns `null` for subscribers.
- **Paywall presented on top of native UI** — `RevenueCatUI.presentPaywall()` presents a native modal. On iOS/Android this is fine. On web it does nothing (web uses `@revenuecat/purchases-js` checkout which navigates to a Stripe-hosted page or embedded flow). The web paywall must be a separate custom screen.
- **Anonymous → identified user migration** — RevenueCat creates anonymous IDs for unauthenticated users. If the app always requires auth before scanning (it does — `createMultiPhotoScanJob` calls `getUser()` and throws if unauthenticated), this is a non-issue. Confirm no guest scanning path exists.
- **EAS Build secrets** — RevenueCat iOS/Android API keys must be set as EAS environment variables, not just `.env`. Use `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY` / `EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY` in `eas.json` env configuration.

## Open Risks

- RevenueCat Web Billing (Stripe-backed) is relatively new; the `@revenuecat/purchases-js` API may have rough edges or incomplete React Native Web compatibility. Evaluate before committing to the web billing slice.
- Apple review may scrutinize the paywall if the "3 free scans" limit isn't clearly communicated before the paywall appears. Apple's guidelines require users to understand the free/paid distinction before hitting a hard gate.
- The RevenueCat Expo plugin may not exist yet (or may be community-maintained) — verify `expo-purchases` or similar. The fallback is manual native project setup via EAS. Check before writing setup guide.
- Stripe test mode → production mode transition for web billing requires creating live products in both Stripe and RevenueCat dashboard. This is a manual ops step the setup guide must cover in detail.

## Candidate Requirements

- **SUB-07 (candidate)** — Clear free tier communication before paywall: app should surface remaining scan count before the user hits the limit (SUB-06 covers display; but placement on home screen / scan tab as a proactive reminder may be needed to satisfy App Store review guidelines). Currently advisory.
- **SUB-08 (candidate)** — RevenueCat `appUserID` identity migration: if a user was previously anonymous (e.g., during beta testing with promotional entitlements) and then signs in, their entitlements should carry over. RevenueCat's `logIn()` handles this, but the app must call `logIn()` on auth state change, not just `configure()` at startup. Currently advisory.

## Skills Discovered

| Technology | Skill | Status |
|------------|-------|--------|
| RevenueCat / react-native-purchases | none found | none found |
| Supabase migrations | none found (use existing project patterns) | none found |
| Stripe (web billing setup) | none found | none found |

## Sources

- RevenueCat SDK initialization, entitlement checking, and `presentPaywallIfNeeded` API (source: Context7 `/revenuecat/react-native-purchases`)
- Dynamic import pattern for native-only SDKs (source: `src/features/ads/AdBanner.tsx` — existing codebase)
- Expo plugin conditional guard with `fs.existsSync` (source: `app.config.ts` — existing codebase)
- Scan entry point and auth pattern (source: `src/features/scan/scan-service.ts` — existing codebase)
- Migration naming and RPC patterns (source: `supabase/migrations/` — existing codebase)
