---
estimated_steps: 2
estimated_files: 1
---

# T02: Add react-native-purchases type declarations

**Slice:** S02 — RevenueCat SDK + Subscription Context
**Milestone:** M006

## Description

Create minimal TypeScript type declarations for `react-native-purchases` so the SDK can be dynamically imported in `SubscriptionContext.tsx` and `session.tsx` without TypeScript errors in local dev (where the package is not installed). Follows the exact same pattern as `src/features/ads/types/react-native-google-mobile-ads.d.ts`.

## Steps

1. Read `src/features/ads/types/react-native-google-mobile-ads.d.ts` to confirm the exact module declaration pattern (already reviewed in research; re-read for accuracy before writing).

2. Create `src/features/subscriptions/types/react-native-purchases.d.ts` with:
   ```
   declare module 'react-native-purchases' {
     export interface EntitlementInfo {
       expirationDate: string | null;
       willRenew: boolean;
       productIdentifier: string;
     }
     export interface CustomerInfo {
       entitlements: {
         active: Record<string, EntitlementInfo>;
       };
     }
     const Purchases: {
       configure(options: { apiKey: string; appUserID: string }): void;
       getCustomerInfo(): Promise<CustomerInfo>;
       restorePurchases(): Promise<CustomerInfo>;
       addCustomerInfoUpdateListener(listener: (info: CustomerInfo) => void): void;
       removeCustomerInfoUpdateListener(listener: (info: CustomerInfo) => void): void;
     };
     export default Purchases;
   }
   ```

## Must-Haves

- [ ] File exists at `src/features/subscriptions/types/react-native-purchases.d.ts`
- [ ] `declare module 'react-native-purchases'` with default export `Purchases`
- [ ] `Purchases.configure({ apiKey, appUserID })` typed
- [ ] `Purchases.getCustomerInfo()` returns `Promise<CustomerInfo>`
- [ ] `Purchases.restorePurchases()` returns `Promise<CustomerInfo>`
- [ ] `Purchases.addCustomerInfoUpdateListener` and `removeCustomerInfoUpdateListener` typed
- [ ] `CustomerInfo.entitlements.active` typed as `Record<string, EntitlementInfo>`
- [ ] `EntitlementInfo` has `expirationDate`, `willRenew`, `productIdentifier`

## Verification

- `npx tsc --noEmit` — exits 0 (or at worst fails only on missing `SubscriptionContext.tsx` imports, not on `react-native-purchases` type errors)
- After T03: `npx tsc --noEmit` exits 0 with zero errors

## Observability Impact

- Signals added/changed: None — compile-time only
- How a future agent inspects this: `npx tsc --noEmit` — any type error on `react-native-purchases` imports points to this file
- Failure state exposed: TypeScript compile errors if types drift from actual SDK API

## Inputs

- `src/features/ads/types/react-native-google-mobile-ads.d.ts` — exact pattern to follow
- S02 Research doc — confirmed API surface: `configure`, `getCustomerInfo`, `restorePurchases`, `addCustomerInfoUpdateListener`, `removeCustomerInfoUpdateListener`, `CustomerInfo`, `EntitlementInfo`

## Expected Output

- `src/features/subscriptions/types/react-native-purchases.d.ts` — type declarations for `react-native-purchases` default export
