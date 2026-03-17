---
estimated_steps: 5
estimated_files: 3
---

# T01: Install @revenuecat/purchases-js and write web-billing.ts with Jest tests

**Slice:** S05 — Web Billing via Stripe
**Milestone:** M006

## Description

Install the `@revenuecat/purchases-js` package and create the `web-billing.ts` wrapper module with `initializeWebBilling`, `startWebCheckout`, and `getWebCustomerInfo` exports. Write Jest tests (with a mocked SDK) that prove the module's contract: guard against double-init, handle null offerings, swallow `UserCancelledError`, and verify that `computeSubscriptionState` correctly handles the web SDK's `CustomerInfo` shape.

These tests must be written first and will serve as the contract anchor for T02 and T03.

## Steps

1. Run `npx expo install @revenuecat/purchases-js` to add the dependency.

2. Create `src/features/subscriptions/web-billing.ts`:
   - Import `Purchases, CustomerInfo, ErrorCode, PurchasesError` from `@revenuecat/purchases-js`
   - Export `CustomerInfoLike` type alias (same shape as in `SubscriptionContext.tsx` — `{ entitlements?: { active?: Record<string, unknown> } } | null`)
   - Export `initializeWebBilling(apiKey: string, appUserId: string): Promise<void>` — checks `Purchases.isConfigured()` before calling `Purchases.configure({ apiKey, appUserId })`
   - Export `getWebCustomerInfo(): Promise<CustomerInfoLike>` — calls the configured `Purchases` instance's `getCustomerInfo()` via `new Purchases(apiKey)` pattern OR the static/singleton accessor per the SDK's API
   - Export `startWebCheckout(userEmail?: string): Promise<CustomerInfoLike>` — gets offerings via `purchases.getOfferings()`, throws `new Error('No offering available — check RevenueCat dashboard configuration')` if `offerings.current?.monthly` is null/undefined, calls `purchases.purchase({ rcPackage: offerings.current.monthly, customerEmail: userEmail })`, re-fetches and returns updated CustomerInfo; catches `PurchasesError` where `error.errorCode === ErrorCode.UserCancelledError` and returns null silently
   - NOTE: `@revenuecat/purchases-js` uses an instance pattern — store the configured instance in a module-level variable; `initializeWebBilling` creates/replaces it

3. Create `src/features/subscriptions/__tests__/web-billing.test.ts`:
   - Mock `@revenuecat/purchases-js` at top: `jest.mock('@revenuecat/purchases-js', ...)`
   - Mock shape: `Purchases` class with `isConfigured()` static, `configure()` static, instance methods `getCustomerInfo()`, `getOfferings()`, `purchase()`
   - Test (a): `initializeWebBilling` does NOT call configure when `isConfigured()` returns true
   - Test (b): `initializeWebBilling` DOES call configure when `isConfigured()` returns false
   - Test (c): `startWebCheckout` throws "No offering available" when `getOfferings()` returns `{ current: null }`
   - Test (d): `startWebCheckout` resolves to null (no throw) when `purchase()` throws a `PurchasesError` with `errorCode === ErrorCode.UserCancelledError`
   - Test (e): `computeSubscriptionState` with web CustomerInfo `{ entitlements: { active: { premium: { isActive: true } } } }` → `isSubscriber: true`
   - Test (f): `computeSubscriptionState` with `{ entitlements: { active: {} } }` → `isSubscriber: false, scansRemaining: 3`
   - Import `computeSubscriptionState` from `SubscriptionContext.tsx` for tests (e) and (f)

4. Verify tests and TypeScript:
   - `npx jest src/features/subscriptions/__tests__/web-billing.test.ts --no-coverage`
   - `npx tsc --noEmit`

5. Confirm package is in `package.json` dependencies: `grep purchases-js package.json`

## Must-Haves

- [ ] `@revenuecat/purchases-js` present in `package.json` dependencies
- [ ] `src/features/subscriptions/web-billing.ts` exports `initializeWebBilling`, `startWebCheckout`, `getWebCustomerInfo`, and `CustomerInfoLike`
- [ ] `isConfigured()` guard prevents double-initialization
- [ ] `UserCancelledError` caught silently — `startWebCheckout` returns null without throwing
- [ ] Null offering throws with descriptive message
- [ ] All 6 Jest tests pass
- [ ] `npx tsc --noEmit` exits 0

## Verification

- `npx jest src/features/subscriptions/__tests__/web-billing.test.ts --no-coverage` → 6 tests, 0 failures
- `npx tsc --noEmit` → no output, exit 0
- `grep "@revenuecat/purchases-js" package.json` → shows dependency

## Observability Impact

- Signals added/changed: `console.warn('[WebBilling] startWebCheckout failed:', message)` for non-cancel purchase errors; `console.warn('[WebBilling] initializeWebBilling failed:', message)` on init error
- How a future agent inspects this: `npx jest src/features/subscriptions/__tests__/web-billing.test.ts` is the primary contract diagnostic; all 6 tests passing = module contract intact
- Failure state exposed: null offerings error has descriptive message; UserCancelledError is silent (by design); other errors log the message

## Inputs

- `src/features/subscriptions/SubscriptionContext.tsx` — `computeSubscriptionState` function and `CustomerInfoLike` type shape to import in tests
- S05-RESEARCH.md — `@revenuecat/purchases-js` API: `Purchases.configure()`, `Purchases.isConfigured()`, `purchases.getOfferings()`, `purchases.purchase({ rcPackage })`, `ErrorCode.UserCancelledError`, `PurchasesError`

## Expected Output

- `package.json` — `@revenuecat/purchases-js` in dependencies
- `src/features/subscriptions/web-billing.ts` — new module with 3 exported functions + type alias
- `src/features/subscriptions/__tests__/web-billing.test.ts` — 6 passing tests covering double-init guard, null offerings, UserCancelledError silent path, and computeSubscriptionState with web CustomerInfo shape
