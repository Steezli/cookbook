---
id: T03
parent: S05
milestone: M006
provides:
  - PaywallPlaceholder.tsx web handleSubscribe calls startWebCheckout with user email pre-fill
  - PaywallPlaceholder.tsx web handleRestore calls refreshSubscription instead of restorePurchases
  - Zero "Coming Soon" stubs remain in PaywallPlaceholder
key_files:
  - src/features/subscriptions/PaywallPlaceholder.tsx
key_decisions:
  - Dynamic import of web-billing inside handler body keeps it out of native bundles
  - useSession() destructures { session } — session.user.email provides checkout pre-fill email
patterns_established:
  - result === null (UserCancelledError) is silent — no alert, paywall stays open
  - Successful checkout calls refreshSubscription() then onDismiss()
  - Web handleRestore uses refreshSubscription() instead of App Store restorePurchases()
observability_surfaces:
  - showAlert('Subscription Error', ...) on non-cancel checkout failure — user-visible
  - showAlert('Subscriptions Refreshed', ...) on web restore success — user-visible
  - refreshSubscription() triggers context re-fetch visible in React DevTools subscription state
duration: ~10m
verification_result: passed
completed_at: 2026-03-17
blocker_discovered: false
---

# T03: Replace "Coming Soon" stub in PaywallPlaceholder with real checkout

**Replaced the web `handleSubscribe` stub and `handleRestore` native-only call in `PaywallPlaceholder.tsx` with real `startWebCheckout()` and `refreshSubscription()` calls.**

## What Happened

- Added `useSession` import from `@/features/auth/session` and destructured `{ session }` to get user email for checkout pre-fill.
- Added `refreshSubscription` from `useSubscription()`.
- Replaced `showAlert('Coming Soon', ...)` in the web `else` branch with a dynamic import of `startWebCheckout`, passing `session?.user?.email`. Silent on `null` result (UserCancelledError), calls `refreshSubscription()` + `onDismiss()` on success, shows `showAlert('Subscription Error', ...)` on other errors.
- Updated `handleRestore` to gate the existing `restorePurchases()` path behind `Platform.OS !== 'web'`, with a web `else` block that calls `refreshSubscription()`, shows a success alert, and dismisses.

## Verification

- `rg "Coming Soon" src/features/subscriptions/PaywallPlaceholder.tsx` → 0 matches
- `npx tsc --noEmit` → exit 0, no output
- `npx jest --no-coverage` → 640 tests passed, 0 failures

## Diagnostics

- `rg "startWebCheckout" src/` shows all call sites
- `rg "Coming Soon" src/` confirms stub is gone
- Browser devtools network tab shows RevenueCat API calls during checkout
- React DevTools shows subscription state update after `refreshSubscription()`

## Deviations

none

## Known Issues

none

## Files Created/Modified

- `src/features/subscriptions/PaywallPlaceholder.tsx` — replaced Coming Soon stub with real web checkout flow; updated handleRestore for web platform
