---
id: M006
provides:
  - Freemium subscription model — 3 free scans/month, unlimited for $3.99/month subscribers
  - RevenueCat SDK integration (native) + Stripe Web Billing (web) via @revenuecat/purchases-js
  - SubscriptionProvider + useSubscription() hook (isSubscriber, scanCount, scansRemaining, isLoading, restorePurchases, refreshSubscription)
  - Server-side scan count tracking with atomic Postgres RPC (user_scan_counts table)
  - Scan gating in createMultiPhotoScanJob — ScanLimitError at count > 3
  - PaywallPlaceholder component (RevenueCatUI native, Stripe checkout web)
  - Ad suppression for subscribers (AdBanner returns null, GDPR consent skipped)
  - Remaining scans badge on scan upload screen
  - docs/subscription-setup.md — 6-section configuration guide
  - EAS env var configuration for RevenueCat API keys
key_decisions:
  - Supabase-backed scan count over client-side tracking (tamper-resistant)
  - year_month TEXT column — automatic month rollover, no cron needed
  - Photo upload as scan unit, not recipe extraction
  - RevenueCat initialization in session provider (eliminates race condition)
  - SubscriptionContext with useSubscription() hook over prop drilling
  - isSubscriber parameter to service layer (keeps functions testable without React context)
  - computeSubscriptionState exported as pure function for Jest testability
  - Dynamic imports for all optional native SDKs (RevenueCat, RevenueCatUI)
  - refreshSubscription() on context for web post-checkout sync
  - shouldSuppressAd pure helper for ad suppression contract testing
patterns_established:
  - purchasesConfiguredRef single-init guard for SDK lifecycle in auth provider
  - CustomerInfoLike structural type for loose test mocking of entitlement shapes
  - __mocks__/react-native-purchases.js + moduleNameMapper for native SDK Jest resolution
  - ScanLimitError.currentCount for inspectable limit-reached diagnostics
  - isSubscriber threading through service call chain (ScanUploadOptions → uploadScanPhotos → createMultiPhotoScanJob)
  - Module-level _purchases singleton with isConfigured() guard for web billing
  - cancelled-flag + loadWebState async IIFE pattern for web SDK initialization
observability_surfaces:
  - npx jest (640 tests, 32 suites) — full regression suite
  - npx jest src/features/subscriptions/__tests__/ — subscription contract tests (scan-count + context + web-billing)
  - npx jest src/features/scan/__tests__/scan-gate.test.ts — gate contract verification
  - npx jest src/features/ads/__tests__/AdBanner.test.ts — subscriber suppression contract
  - console.warn('[SubscriptionProvider]') — SDK unavailability or network failure
  - console.warn('[WebBilling]') — web SDK init or checkout errors
  - ScanLimitError.currentCount — exact count at rejection time
  - user_scan_counts table in Supabase dashboard — live per-user count inspection
requirement_outcomes:
  - id: SUB-01
    from_status: deferred
    to_status: active
    proof: Scan gating implemented in createMultiPhotoScanJob (S03); isSubscriber bypass tested; 4 gate contract tests pass. Operational validation deferred to EAS build.
  - id: SUB-02
    from_status: deferred
    to_status: active
    proof: PaywallPlaceholder component renders on ScanLimitError catch (S03); RevenueCatUI dynamic import wired for native; web Stripe checkout wired in S05. Runtime rendering deferred to EAS build.
  - id: SUB-03
    from_status: deferred
    to_status: active
    proof: "@revenuecat/purchases-js installed; web-billing.ts with initializeWebBilling/startWebCheckout/getWebCustomerInfo; SubscriptionContext web branch fetches real entitlement; 6 web-billing contract tests pass (S05)."
  - id: SUB-04
    from_status: deferred
    to_status: active
    proof: "AdBanner returns null for subscribers via shouldSuppressAd guard; GDPR consent bypassed for subscribers; 3 suppression + 2 consent bypass tests pass (S04)."
  - id: SUB-05
    from_status: deferred
    to_status: active
    proof: "user_scan_counts table + increment_scan_count RPC (S01); gate fires at count > 3; 5 scan-count + 4 gate contract tests pass. Month rollover via year_month TEXT."
  - id: SUB-06
    from_status: deferred
    to_status: active
    proof: "scansRemaining badge on scan upload screen (S03); getScanCount/scansRemaining computation in SubscriptionContext (S01/S02)."
duration: ~3.5 hours across 6 slices
verification_result: passed (contract level; operational verification requires EAS build + configured RevenueCat/Stripe)
completed_at: 2026-03-17
---

# M006: Subscriptions

