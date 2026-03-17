# S05: Web Billing via Stripe

**Goal:** Replace the "Coming Soon" web paywall stub with a real RevenueCat Web Billing checkout, activate the web branch of `SubscriptionContext.tsx` to query live entitlement state, and verify that `computeSubscriptionState` handles the web SDK's `CustomerInfo` shape correctly.
**Demo:** On web, clicking "Subscribe" in `PaywallPlaceholder` triggers a real RevenueCat/Stripe test-mode checkout flow; after purchase, `useSubscription().isSubscriber` becomes true. `computeSubscriptionState` is proven correct for web CustomerInfo shapes and error paths via Jest. `SubscriptionContext.tsx` initializes the web SDK and fetches live entitlement state on web.

## Must-Haves

- `@revenuecat/purchases-js` installed as a project dependency
- `src/features/subscriptions/web-billing.ts` — `initializeWebBilling(apiKey, appUserId)` and `startWebCheckout(userEmail?)` exported functions
- `SubscriptionContext.tsx` web branch initializes `@revenuecat/purchases-js` SDK and fetches real `CustomerInfo` (no longer returns DEFAULT_STATE immediately)
- `PaywallPlaceholder.tsx` web `handleSubscribe` calls `startWebCheckout()` instead of "Coming Soon" alert
- `PaywallPlaceholder.tsx` web `handleRestore` calls `getCustomerInfo()` refresh instead of `restorePurchases()` (which is native-only)
- `EXPO_PUBLIC_REVENUECAT_WEB_API_KEY` env var documented and consumed
- Jest tests prove `computeSubscriptionState` handles web CustomerInfo shape, null offerings, and `UserCancelledError` silently
- `npx tsc --noEmit` exits 0
- `npx jest --no-coverage` passes (≥628 tests, 0 failures)

## Proof Level

- This slice proves: contract + integration
- Real runtime required: yes — Stripe test-mode checkout exercised manually in browser
- Human/UAT required: yes — browser verification that checkout launches and entitlement updates after purchase

## Verification

- `npx jest src/features/subscriptions/__tests__/web-billing.test.ts --no-coverage` → all tests pass
- `npx tsc --noEmit` → exits 0
- `npx jest --no-coverage` → ≥628 tests, 0 failures
- Browser: open web app → trigger paywall → click Subscribe → Stripe test checkout appears
- Browser: complete checkout with test card (4242 4242 4242 4242) → `useSubscription().isSubscriber` becomes true in context
- `rg "Coming Soon" src/features/subscriptions/PaywallPlaceholder.tsx` → 0 matches

## Observability / Diagnostics

- Runtime signals: `console.warn('[WebBilling] initializeWebBilling failed:', ...)` on SDK init failure; `console.warn('[WebBilling] startWebCheckout failed:', ...)` on non-cancel errors; `console.warn('[SubscriptionProvider] web SDK failed:', ...)` on context load failure
- Inspection surfaces: `npx jest src/features/subscriptions/__tests__/web-billing.test.ts` for contract verification; browser devtools network tab to confirm RevenueCat API calls; `useSubscription()` state visible via React DevTools
- Failure visibility: `UserCancelledError` is silent (no console noise); other errors surface via `showAlert` with actionable message; SDK init failure falls back to `DEFAULT_STATE` (same as current web behavior)
- Redaction constraints: `EXPO_PUBLIC_REVENUECAT_WEB_API_KEY` is a public env var (starts with `rcb_`) — safe to log key name, not value

## Integration Closure

- Upstream surfaces consumed: `SubscriptionContext.tsx` → `computeSubscriptionState` (no change needed); `PaywallPlaceholder.tsx` → `handleSubscribe` web branch; `useSession()` → `session.user.id` and `session.user.email` for SDK init and checkout pre-fill
- New wiring introduced in this slice: `web-billing.ts` ↔ `SubscriptionContext.tsx` (web init + re-fetch after purchase); `web-billing.ts` ↔ `PaywallPlaceholder.tsx` (checkout trigger); `SubscriptionProvider` web useEffect now calls `initializeWebBilling` + `getCustomerInfo`
- What remains before the milestone is truly usable end-to-end: RevenueCat dashboard must have Web Billing configured with a Stripe product (documented in S06); `EXPO_PUBLIC_REVENUECAT_WEB_API_KEY` must be set to a real test-mode key; S06 docs complete

## Tasks

