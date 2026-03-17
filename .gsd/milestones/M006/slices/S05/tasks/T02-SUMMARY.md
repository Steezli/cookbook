---
id: T02
parent: S05
milestone: M006
provides:
  - SubscriptionContext.tsx web SDK branch (initializeWebBilling + getWebCustomerInfo + computeSubscriptionState)
  - refreshSubscription() on SubscriptionContextValue for both web and native
  - restorePurchases() web path (getWebCustomerInfo instead of native store restore)
key_files:
  - src/features/subscriptions/SubscriptionContext.tsx
key_decisions:
  - Web branch uses dynamic import('@/features/subscriptions/web-billing') consistent with native react-native-purchases pattern — keeps web-billing out of native bundles
  - refreshSubscription() shares same getWebCustomerInfo/getScanCount logic as the useEffect web branch — no extra abstraction needed
patterns_established:
  - cancelled flag + loadWebState async IIFE pattern mirrors native loadSubscriptionState pattern
  - restorePurchases guarded with Platform.OS !== 'web' — web path refreshes CustomerInfo (no store restore concept)
observability_surfaces:
  - console.warn('[SubscriptionProvider] web SDK failed:', message) on web init/fetch failure
  - isLoading: true set before loadWebState() — UI loading signal during web fetch
duration: ~15 min
verification_result: passed
completed_at: 2026-03-17
blocker_discovered: false
---

# T02: Activate web SDK path in SubscriptionContext.tsx

**Replaced the immediate DEFAULT_STATE early return in the web branch with real SDK init + CustomerInfo fetch, and added `refreshSubscription()` to context value.**

## What Happened

Modified `SubscriptionContext.tsx` to:
1. Added `refreshSubscription: () => Promise<void>` to `SubscriptionContextValue` type
2. Replaced the web early-return stub with a real async `loadWebState()` that calls `initializeWebBilling(apiKey, userId)` then `getWebCustomerInfo()` + `getScanCount()` via dynamic import, with cancellation guard
3. Implemented `refreshSubscription()` for both web (getWebCustomerInfo) and native (Purchases.getCustomerInfo) paths
4. Updated `restorePurchases()` to use `getWebCustomerInfo()` on web instead of crashing with native restore

## Verification

- `npx tsc --noEmit` → 0 output, exit 0
- `npx jest --no-coverage` → 640 tests, 0 failures (≥628 required)
- `rg "DEFAULT_STATE"` → only in const definition and fallback error paths, not as web early-return when userId present
- `rg "refreshSubscription"` → present in type, useState Omit, function declaration, and value object

## Diagnostics

- `console.warn('[SubscriptionProvider] web SDK failed:', message)` surfaces init or fetch failures
- `isLoading: true` set before async web fetch — visible in React DevTools
- `EXPO_PUBLIC_REVENUECAT_WEB_API_KEY` consumed via `process.env` — `rg "EXPO_PUBLIC_REVENUECAT_WEB_API_KEY" src/` shows all consumption points

## Deviations

none

## Known Issues

none

## Files Created/Modified

- `src/features/subscriptions/SubscriptionContext.tsx` — web branch now initializes SDK and fetches real state; refreshSubscription added; restorePurchases handles web path
