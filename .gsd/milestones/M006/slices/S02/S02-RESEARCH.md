# S02: RevenueCat SDK + Subscription Context — Research

**Date:** 2026-03-17

## Summary

S02 introduces the RevenueCat `react-native-purchases` SDK and a `SubscriptionContext` / `useSubscription()` hook. The entire implementation follows the same dynamic-import + try/catch fallback pattern already established in `AdBanner.tsx` for AdMob — the RevenueCat SDK is native-only, not installed in local dev, and must never be statically imported. A `.d.ts` type declaration file (following the existing `react-native-google-mobile-ads.d.ts` pattern) enables TypeScript to compile locally without the package present.

The core deliverable is a `SubscriptionProvider` that (a) initializes RevenueCat in the Supabase session provider the moment a user ID becomes available, (b) checks the `"premium"` entitlement via `Purchases.getCustomerInfo()`, (c) reads `getScanCount()` from S01 to compute `scansRemaining`, and (d) exposes `{ isSubscriber, scanCount, scansRemaining, isLoading, restorePurchases }` via context. `SubscriptionProvider` wraps `SessionProvider` in `app/_layout.tsx`, making subscription state available throughout the app without prop drilling.

All S02 behavior must be verifiable with Jest mocks — no EAS build is needed for this slice. The `isLoading` guard prevents the initialization race condition: entitlement checks return `false` until the SDK responds, and `isLoading` stays `true` until the first `getCustomerInfo` call completes (or falls back on SDK unavailability). The `addCustomerInfoUpdateListener` callback keeps subscription state live after an in-session purchase.

## Recommendation

Follow the AdBanner pattern exactly:
1. Minimal `.d.ts` for `react-native-purchases` in `src/features/subscriptions/types/`
2. `SubscriptionContext.tsx` with dynamic `import('react-native-purchases')` in a `useEffect`, `sdkAvailable` boolean, and `addCustomerInfoUpdateListener` for real-time updates
3. RevenueCat `configure()` called inside `SessionProvider`'s `onAuthStateChange` handler (same useEffect that already calls `safeEnsureProfile`) — initialize when `nextSession?.user.id` is available
4. `SubscriptionProvider` wraps the `<Stack>` in `app/_layout.tsx`, inside `SessionProvider` (needs session to get user ID)
5. Jest tests mock `react-native-purchases` module entirely: `isSubscriber: false` when entitlement absent, `isSubscriber: true` when `entitlements.active['premium']` exists, `scansRemaining` computed from `getScanCount()`

The entitlement identifier to use is `"premium"` — consistent with RevenueCat's standard naming and the research docs.

## Don't Hand-Roll

| Problem | Existing Solution | Why Use It |
|---------|------------------|------------|
| Native-only SDK dynamic loading | `AdBanner.tsx` dynamic import pattern | Already proven pattern; SDK unavailability handled gracefully; `sdkAvailable` boolean gates real vs. placeholder path |
| Type declarations for uninstalled native package | `src/features/ads/types/react-native-google-mobile-ads.d.ts` | Same shape: minimal declarations for the calls actually made; prevents TS errors in local dev |
| Real-time entitlement updates on purchase | `Purchases.addCustomerInfoUpdateListener()` | SDK fires callback immediately after purchase; no polling needed; cleanup in useEffect return |
| Purchase restoration | `Purchases.restorePurchases()` | Standard RevenueCat API; handles cross-device, App Store, Play Store in one call |
| Cross-component subscriber state | React Context + `useSubscription()` hook | Established pattern (`SessionProvider`); avoids prop drilling through every component containing `AdBanner` |

## Existing Code and Patterns

- `src/features/ads/AdBanner.tsx` — **primary pattern** for dynamic SDK loading. Copy the `useEffect` + try/catch + `cancelled` flag + `setSdkAvailable` pattern verbatim. `SubscriptionContext` should follow the same structure.
- `src/features/ads/types/react-native-google-mobile-ads.d.ts` — **type declaration pattern** to replicate. Create `src/features/subscriptions/types/react-native-purchases.d.ts` with declarations for: `default export Purchases` with `configure()`, `getCustomerInfo()`, `restorePurchases()`, `addCustomerInfoUpdateListener()`, `removeCustomerInfoUpdateListener()`; `CustomerInfo` interface with `entitlements.active: Record<string, EntitlementInfo>`; `EntitlementInfo` interface with `expirationDate: string | null`, `willRenew: boolean`, `productIdentifier: string`.
- `src/features/auth/session.tsx` — **initialization site**. RevenueCat `Purchases.configure()` call belongs in the `onAuthStateChange` handler alongside `safeEnsureProfile()`. The `hasSessionChanged()` guard already prevents duplicate init calls. Platform guard required: skip configure on `Platform.OS === 'web'` (web uses `@revenuecat/purchases-js` in S05).
- `app/_layout.tsx` — **provider injection site**. `SubscriptionProvider` wraps `<ErrorBoundary>` inside `<SessionProvider>`. Current order: `SafeAreaProvider > SessionProvider > ErrorBoundary > Stack`. New order: `SafeAreaProvider > SessionProvider > SubscriptionProvider > ErrorBoundary > Stack`.
- `src/features/subscriptions/scan-count.ts` — `getScanCount(userId)` returns current month count; import and call it inside `SubscriptionProvider` after resolving `isSubscriber` to compute `scansRemaining = Math.max(0, 3 - scanCount)`.
- `src/features/ads/__tests__/AdBanner.test.ts` — **test pattern**: `jest.mock('react-native', ...)` with proxy for `Platform.OS`, pure function testing (not component rendering). S02 tests should be the same style — mock the SDK module, test context hook behavior via pure computation.
- `app.config.ts` — add `purchasesInstalled = fs.existsSync(path.join(__dirname, 'node_modules', 'react-native-purchases'))` guard for the RevenueCat Expo plugin (same pattern as `admobInstalled`).

