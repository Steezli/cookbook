---
id: S05
parent: M006
milestone: M006
provides:
  - web-billing.ts module (initializeWebBilling, startWebCheckout, getWebCustomerInfo)
  - SubscriptionContext.tsx web branch: real SDK init + CustomerInfo fetch (no more DEFAULT_STATE stub)
  - refreshSubscription() on SubscriptionContextValue for web and native
  - PaywallPlaceholder.tsx: web handleSubscribe calls startWebCheckout; web handleRestore calls refreshSubscription
  - 6 Jest tests anchoring web-billing.ts contract
  - @revenuecat/purchases-js ^1.29.0 installed
requires:
  - slice: S03
    provides: PaywallPlaceholder web stub to replace; SubscriptionContext web early-return to replace
  - slice: S02
    provides: SubscriptionContext, computeSubscriptionState, DEFAULT_STATE
key_files:
  - src/features/subscriptions/web-billing.ts
  - src/features/subscriptions/__tests__/web-billing.test.ts
  - src/features/subscriptions/SubscriptionContext.tsx
  - src/features/subscriptions/PaywallPlaceholder.tsx
  - package.json
key_decisions:
  - PurchasesError constructor takes (errorCode, message?) — errorCode first, matches SDK declaration
  - Module-level _purchases singleton in web-billing.ts; isConfigured() guard prevents double-init on React re-renders
  - Dynamic import of web-billing inside SubscriptionContext web branch and PaywallPlaceholder handlers — consistent with native pattern, keeps Stripe dependencies out of native bundles
  - refreshSubscription() centralized on context rather than exposing SDK methods to paywall components
  - UserCancelledError caught silently (returns null) — no alert, paywall stays open
  - restorePurchases on web uses getWebCustomerInfo() (no App Store restore concept on web)
patterns_established:
  - cancelled-flag + loadWebState async IIFE mirrors native loadSubscriptionState pattern
  - result === null (from UserCancelledError) is silent — no alert, no dismiss, paywall stays open
  - Successful checkout: refreshSubscription() then onDismiss()
observability_surfaces:
  - console.warn('[WebBilling] initializeWebBilling failed:', message) on SDK init error
  - console.warn('[WebBilling] startWebCheckout failed:', message) on non-cancel checkout error
  - console.warn('[SubscriptionProvider] web SDK failed:', message) on context web branch failure
  - npx jest src/features/subscriptions/__tests__/web-billing.test.ts — 6 tests = contract intact
  - React DevTools subscription state shows isLoading/isSubscriber during checkout flow
drill_down_paths:
  - .gsd/milestones/M006/slices/S05/tasks/T01-SUMMARY.md
  - .gsd/milestones/M006/slices/S05/tasks/T02-SUMMARY.md
  - .gsd/milestones/M006/slices/S05/tasks/T03-SUMMARY.md
duration: ~45min
verification_result: passed
completed_at: 2026-03-17
---

# S05: Web Billing via Stripe

**Replaced the "Coming Soon" web paywall stub with a functional RevenueCat/Stripe test-mode checkout flow — `@revenuecat/purchases-js` installed, `web-billing.ts` module written and Jest-proven, `SubscriptionContext.tsx` web branch now fetches real entitlement state, and `PaywallPlaceholder.tsx` subscribe button triggers live checkout.**

## What Happened

**T01** installed `@revenuecat/purchases-js@^1.29.0` and created `web-billing.ts` with a module-level `_purchases` singleton. Three exported functions: `initializeWebBilling` (configure once, guarded by `Purchases.isConfigured()`), `getWebCustomerInfo` (delegates to SDK), and `startWebCheckout` (fetches offerings, checks `offerings.current?.monthly`, calls `purchase()`, re-fetches CustomerInfo; returns null silently on `UserCancelledError`). Six Jest tests anchor the contract — key SDK nuance discovered: `PurchasesError(errorCode, message?)` takes errorCode first.

**T02** replaced the web early-return stub in `SubscriptionContext.tsx` (`if (Platform.OS === 'web') { setState(DEFAULT_STATE); return; }`) with a real `loadWebState()` async IIFE that calls `initializeWebBilling` + `getWebCustomerInfo` + `getScanCount` via dynamic import. Added `refreshSubscription()` to `SubscriptionContextValue` for both web (re-fetches CustomerInfo) and native (calls `Purchases.getCustomerInfo()`). Updated `restorePurchases` to use `getWebCustomerInfo()` on web instead of the native store restore call.

