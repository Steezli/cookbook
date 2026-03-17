---
id: S02
parent: M006
milestone: M006
provides:
  - SubscriptionProvider + useSubscription() hook in SubscriptionContext.tsx
  - computeSubscriptionState() pure exported function (Jest-testable without React renderer)
  - RevenueCat Purchases.configure() wired into session.tsx via purchasesConfiguredRef guard
  - SubscriptionProvider injected into app/_layout.tsx (wraps ErrorBoundary, inside SessionProvider)
  - react-native-purchases TypeScript type declarations (no SDK install required)
  - __mocks__/react-native-purchases.js + jest.config.js moduleNameMapper entry
  - purchasesInstalled guard in app.config.ts
requires:
  - slice: S01
    provides: getScanCount() + incrementScanCount() from scan-count.ts, ScanLimitError
affects:
  - S03
  - S04
  - S05
key_files:
  - src/features/subscriptions/SubscriptionContext.tsx
  - src/features/subscriptions/types/react-native-purchases.d.ts
  - src/features/subscriptions/__tests__/subscription-context.test.ts
  - src/features/auth/session.tsx
  - app/_layout.tsx
  - app.config.ts
  - __mocks__/react-native-purchases.js
  - jest.config.js
key_decisions:
  - computeSubscriptionState uses CustomerInfoLike (loose structural type) not strict CustomerInfo import — allows test helpers to pass partial shapes without full EntitlementInfo fields
  - __mocks__/react-native-purchases.js + moduleNameMapper required — Jest resolves module existence before jest.mock() factory override runs
  - Purchases.configure() in session.tsx not SubscriptionProvider — eliminates SDK initialization race at auth event
  - purchasesConfiguredRef guards single configure() call per session
  - Web path returns defaults (isSubscriber: false, scansRemaining: 3) immediately without touching native SDK
patterns_established:
  - computeSubscriptionState(customerInfoLike | null, scanCount) → { isSubscriber, scanCount, scansRemaining } pure function, tested without React renderer
  - dynamic import('react-native-purchases') with .catch(() => null) fallback — same as AdMob dynamic import
  - purchasesConfiguredRef pattern for single-call SDK configuration in auth provider
observability_surfaces:
  - isLoading boolean in SubscriptionContext — consumers distinguish "SDK pending" from "checked, no subscription"
  - console.warn('[SubscriptionProvider] loadSubscriptionState failed:') on SDK/network error
  - console.warn('[SessionProvider] configurePurchases failed:') on configure error
  - npx jest src/features/subscriptions/__tests__/subscription-context.test.ts — contract verification
drill_down_paths:
  - .gsd/milestones/M006/slices/S02/tasks/T01-SUMMARY.md
  - .gsd/milestones/M006/slices/S02/tasks/T02-SUMMARY.md
  - .gsd/milestones/M006/slices/S02/tasks/T03-SUMMARY.md
duration: ~55m
verification_result: passed
completed_at: 2026-03-17
---

# S02: RevenueCat SDK + Subscription Context

**Shipped `useSubscription()` hook returning `{ isSubscriber, scanCount, scansRemaining, isLoading, restorePurchases }` — RevenueCat initialized in session provider via dynamic import + fallback, TypeScript compiles clean, 624/624 Jest tests green.**

## What Happened

**T01** wrote 7 failing contract tests for a `computeSubscriptionState()` pure function — defining the exact semantics of `isSubscriber`, `scansRemaining`, and SDK-unavailability fallback before any implementation existed. Tests used `jest.mock('react-native-purchases')` and mocked Platform, `getScanCount`, and `useSession`.

**T02** created `src/features/subscriptions/types/react-native-purchases.d.ts` with `declare module 'react-native-purchases'` — same pattern as `react-native-google-mobile-ads.d.ts`. After T02, `npx tsc --noEmit` failed only on the missing `SubscriptionContext` module.

**T03** delivered the full implementation:
- `SubscriptionContext.tsx`: `computeSubscriptionState()` checks `entitlements.active['premium']`, clamps `scansRemaining = Math.max(0, 3 - scanCount)`. `SubscriptionProvider` uses web-path fast return vs native-path `useEffect` on `session?.user?.id`, with `Promise.all([getCustomerInfo(), getScanCount()])`, `addCustomerInfoUpdateListener` with cleanup, and graceful fallback on all failure paths.
- `session.tsx`: `configurePurchases()` file-level async function with dynamic import + try/catch; `purchasesConfiguredRef` ensures configure is called at most once per session.
- `app/_layout.tsx`: `<SubscriptionProvider>` wrapping `<ErrorBoundary>` inside `<SessionProvider>`.
- `app.config.ts`: `purchasesInstalled` guard (no Expo plugin needed for react-native-purchases).
- `__mocks__/react-native-purchases.js` + `jest.config.js` moduleNameMapper — required because Jest resolves module existence before `jest.mock()` factory runs.