## Constraints

- `react-native-purchases` is NOT installed in local `node_modules` — confirmed. Static imports will fail. Dynamic import with try/catch is mandatory.
- `react-native-purchases-ui` (for `RevenueCatUI.presentPaywallIfNeeded`) is a separate package — also native-only. Do NOT include it in S02 type declarations; that's S03's scope.
- Web platform (`Platform.OS === 'web'`) must skip `Purchases.configure()` entirely — the native SDK crashes on web. The `SubscriptionProvider` web path should set `isSubscriber: false` and defer to S05's `@revenuecat/purchases-js` integration.
- `SubscriptionProvider` needs the Supabase user ID to call `Purchases.configure()`. It must be inside `SessionProvider` in the tree so it can read session state. Either (a) `SubscriptionProvider` uses `useSession()` internally and drives its own RevenueCat init, or (b) init stays in `session.tsx` and `SubscriptionProvider` only manages context state. Option (b) is cleaner — `session.tsx` already has the auth event loop; `SubscriptionProvider` reads `useSession()` and reacts to user ID presence.
- `(supabase.rpc as Function)` cast pattern from S01 must remain — `user_scan_counts` not yet in generated types.
- All new UI (if any) must use tokens from `src/lib/tokens.ts`. S02 has no UI, only context/hooks.
- Entitlement identifier: use `"premium"` consistently. This must match the identifier configured in RevenueCat dashboard (setup docs in S06).
- `addCustomerInfoUpdateListener` callback must be cleaned up in useEffect return to prevent memory leaks.

## Common Pitfalls

- **SDK initialization race** — If `Purchases.configure()` is called after the first `getCustomerInfo()`, subscribers appear unentitled. Fix: configure in `onAuthStateChange` (which fires before `SubscriptionProvider` renders with a user ID), or configure inside `SubscriptionProvider`'s `useEffect` that watches `session.user.id`.
- **Web crash on configure** — `Purchases.configure()` called without a `Platform.OS === 'web'` guard crashes web. This is the same pitfall as AdMob. The dynamic import try/catch will NOT protect against this if the SDK IS installed (EAS build) and you forget the platform check.
- **isLoading stuck true** — If the SDK dynamic import throws AND the catch path doesn't set `isLoading: false`, the context consumers hang forever. Ensure the catch path sets `isLoading: false` and `isSubscriber: false`.
- **Double initialization** — `onAuthStateChange` fires multiple times per session (INITIAL_SESSION + SIGNED_IN). The existing `hasSessionChanged()` guard in `session.tsx` helps, but `Purchases.configure()` should also be idempotent (RevenueCat SDK is, per docs — calling configure twice is safe but wasteful). Add a ref guard: `purchasesConfiguredRef.current` set to `true` after first configure.
- **scansRemaining going negative** — `getScanCount()` returns the actual count; if a user somehow exceeds 3 (e.g., concurrent requests), `3 - count` would be negative. Use `Math.max(0, 3 - scanCount)`.
- **Missing provider wrapper** — Components calling `useSubscription()` outside `SubscriptionProvider` get the "must be inside provider" error. The root layout wrapping handles this for all route screens, but test files that render isolated components need to wrap with `SubscriptionProvider` or mock the context.
- **Jest module mock for dynamic import** — `jest.mock('react-native-purchases')` intercepts the dynamic `import()` call in Jest's module system, same as static imports. The mock should export a default object with `configure`, `getCustomerInfo`, `restorePurchases`, `addCustomerInfoUpdateListener`, `removeCustomerInfoUpdateListener`.

## Open Risks

- RevenueCat Expo plugin may not exist or may be community-maintained — check before writing `app.config.ts` guard. If no plugin exists, the EAS build configuration is done manually in `eas.json` / native project config. This affects S06 docs, not S02 code.
- `@revenuecat/purchases-js` (web, S05) has a different API than `react-native-purchases`. The `SubscriptionContext` will need platform branching in S05. Design `SubscriptionProvider` with a clean separation between the native SDK initialization path and the web path (empty/noop in S02 for web) so S05 can slot in without refactoring the context shape.
- `addCustomerInfoUpdateListener` may not fire in Jest test environment unless explicitly invoked. Tests for real-time update behavior should call the listener mock directly after setup.

## Skills Discovered

| Technology | Skill | Status |
|------------|-------|--------|
| RevenueCat / react-native-purchases | none found | none found |
| React Context + hooks pattern | native to this codebase (SessionProvider) | no skill needed |

## Sources

- `Purchases.configure()`, `getCustomerInfo()`, `addCustomerInfoUpdateListener()`, entitlement check pattern (source: Context7 `/revenuecat/react-native-purchases`)
- `RevenueCatUI.presentPaywallIfNeeded()` API shape (source: Context7 `/revenuecat/react-native-purchases` — deferred to S03)
- Dynamic import + try/catch pattern, `sdkAvailable` boolean, cancelled flag cleanup (source: `src/features/ads/AdBanner.tsx`)
- Type declaration shape for native-only module (source: `src/features/ads/types/react-native-google-mobile-ads.d.ts`)
- `fs.existsSync` Expo plugin guard (source: `app.config.ts`)
- Session provider structure, `hasSessionChanged`, `onAuthStateChange` hook (source: `src/features/auth/session.tsx`)
- `getScanCount()` return type and behavior (source: `src/features/subscriptions/scan-count.ts` — S01 deliverable)
- `ScanLimitError` shape (source: `src/features/scan/errors.ts` — S01 deliverable)
- Provider injection order (source: `app/_layout.tsx`)