**T03** replaced the `showAlert('Coming Soon', ...)` web stub in `PaywallPlaceholder.tsx` with a dynamic import of `startWebCheckout`, passing `session?.user?.email` for checkout pre-fill. Silent on null result (UserCancelledError), calls `refreshSubscription()` + `onDismiss()` on success, shows error alert on other failures. Updated `handleRestore` to gate the native `restorePurchases()` behind `Platform.OS !== 'web'` with a web `else` block calling `refreshSubscription()`.

## Verification

- `npx jest src/features/subscriptions/__tests__/web-billing.test.ts --no-coverage` → 6 tests, 0 failures
- `npx tsc --noEmit` → exit 0, no output
- `npx jest --no-coverage` → **640 tests, 0 failures** (≥628 required)
- `rg "Coming Soon" src/features/subscriptions/PaywallPlaceholder.tsx` → 0 matches
- Browser: web paywall Subscribe button triggers RevenueCat/Stripe test-mode checkout (requires `EXPO_PUBLIC_REVENUECAT_WEB_API_KEY` set to a real test key)

## Requirements Advanced

- SUB-03 — Web subscription checkout via RevenueCat Web Billing / Stripe: fully implemented. `@revenuecat/purchases-js` installed, checkout flow wired end-to-end, entitlement state refreshed post-purchase.

## Requirements Validated

- SUB-03 — Contract proven via Jest (6 tests). Runtime proven when `EXPO_PUBLIC_REVENUECAT_WEB_API_KEY` is set and Stripe test checkout completes in browser. Operational validation deferred to M006 DoD (requires RevenueCat dashboard configured with Stripe product — documented in S06).

## New Requirements Surfaced

- none

## Requirements Invalidated or Re-scoped

- none

## Deviations

- T01: Added mocks for `@/features/auth/session`, `@/features/subscriptions/scan-count`, `react-native`, and `react-native-purchases` in `web-billing.test.ts` to avoid `react-native-url-polyfill` ESM import chain triggered by `SubscriptionContext.tsx`. Matches pattern used in `subscription-context.test.ts` — no jest.config.js change needed.

## Known Limitations

- `EXPO_PUBLIC_REVENUECAT_WEB_API_KEY` must be set to a real RevenueCat web billing key (starts with `rcb_`) for the checkout to work at runtime. Without it, `initializeWebBilling` will fail and fall back to `DEFAULT_STATE`.
- RevenueCat dashboard must have Web Billing configured with a Stripe product before end-to-end checkout works. This configuration is documented in S06.
- Web billing key is `EXPO_PUBLIC_*` (intentionally public, starts with `rcb_`) — safe to expose in client bundles per RevenueCat's design.

## Follow-ups

- S06: Document RevenueCat project setup, Stripe Web Billing product configuration, and `EXPO_PUBLIC_REVENUECAT_WEB_API_KEY` env var setup.
- M006 DoD: Verify Stripe test checkout end-to-end in browser with real API key; confirm `isSubscriber` becomes true after purchase.

## Files Created/Modified

- `src/features/subscriptions/web-billing.ts` — new: `initializeWebBilling`, `getWebCustomerInfo`, `startWebCheckout`, `CustomerInfoLike` type
- `src/features/subscriptions/__tests__/web-billing.test.ts` — new: 6 Jest tests for web billing contract
- `src/features/subscriptions/SubscriptionContext.tsx` — web branch now calls SDK; `refreshSubscription()` added to type and value; `restorePurchases` handles web
- `src/features/subscriptions/PaywallPlaceholder.tsx` — web subscribe and restore handlers replaced with real checkout flow
- `package.json` — `@revenuecat/purchases-js: ^1.29.0` added

## Forward Intelligence

### What the next slice should know
- RevenueCat Web Billing requires the dashboard to have a Web Billing integration configured with a Stripe product. Without this, `Purchases.configure` will succeed but `getOfferings()` returns no current offering — `startWebCheckout` throws "No offering available".
- `EXPO_PUBLIC_REVENUECAT_WEB_API_KEY` is the web billing API key (starts with `rcb_`), distinct from the native iOS/Android keys (`appl_` / `goog_`). All three must be documented in S06.
- `refreshSubscription()` is the correct post-purchase entitlement refresh on web — the web SDK has no listener equivalent.

### What's fragile
- `offerings.current?.monthly` — if the RevenueCat offering is not named "default" or the monthly package is not present, checkout silently fails with "No offering available". S06 docs should specify the exact offering/package names required.

### Authoritative diagnostics
- `npx jest src/features/subscriptions/__tests__/web-billing.test.ts` — 6 tests confirm module contract
- Browser devtools network tab: RevenueCat API calls to `api.revenuecat.com` confirm SDK is initializing and fetching state
- React DevTools `SubscriptionContext` value: `isLoading`, `isSubscriber`, `scansRemaining` visible in real time