**Freemium subscription model with server-side scan gating (3 free/month), RevenueCat entitlements, Stripe web billing, ad suppression for subscribers, and paywall UI — 640 tests green, TypeScript clean, all 6 slices complete.**

## What Happened

S01 built the server-side foundation: a `user_scan_counts` Postgres table with atomic `increment_scan_count` RPC using `ON CONFLICT DO UPDATE`. The `year_month` TEXT column (server-computed via `TO_CHAR(NOW(), 'YYYY-MM')`) means month rollover is automatic with no cron job. `ScanLimitError` with `currentCount` property provides inspectable diagnostics at catch sites.

S02 delivered the React context layer: `SubscriptionProvider` + `useSubscription()` hook returning `{ isSubscriber, scanCount, scansRemaining, isLoading, restorePurchases }`. RevenueCat `Purchases.configure()` runs in `session.tsx` (alongside auth, not lazily) via `purchasesConfiguredRef` single-init guard. Dynamic import with try/catch fallback matches the established AdMob pattern. `computeSubscriptionState` exported as a pure function enables Jest testing without a React renderer.

S03 wired the gate: `createMultiPhotoScanJob` calls `incrementScanCount` for non-subscribers and lets `ScanLimitError` bubble. `isSubscriber` is threaded through the full upload chain as a parameter (not context access) keeping the service layer testable. The scan screen catches `ScanLimitError` → sets `paywallVisible` state → renders `PaywallPlaceholder`. A `scansRemaining` badge shows remaining free scans.

S04 added subscriber ad suppression: `shouldSuppressAd(isLoading, isSubscriber)` pure helper + early `return null` in `AdBanner`. GDPR consent functions accept `options.isSubscriber` for bypass. Both are additive changes with zero breakage to existing ad behavior.

S05 replaced the web "Coming Soon" stub with real Stripe checkout: `@revenuecat/purchases-js` installed, `web-billing.ts` module with singleton SDK management, `SubscriptionContext` web branch now fetches real entitlement state, and `PaywallPlaceholder` subscribe button triggers `startWebCheckout`. Added `refreshSubscription()` to context for post-checkout sync (web SDK has no listener).

S06 delivered `docs/subscription-setup.md` (6 sections: RevenueCat, App Store Connect, Google Play, Stripe, EAS env vars, promotional entitlements) plus `.env.example` and `eas.json` build config updates.

## Cross-Slice Verification

| Success Criterion | Evidence | Status |
|---|---|---|
| Free user scans 3 times, paywall on 4th | S01: incrementScanCount RPC returns count; S03: gate throws ScanLimitError at count > 3; 4 gate tests + 5 scan-count tests pass | ✅ Contract |
| Subscriber unlimited scans, no ads | S02: isSubscriber bypass in gate; S04: AdBanner returns null; shouldSuppressAd tests pass | ✅ Contract |
| Web Stripe checkout + immediate entitlement | S05: startWebCheckout → refreshSubscription flow; 6 web-billing tests pass | ✅ Contract |
| Remaining scan count visible on scan screen | S03: scansRemaining badge renders when !isSubscriber && !subscriptionLoading | ✅ Code present |
| Scan count resets on 1st of month | S01: year_month = TO_CHAR(NOW(), 'YYYY-MM'); new month auto-creates new row at count 0 | ✅ Contract |
| Promotional entitlements via RevenueCat dashboard | S06: docs/subscription-setup.md Section 6 documents grant/revoke process | ✅ Documented |
| Purchase restoration on new device | S02: restorePurchases on context; S05: web restore via getWebCustomerInfo | ✅ Contract |

**Aggregate verification:**
- `npx tsc --noEmit` → exit 0
- `npx jest --no-coverage` → 640 tests, 32 suites, 0 failures
- All 6 slices complete with individual verification passing

**Operational verification deferred to deployment:**
- Supabase migration deployment + type regeneration
- EAS build with real RevenueCat SDK initialization
- Device testing: 3-scan limit, subscriber no-ads, RevenueCatUI rendering
- Stripe test-mode checkout with configured REVENUECAT_WEB_API_KEY
- Promotional entitlement grant via RevenueCat dashboard

## Requirement Changes

- SUB-01: deferred → active — Scan gating implemented and contract-tested; operational validation pending EAS build
- SUB-02: deferred → active — Paywall component shipped with native RevenueCatUI + web Stripe paths; operational validation pending EAS build
- SUB-03: deferred → active — @revenuecat/purchases-js installed, web-billing module contract-tested; runtime pending configured API keys
- SUB-04: deferred → active — AdBanner subscriber suppression + GDPR bypass contract-tested
- SUB-05: deferred → active — Server-side scan count with atomic RPC, gate at count > 3, month rollover; contract-tested
- SUB-06: deferred → active — scansRemaining badge wired on scan screen; visual validation pending