## Verification

- `npx jest src/features/subscriptions/__tests__/subscription-context.test.ts --no-coverage` → 7/7 pass
- `npx tsc --noEmit` → exits 0
- `npx jest --no-coverage` → 624 tests, 30 suites, zero failures

## Requirements Advanced

- SUB-01 — RevenueCat SDK initialized and entitlement check pattern established; `isSubscriber` state available app-wide
- SUB-04 — `isSubscriber` from `useSubscription()` is the signal AdBanner will use in S04 for ad suppression
- SUB-05 — `scansRemaining = Math.max(0, 3 - scanCount)` computed from S01 scan count infrastructure
- SUB-06 — `scanCount` and `scansRemaining` fields available from `useSubscription()`; display wiring deferred to S03

## Requirements Validated

- None at this slice — contract proof only; runtime validation deferred to EAS build (milestone DoD)

## New Requirements Surfaced

- none

## Requirements Invalidated or Re-scoped

- none

## Deviations

- **`CustomerInfoLike` structural type** instead of importing `CustomerInfo` directly — tests pass partial entitlement shapes that don't satisfy full `EntitlementInfo`; loose structural type avoids TS errors without weakening assertions
- **`__mocks__/react-native-purchases.js` required** — plan assumed `jest.mock()` in test file was sufficient; Jest requires the module to be resolvable; added module-level mock + moduleNameMapper following `react-native.js` precedent

## Known Limitations

- Real RevenueCat SDK initialization requires an EAS build — not testable in local dev; deferred to milestone DoD
- `EXPO_PUBLIC_REVENUECAT_API_KEY` not yet validated — env var is read but empty string is acceptable in dev (SDK configure will warn, not throw)
- Web billing (`@revenuecat/purchases-js`) not yet wired; web path returns `isSubscriber: false` as placeholder (S05)

## Follow-ups

- S03: Wire scan gating — `createMultiPhotoScanJob` checks `isSubscriber`, calls `incrementScanCount`, throws `ScanLimitError` at count ≥ 3; scan screen shows `scansRemaining` badge and catches `ScanLimitError` to present paywall
- S04: Update `AdBanner` to call `useSubscription()` and return null for subscribers
- S05: Platform-branch `SubscriptionContext.tsx` to use `@revenuecat/purchases-js` on web

## Files Created/Modified

- `src/features/subscriptions/SubscriptionContext.tsx` — created: SubscriptionProvider, useSubscription, computeSubscriptionState
- `src/features/subscriptions/types/react-native-purchases.d.ts` — created: TypeScript module declarations for RevenueCat SDK
- `src/features/subscriptions/__tests__/subscription-context.test.ts` — created: 7 contract tests for computeSubscriptionState
- `src/features/auth/session.tsx` — modified: Platform import, purchasesConfiguredRef, configurePurchases()
- `app/_layout.tsx` — modified: SubscriptionProvider wrapping ErrorBoundary
- `app.config.ts` — modified: purchasesInstalled guard
- `__mocks__/react-native-purchases.js` — created: Jest manual mock for RevenueCat SDK
- `jest.config.js` — modified: moduleNameMapper entry for react-native-purchases

## Forward Intelligence

### What the next slice should know
- `useSubscription()` is available in any component inside `SubscriptionProvider` — `isSubscriber` is the gating signal for both S03 and S04
- `isLoading: true` only during initial SDK fetch on native; always `false` on web; consumers should handle both states gracefully
- `restorePurchases()` is wired and returns `Promise<void>` — call it from the paywall's restore button

### What's fragile
- `purchasesConfiguredRef` is a `useRef` inside `SessionProvider` — if `SessionProvider` unmounts and remounts (unlikely but possible in test environments), the ref resets and configure could be called again; acceptable for production but worth knowing
- `addCustomerInfoUpdateListener` cleanup runs on `session?.user?.id` change — if user signs out then signs back in, a new listener is registered correctly

### Authoritative diagnostics
- `npx jest src/features/subscriptions/__tests__/subscription-context.test.ts` — first check when subscription state logic seems wrong
- `console.warn('[SubscriptionProvider]')` in device logs — signals SDK unavailability or network failure during entitlement check
- `isLoading` still `true` after mount → check that `session?.user?.id` is non-null and SDK import resolved

### What assumptions changed
- Test plan assumed `jest.mock()` in test file was sufficient for react-native-purchases — Jest actually requires the module to be resolvable on disk; solved with `__mocks__/react-native-purchases.js` + moduleNameMapper (same as react-native.js precedent)