- [x] **T01: Install @revenuecat/purchases-js and write web-billing.ts with Jest tests** `est:45m`
  - Why: Establishes the web billing module and proves its contract in Jest before wiring it into React context
  - Files: `src/features/subscriptions/web-billing.ts`, `src/features/subscriptions/__tests__/web-billing.test.ts`, `package.json`
  - Do: (1) Run `npx expo install @revenuecat/purchases-js` to add the dependency. (2) Create `src/features/subscriptions/web-billing.ts` exporting `initializeWebBilling(apiKey: string, appUserId: string): Promise<void>` (calls `Purchases.configure` if not already configured), `startWebCheckout(userEmail?: string): Promise<void>` (gets offerings, picks `offerings.current?.monthly`, calls `purchases.purchase({ rcPackage, customerEmail })`, then re-fetches CustomerInfo — returns the updated CustomerInfo for the caller to update context), and `getWebCustomerInfo(): Promise<CustomerInfoLike>` (calls `getCustomerInfo()` from the SDK). Handle `Purchases.isConfigured()` guard. Handle null offerings explicitly (throw with message "No offering available"). Catch `error.errorCode === ErrorCode.UserCancelledError` silently (return without throwing). (3) Create `src/features/subscriptions/__tests__/web-billing.test.ts` — mock `@revenuecat/purchases-js` at top of file; test: (a) `initializeWebBilling` skips configure if already configured, (b) `startWebCheckout` throws on null offering, (c) `startWebCheckout` resolves silently on UserCancelledError, (d) `computeSubscriptionState` with a web CustomerInfo having `entitlements.active.premium` → `isSubscriber: true`, (e) `computeSubscriptionState` with empty `entitlements.active` → `isSubscriber: false`
  - Verify: `npx jest src/features/subscriptions/__tests__/web-billing.test.ts --no-coverage` → all tests pass; `npx tsc --noEmit` → 0 errors
  - Done when: test file passes with 5+ tests; `web-billing.ts` compiles cleanly; `@revenuecat/purchases-js` present in `package.json` dependencies

- [x] **T02: Activate web SDK path in SubscriptionContext.tsx** `est:30m`
  - Why: The current web branch returns DEFAULT_STATE immediately — this task replaces it with real SDK initialization and CustomerInfo fetch so subscribers on web see correct entitlement state
  - Files: `src/features/subscriptions/SubscriptionContext.tsx`
  - Do: (1) Replace the `if (Platform.OS === 'web') { setState({ ...DEFAULT_STATE }); return; }` early return with a real web branch: import `initializeWebBilling` and `getWebCustomerInfo` from `web-billing.ts` dynamically (dynamic import consistent with native path pattern); call `initializeWebBilling(EXPO_PUBLIC_REVENUECAT_WEB_API_KEY, userId)` then `getWebCustomerInfo()` to fetch CustomerInfo; call `computeSubscriptionState(customerInfo, count)` and set state. (2) Use `process.env.EXPO_PUBLIC_REVENUECAT_WEB_API_KEY ?? ''` for the API key. (3) Add error handling: on failure, setState DEFAULT_STATE + console.warn. (4) Update `restorePurchases` to handle the web case: on web, call `getWebCustomerInfo()` then `computeSubscriptionState` and setState (no SDK restore method on web). (5) Expose a `refreshSubscription()` function on the context value so the paywall can trigger a post-checkout refresh — add this to `SubscriptionContextValue` type and the provider value.
  - Verify: `npx tsc --noEmit` → 0 errors; `npx jest --no-coverage` → ≥628 tests, 0 failures; `rg "DEFAULT_STATE" src/features/subscriptions/SubscriptionContext.tsx` → only in const definition and fallback error paths (not as immediate web return)
  - Done when: web branch calls `initializeWebBilling` + `getWebCustomerInfo`; `refreshSubscription` on context value; TypeScript clean

- [x] **T03: Replace "Coming Soon" stub in PaywallPlaceholder with real checkout** `est:30m`
  - Why: Closes the web billing loop — the subscribe button must trigger the real Stripe checkout and refresh entitlement state after completion
  - Files: `src/features/subscriptions/PaywallPlaceholder.tsx`
  - Do: (1) Import `startWebCheckout` from `web-billing.ts`. (2) Add `refreshSubscription` from `useSubscription()` context (added in T02). (3) Replace the web `else` branch in `handleSubscribe`: call `await startWebCheckout(userEmail)` where `userEmail` comes from `useSession().session?.user?.email`. On success, call `refreshSubscription()` then `onDismiss()`. Catch `UserCancelledError` silently (no alert, no dismiss). Catch other errors with `showAlert('Subscription Error', 'Could not complete checkout. Please try again.')`. (4) For web `handleRestore`: call `refreshSubscription()` (web has no store restore concept — refreshing CustomerInfo is the correct equivalent); on success show a brief `showAlert('Subscriptions Refreshed', 'Your subscription status has been updated.')` then `onDismiss()`. (5) Verify no "Coming Soon" text remains in the file.
  - Verify: `rg "Coming Soon" src/features/subscriptions/PaywallPlaceholder.tsx` → 0 matches; `npx tsc --noEmit` → 0 errors; `npx jest --no-coverage` → ≥628 tests, 0 failures; browser: click Subscribe on web paywall → Stripe checkout appears (test-mode or graceful error if API key not set)
  - Done when: web Subscribe button calls `startWebCheckout`, handles cancel silently, refreshes context on success; "Coming Soon" removed; TypeScript clean

## Files Likely Touched

- `package.json` — add `@revenuecat/purchases-js`
- `src/features/subscriptions/web-billing.ts` — new
- `src/features/subscriptions/__tests__/web-billing.test.ts` — new
- `src/features/subscriptions/SubscriptionContext.tsx` — activate web SDK path, add `refreshSubscription`
- `src/features/subscriptions/PaywallPlaceholder.tsx` — replace web stub with real checkout
