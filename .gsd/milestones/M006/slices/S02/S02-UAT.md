# S02: RevenueCat SDK + Subscription Context — UAT

**Milestone:** M006
**Written:** 2026-03-17

## UAT Type

- UAT mode: artifact-driven
- Why this mode is sufficient: S02 is contract proof only — the RevenueCat SDK requires an EAS build for real runtime verification (documented in milestone proof strategy). Jest tests exercising `computeSubscriptionState()` and `isLoading` semantics are the full proof for this slice. Real runtime verification is deferred to milestone DoD.

## Preconditions

- `node_modules` installed
- No EAS build or device required
- `src/features/subscriptions/__tests__/subscription-context.test.ts` exists

## Smoke Test

```
npx jest src/features/subscriptions/__tests__/subscription-context.test.ts --no-coverage
```

Expected: 7 tests pass, 0 failures.

## Test Cases

### 1. No active entitlement → isSubscriber false

1. Run contract test: "is false when getCustomerInfo returns no active entitlements"
2. Mock `getCustomerInfo` returns `CustomerInfo` with empty `entitlements.active`
3. **Expected:** `computeSubscriptionState(customerInfo, 0).isSubscriber === false`

### 2. Active "premium" entitlement → isSubscriber true

1. Run contract test: "is true when getCustomerInfo returns active 'premium' entitlement"
2. Mock `getCustomerInfo` returns `CustomerInfo` with `entitlements.active['premium']` present
3. **Expected:** `computeSubscriptionState(customerInfo, 0).isSubscriber === true`

### 3. scansRemaining computed correctly

1. Run contract tests: returns 2 when count=1, returns 0 when count=3, returns 0 when count=5
2. **Expected:** `scansRemaining = Math.max(0, 3 - scanCount)` — never negative

### 4. SDK unavailability fallback

1. Run contract test: "null customerInfo → isSubscriber false, scansRemaining clamped"
2. Pass `null` as customerInfo (SDK unavailable path)
3. **Expected:** `isSubscriber: false`, `scansRemaining: 3` (FREE_SCAN_LIMIT)

### 5. isLoading resolves to false

1. Run contract test: "computeSubscriptionState resolves synchronously (no stuck isLoading)"
2. **Expected:** `isLoading: false` — no stuck-true case

### 6. TypeScript compiles clean

1. Run `npx tsc --noEmit`
2. **Expected:** exits 0, zero errors

### 7. Full test suite regression-free

1. Run `npx jest --no-coverage`
2. **Expected:** 624 tests, 30 suites, zero failures

## Edge Cases

### Over-limit scan count (count > 3)

1. Call `computeSubscriptionState(null, 5)`
2. **Expected:** `scansRemaining === 0` — Math.max(0, 3-5) clamped to 0, never negative

### Web platform path

- Web path sets `{ isSubscriber: false, scansRemaining: 3, isLoading: false }` immediately without touching native SDK
- Verified at code inspection level (Platform.OS === 'web' branch in SubscriptionProvider)

## Failure Signals

- Any test failure in `subscription-context.test.ts` — contract regression in `computeSubscriptionState`
- `npx tsc --noEmit` reports errors on `react-native-purchases` imports — type declarations missing or malformed
- `isLoading` stuck `true` in runtime — check `session?.user?.id` availability and SDK dynamic import resolution
- `console.warn('[SubscriptionProvider] loadSubscriptionState failed:')` in device logs — SDK unavailable or network error

## Requirements Proved By This UAT

- SUB-01 (partial) — entitlement check pattern proved correct: `isSubscriber` true/false maps correctly from RevenueCat `entitlements.active['premium']`
- SUB-05 (partial) — `scansRemaining = Math.max(0, 3 - scanCount)` correctly computed from server-side scan count
- SUB-06 (partial) — `scanCount` and `scansRemaining` fields available from hook; display on scan screen deferred to S03

## Not Proven By This UAT

- Real RevenueCat SDK initialization on device (requires EAS build — deferred to milestone DoD)
- Actual purchase flow or entitlement refresh via RevenueCat dashboard
- `addCustomerInfoUpdateListener` real-time update behavior on device
- `restorePurchases()` restoring a real prior purchase on a new device
- `Purchases.configure()` called successfully with a real API key (EXPO_PUBLIC_REVENUECAT_API_KEY)
- Web billing path (`@revenuecat/purchases-js`) — deferred to S05

## Notes for Tester

- All verification for this slice is automated via Jest — no device or simulator needed
- Real device/EAS testing is explicitly deferred to milestone DoD per the M006 proof strategy
- `EXPO_PUBLIC_REVENUECAT_API_KEY` does not need to be set for S02 verification; empty string is accepted by the configure guard
