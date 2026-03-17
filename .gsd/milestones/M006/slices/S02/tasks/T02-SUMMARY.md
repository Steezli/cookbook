---
id: T02
parent: S02
milestone: M006
provides:
  - TypeScript type declarations for react-native-purchases (RevenueCat SDK)
key_files:
  - src/features/subscriptions/types/react-native-purchases.d.ts
key_decisions:
  - Followed exact same module declaration pattern as react-native-google-mobile-ads.d.ts
patterns_established:
  - declare module 'react-native-purchases' with const Purchases default export and named CustomerInfo/EntitlementInfo interfaces
observability_surfaces:
  - none — compile-time only; `npx tsc --noEmit` surfaces any type drift
duration: ~5 minutes
verification_result: passed
completed_at: 2026-03-17
blocker_discovered: false
---

# T02: Add react-native-purchases type declarations

**Created minimal TypeScript type declarations for `react-native-purchases` so the SDK can be dynamically imported without compile errors in local dev.**

## What Happened

Read the existing `react-native-google-mobile-ads.d.ts` for the exact module declaration pattern, then created `src/features/subscriptions/types/react-native-purchases.d.ts` with the full API surface needed by `SubscriptionContext.tsx`:
- `EntitlementInfo` with `expirationDate`, `willRenew`, `productIdentifier`
- `CustomerInfo` with `entitlements.active: Record<string, EntitlementInfo>`
- `Purchases` default export with `configure`, `getCustomerInfo`, `restorePurchases`, `addCustomerInfoUpdateListener`, `removeCustomerInfoUpdateListener`

## Verification

`npx tsc --noEmit` — exits with only one error:
```
src/features/subscriptions/__tests__/subscription-context.test.ts(72,42): error TS2307: Cannot find module '@/features/subscriptions/SubscriptionContext'
```
No `react-native-purchases` type errors. The one remaining error is the missing `SubscriptionContext.tsx` which T03 will create.

## Diagnostics

- `npx tsc --noEmit` — any type error on `react-native-purchases` imports points to this file
- After T03: `npx tsc --noEmit` should exit 0 with zero errors

## Deviations

none

## Known Issues

none

## Files Created/Modified

- `src/features/subscriptions/types/react-native-purchases.d.ts` — type declarations for react-native-purchases default export