All six requirements move from deferred to active (contract-verified). They will move to validated upon operational proof with EAS builds and configured third-party services.

## Forward Intelligence

### What the next milestone should know
- All subscription infrastructure is contract-proven but not operationally proven. The first EAS build after M006 must verify: RevenueCat SDK initializes, paywall renders, scan gating enforces, ads disappear for subscribers.
- `EXPO_PUBLIC_REVENUECAT_API_KEY` (native, starts with `appl_`/`goog_`) and `EXPO_PUBLIC_REVENUECAT_WEB_API_KEY` (web, starts with `rcb_`) must be configured before any runtime testing.
- RevenueCat offering must be named exactly "default" with package "monthly" — documented in setup guide but easy to misconfigure.
- The Supabase migration `20260317000000_add_scan_counts.sql` must be deployed to remote before scan gating works end-to-end.

### What's fragile
- `(supabase.from as Function)` cast for user_scan_counts — regenerate types after remote migration to remove
- `offerings.current?.monthly` in web-billing.ts — silently fails if RevenueCat offering/package not configured correctly
- `purchasesConfiguredRef` resets if SessionProvider remounts — unlikely in production but possible in test environments
- Dynamic imports for RevenueCatUI — null-catch fallback silently degrades to alert if module shape changes

### Authoritative diagnostics
- `npx jest src/features/subscriptions/__tests__/` — subscription contract tests (scan-count + context + web-billing)
- `npx jest src/features/scan/__tests__/scan-gate.test.ts` — gate behavior contract
- `npx jest src/features/ads/__tests__/AdBanner.test.ts` — ad suppression contract
- `docs/subscription-setup.md` — single source of truth for third-party service configuration

### What assumptions changed
- Jest requires native SDK modules to be resolvable on disk (not just jest.mock'd) — solved with `__mocks__/` files + moduleNameMapper
- `PurchasesError` constructor takes `(errorCode, message?)` — errorCode first, not message first
- `uploadScanPhotosInline` (native inline path) also needed isSubscriber threading — plan only mentioned the web path

## Files Created/Modified

- `supabase/migrations/20260317000000_add_scan_counts.sql` — user_scan_counts table + increment_scan_count RPC
- `src/features/scan/errors.ts` — ScanLimitError class
- `src/features/subscriptions/scan-count.ts` — getScanCount, incrementScanCount wrappers
- `src/features/subscriptions/SubscriptionContext.tsx` — SubscriptionProvider, useSubscription, computeSubscriptionState
- `src/features/subscriptions/types/react-native-purchases.d.ts` — RevenueCat SDK type declarations
- `src/features/subscriptions/types/react-native-purchases-ui.d.ts` — RevenueCatUI type declarations
- `src/features/subscriptions/web-billing.ts` — @revenuecat/purchases-js wrapper
- `src/features/subscriptions/PaywallPlaceholder.tsx` — paywall modal component
- `src/features/subscriptions/__tests__/scan-count.test.ts` — 5 scan count contract tests
- `src/features/subscriptions/__tests__/subscription-context.test.ts` — 7 context contract tests
- `src/features/subscriptions/__tests__/web-billing.test.ts` — 6 web billing contract tests
- `src/features/scan/__tests__/scan-gate.test.ts` — 4 gate contract tests
- `src/features/scan/scan-service.ts` — scan gate logic added
- `src/features/scan/scan-photos.ts` — isSubscriber threading
- `src/features/scan/scan-upload.ts` — isSubscriber in ScanUploadOptions
- `src/features/ads/AdBanner.tsx` — shouldSuppressAd + subscriber guard
- `src/features/ads/consent.ts` — isSubscriber bypass option
- `src/features/ads/__tests__/AdBanner.test.ts` — subscriber suppression tests
- `src/features/ads/__tests__/consent.test.ts` — consent bypass tests
- `src/features/auth/session.tsx` — Purchases.configure() + purchasesConfiguredRef
- `app/_layout.tsx` — SubscriptionProvider wrapping
- `app/(tabs)/scan/index.tsx` — useSubscription, gate catch, paywall, scansRemaining badge
- `app.config.ts` — purchasesInstalled guard
- `__mocks__/react-native-purchases.js` — Jest manual mock
- `__mocks__/react-native-purchases-ui.js` — Jest manual mock
- `jest.config.js` — moduleNameMapper entries
- `src/lib/tokens.ts` — accentBlueDark token
- `docs/subscription-setup.md` — 6-section configuration guide
- `.env.example` — RevenueCat key placeholders
- `eas.json` — env block for RevenueCat keys
- `package.json` — @revenuecat/purchases-js dependency
