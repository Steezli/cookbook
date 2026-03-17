---
id: T01
parent: S05
milestone: M006
provides:
  - web-billing.ts module with initializeWebBilling, startWebCheckout, getWebCustomerInfo
  - 6 Jest tests anchoring the web billing module contract
  - @revenuecat/purchases-js installed
key_files:
  - src/features/subscriptions/web-billing.ts
  - src/features/subscriptions/__tests__/web-billing.test.ts
key_decisions:
  - PurchasesError constructor takes (errorCode, message?) not (message, errorCode) — matches SDK declaration
  - Mock wiring: mock class statics defined inside jest.mock factory, then re-imported to attach shared jest.fn refs via beforeAll
  - web-billing test mocks @/features/auth/session and scan-count to avoid supabase/native import chain
patterns_established:
  - Module-level singleton pattern: _purchases variable set by initializeWebBilling, used by getWebCustomerInfo/startWebCheckout
  - isConfigured() guard prevents double-init on React re-renders
  - UserCancelledError caught silently (returns null), other errors logged + rethrown
observability_surfaces:
  - console.warn('[WebBilling] startWebCheckout failed:', message) for non-cancel errors
  - console.warn('[WebBilling] initializeWebBilling failed:', message) on init error
  - npx jest src/features/subscriptions/__tests__/web-billing.test.ts — 6 tests = contract intact
duration: ~20min
verification_result: passed
completed_at: 2026-03-17
blocker_discovered: false
---

# T01: Install @revenuecat/purchases-js and write web-billing.ts with Jest tests

**Installed `@revenuecat/purchases-js@^1.29.0`, created `web-billing.ts` wrapper module, and wrote 6 passing Jest tests anchoring its contract.**

## What Happened

1. Installed `@revenuecat/purchases-js` via `npx expo install` — confirmed in `package.json` dependencies.
2. Created `src/features/subscriptions/web-billing.ts` with module-level `_purchases` singleton:
   - `initializeWebBilling(apiKey, appUserId)` — guards with `Purchases.isConfigured()` before calling `Purchases.configure({ apiKey, appUserId })`
   - `getWebCustomerInfo()` — delegates to `_purchases.getCustomerInfo()`
   - `startWebCheckout(userEmail?)` — fetches offerings, checks `offerings.current?.monthly`, calls `purchase({ rcPackage })`, re-fetches CustomerInfo; catches `UserCancelledError` silently (returns null)
3. Created `src/features/subscriptions/__tests__/web-billing.test.ts` with 6 tests covering all contract points.

Key SDK finding: `PurchasesError` constructor is `(errorCode: ErrorCode, message?: string)` — errorCode is first, unlike typical Error subclasses. Test mock was updated to match.

## Verification

- `npx jest src/features/subscriptions/__tests__/web-billing.test.ts --no-coverage` → **6 tests, 0 failures**
- `npx tsc --noEmit` → **no output, exit 0**
- `grep "@revenuecat/purchases-js" package.json` → `"@revenuecat/purchases-js": "^1.29.0"`
- `npx jest --no-coverage` → **640 tests, 0 failures** (no regressions)

## Diagnostics

- Run `npx jest src/features/subscriptions/__tests__/web-billing.test.ts` to verify module contract.
- `console.warn('[WebBilling] ...')` surfaces non-cancel errors at runtime.
- UserCancelledError is intentionally silent — returns null without warning.

## Deviations

- Added mocks for `@/features/auth/session`, `@/features/subscriptions/scan-count`, `react-native`, and `react-native-purchases` in the test file to avoid the `react-native-url-polyfill` ESM import chain triggered by `SubscriptionContext.tsx`. No jest.config.js change needed — matches the pattern used in `subscription-context.test.ts`.

## Known Issues

none

## Files Created/Modified

- `src/features/subscriptions/web-billing.ts` — new module: 3 exported functions + CustomerInfoLike type
- `src/features/subscriptions/__tests__/web-billing.test.ts` — 6 Jest tests covering module contract
- `package.json` — added `@revenuecat/purchases-js: ^1.29.0` dependency
