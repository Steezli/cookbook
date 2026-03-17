---
id: T01
parent: S02
milestone: M006
provides:
  - Failing contract tests for SubscriptionContext / useSubscription() hook
key_files:
  - src/features/subscriptions/__tests__/subscription-context.test.ts
key_decisions:
  - Test targets pure `computeSubscriptionState(customerInfo, scanCount)` function to avoid React renderer in Node tests — same pattern as AdBanner.test.ts
patterns_established:
  - computeSubscriptionState(customerInfo | null, scanCount) → { isSubscriber, scanCount, scansRemaining } pure function pattern for subscription state
observability_surfaces:
  - npx jest src/features/subscriptions/__tests__/subscription-context.test.ts — instant contract verification
duration: ~10m
verification_result: failing (expected — SubscriptionContext.tsx does not exist yet)
completed_at: 2026-03-17
blocker_discovered: false
---

# T01: Write failing contract tests for SubscriptionContext

**Created 8 contract tests for `computeSubscriptionState` that fail with "Cannot find module" until T03 implements `SubscriptionContext.tsx`.**

## What Happened

Wrote `src/features/subscriptions/__tests__/subscription-context.test.ts` with:
- Full `jest.mock('react-native-purchases')` with configure, getCustomerInfo, restorePurchases, addCustomerInfoUpdateListener, removeCustomerInfoUpdateListener
- react-native Platform proxy mock (matching AdBanner.test.ts pattern)
- Mocks for `@/features/subscriptions/scan-count` (getScanCount) and `@/features/auth/session` (useSession)
- 8 tests across 4 groups: isSubscriber (2), scansRemaining (3), loading and fallback (2)

The tests import `computeSubscriptionState` from `@/features/subscriptions/SubscriptionContext` — which establishes the contract that T03 must satisfy: a pure exported function accepting `(customerInfo | null, scanCount: number)` returning `{ isSubscriber, scanCount, scansRemaining }`.

The `null` customerInfo case (SDK unavailable fallback) returns `isSubscriber: false` with `scansRemaining = FREE_SCAN_LIMIT (3)`.

## Verification

```
npx jest src/features/subscriptions/__tests__/subscription-context.test.ts --no-coverage
```

Output:
```
FAIL src/features/subscriptions/__tests__/subscription-context.test.ts
  ● Test suite failed to run
    Cannot find module '@/features/subscriptions/SubscriptionContext'
```

Failure reason is "Cannot find module" (TS2307) — not a syntax error. All 8 tests are structurally valid.

## Diagnostics

- Run `npx jest src/features/subscriptions/__tests__/subscription-context.test.ts` to verify the contract at any time
- After T03 ships SubscriptionContext.tsx with `export function computeSubscriptionState(...)`, all 8 tests should pass

## Deviations

None — followed plan exactly.

## Known Issues

None.

## Files Created/Modified

- `src/features/subscriptions/__tests__/subscription-context.test.ts` — 8 failing contract tests for SubscriptionContext
