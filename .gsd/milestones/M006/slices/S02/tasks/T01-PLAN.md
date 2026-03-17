---
estimated_steps: 4
estimated_files: 1
---

# T01: Write failing contract tests for SubscriptionContext

**Slice:** S02 — RevenueCat SDK + Subscription Context
**Milestone:** M006

## Description

Write the Jest contract tests for `useSubscription()` before the implementation exists. The tests define the exact contract — `isSubscriber` semantics, `scansRemaining` computation, `isLoading` resolution, SDK unavailability fallback. All tests should run but fail (missing module) until T03 implements `SubscriptionContext.tsx`. This test-first approach locks the interface before any code is written.

## Steps

1. Create `src/features/subscriptions/__tests__/subscription-context.test.ts`. Add mocks at the top: `jest.mock('react-native-purchases')` with a default export object containing `configure`, `getCustomerInfo` (returns `{ entitlements: { active: {} } }`), `restorePurchases`, `addCustomerInfoUpdateListener`, `removeCustomerInfoUpdateListener`. Mock `react-native` Platform (same proxy pattern as `AdBanner.test.ts`). Mock `@/features/subscriptions/scan-count` returning `getScanCount` that resolves `1`. Mock `@/features/auth/session` with `useSession` returning `{ session: { user: { id: 'test-user-id' } }, isLoading: false }`.

2. Write test group "isSubscriber": (a) when `getCustomerInfo` returns no active entitlements → `isSubscriber` is `false`; (b) when `getCustomerInfo` returns `entitlements.active['premium']` populated → `isSubscriber` is `true`.

3. Write test group "scansRemaining": (a) `getScanCount` returns 1 → `scansRemaining = 2`; (b) `getScanCount` returns 3 → `scansRemaining = 0`; (c) `getScanCount` returns 5 (edge: over limit) → `scansRemaining = 0` (Math.max(0, ...)).

4. Write test group "loading and fallback": (a) `isLoading` is `false` after SDK responds (not stuck true); (b) SDK import throws → `isSubscriber: false`, `isLoading: false` (fallback path resolves cleanly).

Since `SubscriptionContext` exports a hook that uses React context, these tests will use a minimal helper: import `useSubscription` and a mock `SubscriptionProvider`-like wrapper, or test the pure computation functions if exported. If the context value is computed from pure functions (`computeSubscriptionState`), export and test those directly. Design the test to work in Node environment without a React renderer — the `AdBanner.test.ts` pattern uses pure function calls from config/consent modules. For SubscriptionContext, extract the state computation logic into a pure `computeSubscriptionState(customerInfo, scanCount)` function that returns `{ isSubscriber, scanCount, scansRemaining }`, test that function directly. Alternatively, use `@testing-library/react-hooks` if already available in the project — check `package.json` first and follow existing test patterns.

## Must-Haves

- [ ] Test file exists at `src/features/subscriptions/__tests__/subscription-context.test.ts`
- [ ] `jest.mock('react-native-purchases')` at top of file with full shape
- [ ] `react-native` Platform mock (proxy pattern)
- [ ] Tests for `isSubscriber: false` with no entitlement
- [ ] Tests for `isSubscriber: true` with active "premium" entitlement
- [ ] Tests for `scansRemaining` computation including Math.max(0, ...) edge case
- [ ] Tests for `isLoading: false` resolution
- [ ] Tests for SDK unavailable fallback (`isSubscriber: false`, `isLoading: false`)

## Verification

- `npx jest src/features/subscriptions/__tests__/subscription-context.test.ts --no-coverage` — tests run (no syntax errors), all FAIL because `SubscriptionContext.tsx` does not exist yet
- The failure reason should be "Cannot find module" or "does not provide an export named" — not a syntax error in the test file itself

## Observability Impact

- Signals added/changed: None at runtime — test-only artifact
- How a future agent inspects this: `npx jest src/features/subscriptions/__tests__/subscription-context.test.ts` — instant contract verification
- Failure state exposed: Test failures surface exactly which contract assertion broke

## Inputs

- `src/features/subscriptions/scan-count.ts` — `getScanCount` signature to mock
- `src/features/auth/session.tsx` — `useSession` return shape to mock
- `src/features/ads/__tests__/AdBanner.test.ts` — Platform mock pattern to replicate
- `package.json` — check for `@testing-library/react-hooks` availability

## Expected Output

- `src/features/subscriptions/__tests__/subscription-context.test.ts` — complete test file with 6–8 failing tests, no syntax errors
