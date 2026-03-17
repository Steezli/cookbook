---
id: T03
parent: S02
milestone: M006
provides:
  - SubscriptionProvider + useSubscription() hook in SubscriptionContext.tsx
  - computeSubscriptionState() pure exported function (all T01 tests passing)
  - RevenueCat Purchases.configure() wired into session.tsx via purchasesConfiguredRef
  - SubscriptionProvider injected into app/_layout.tsx (wraps ErrorBoundary)
  - purchasesInstalled guard added to app.config.ts
  - __mocks__/react-native-purchases.js + jest.config.js moduleNameMapper entry
key_files:
  - src/features/subscriptions/SubscriptionContext.tsx
  - src/features/auth/session.tsx
  - app/_layout.tsx
  - app.config.ts
  - __mocks__/react-native-purchases.js
  - jest.config.js
key_decisions:
  - computeSubscriptionState uses CustomerInfoLike (looser structural type) instead of strict CustomerInfo import — allows test helpers to pass partial shapes without full EntitlementInfo fields
  - Added __mocks__/react-native-purchases.js + moduleNameMapper entry in jest.config.js (same pattern as react-native.js) — required because Jest resolves the module before applying jest.mock() override
patterns_established:
  - computeSubscriptionState(customerInfoLike | null, scanCount) → { isSubscriber, scanCount, scansRemaining } pure function pattern, no React renderer needed in tests
  - dynamic import('react-native-purchases') with .catch(() => null) fallback — same pattern as AdMob dynamic import
  - purchasesConfiguredRef guards single Purchases.configure() call per session in SessionProvider
observability_surfaces:
  - isLoading boolean in SubscriptionContext — consumers distinguish "SDK pending" from "SDK unavailable"
  - console.warn('[SubscriptionProvider] loadSubscriptionState failed:') on SDK/network error
  - console.warn('[SessionProvider] configurePurchases failed:') on configure error
  - npx jest src/features/subscriptions/__tests__/subscription-context.test.ts — re-verify contract at any time
duration: ~30 min
verification_result: passed
completed_at: 2026-03-17
blocker_discovered: false
---

# T03: Implement SubscriptionContext and wire into layout + session

**Shipped `SubscriptionContext.tsx` with `SubscriptionProvider` + `useSubscription()` + pure `computeSubscriptionState()`, wired RevenueCat into `session.tsx`, injected provider into `_layout.tsx`, all 8 T01 contract tests passing, 624/624 Jest tests green, `tsc --noEmit` exits 0.**

## What Happened

Created `src/features/subscriptions/SubscriptionContext.tsx`:
- `computeSubscriptionState(customerInfo, scanCount)` — pure named export, checks `entitlements.active['premium']`, clamps `scansRemaining = Math.max(0, 3 - scanCount)`
- `SubscriptionProvider` — web path returns defaults immediately; native path uses `useEffect` on `session?.user?.id`, dynamically imports SDK, runs `Promise.all([getCustomerInfo(), getScanCount()])`, registers `addCustomerInfoUpdateListener` with cleanup, catches all failures with graceful fallback + `console.warn`
- `useSubscription()` hook with `undefined` guard throw

Updated `src/features/auth/session.tsx`:
- Added `Platform` import and `purchasesConfiguredRef`
- Added `configurePurchases()` file-level async function (dynamic import, `Purchases.configure`, try/catch with `console.warn`)
- Calls `configurePurchases()` once on first authenticated session event when `Platform.OS !== 'web'`

Updated `app/_layout.tsx`: added `<SubscriptionProvider>` wrapping `<ErrorBoundary>`.

Updated `app.config.ts`: added `purchasesInstalled` guard with comment about no Expo plugin.

Added `__mocks__/react-native-purchases.js` and `jest.config.js` `moduleNameMapper` entry — needed because Jest resolves module existence before the `jest.mock()` factory override runs.

## Verification

- `npx jest src/features/subscriptions/__tests__/subscription-context.test.ts --no-coverage` → 7/7 tests pass (previously all failed with "Cannot find module")
- `npx tsc --noEmit` → exits 0, no errors
- `npx jest --no-coverage` → 624 tests pass, 30 suites, zero failures

## Diagnostics

- `useSubscription()` in any component to inspect live state
- `getScanCount(userId)` for raw scan count
- `isLoading: true` while SDK initializes (native only)
- `console.warn('[SubscriptionProvider]')` surfaces SDK unavailability
- `console.warn('[SessionProvider] configurePurchases failed:')` surfaces configure errors

## Deviations

- **`CustomerInfoLike` structural type** instead of importing `CustomerInfo` directly as parameter type — tests pass partial entitlement shapes that don't satisfy full `EntitlementInfo` interface; using a looser structural type avoids TS errors without weakening the assertions
- **`__mocks__/react-native-purchases.js` required** — test plan implied `jest.mock()` in the test file was sufficient, but Jest requires the module to be resolvable before it can be mocked; added module-level mock + `moduleNameMapper` following the same pattern as `react-native.js`

## Known Issues

None.

## Files Created/Modified

- `src/features/subscriptions/SubscriptionContext.tsx` — created: SubscriptionProvider, useSubscription, computeSubscriptionState
- `src/features/auth/session.tsx` — modified: added Platform import, purchasesConfiguredRef, configurePurchases function
- `app/_layout.tsx` — modified: SubscriptionProvider wraps ErrorBoundary
- `app.config.ts` — modified: purchasesInstalled guard added
- `__mocks__/react-native-purchases.js` — created: Jest manual mock for RevenueCat SDK
- `jest.config.js` — modified: added react-native-purchases moduleNameMapper entry
