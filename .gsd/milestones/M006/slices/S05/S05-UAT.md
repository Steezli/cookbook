# S05: Web Billing via Stripe — UAT

**Milestone:** M006
**Written:** 2026-03-17

## UAT Type

- UAT mode: mixed (artifact-driven + live-runtime)
- Why this mode is sufficient: Contract correctness (module API, error handling, computeSubscriptionState) is fully proven by Jest. Live runtime (browser Stripe checkout) requires `EXPO_PUBLIC_REVENUECAT_WEB_API_KEY` set to a real test key and RevenueCat dashboard configured — deferred to M006 DoD per slice plan. The Jest tests and TypeScript clean-compile together prove the integration surface is correct.

## Preconditions

**For artifact-driven UAT (runnable now):**
- `npx jest` passes with ≥640 tests
- `npx tsc --noEmit` exits 0

**For live-runtime UAT (requires setup):**
- `EXPO_PUBLIC_REVENUECAT_WEB_API_KEY` set to a RevenueCat Web Billing test key (`rcb_...`)
- RevenueCat dashboard: Web Billing integration configured with a Stripe test-mode product
- Stripe test mode active (use card 4242 4242 4242 4242)
- Web dev server running: `npx expo start --web`

## Smoke Test

Run `npx jest src/features/subscriptions/__tests__/web-billing.test.ts --no-coverage` — all 6 tests pass. Confirms the billing module contract is intact.

## Test Cases

### 1. Web billing module contract (Jest)

1. Run `npx jest src/features/subscriptions/__tests__/web-billing.test.ts --no-coverage`
2. **Expected:** 6 tests pass — initializeWebBilling skips double-init, startWebCheckout throws on null offering, UserCancelledError is silent, computeSubscriptionState handles active and inactive entitlements correctly

### 2. No "Coming Soon" stubs remain

1. Run `rg "Coming Soon" src/features/subscriptions/PaywallPlaceholder.tsx`
2. **Expected:** 0 matches

### 3. TypeScript compiles clean

1. Run `npx tsc --noEmit`
2. **Expected:** Exit 0, no output

### 4. Full test suite passes

1. Run `npx jest --no-coverage`
2. **Expected:** ≥640 tests, 0 failures

### 5. Web paywall Subscribe button triggers checkout (live runtime)

1. Start web server: `npx expo start --web`
2. Navigate to the scan screen as a free user who has used all 3 scans
3. Trigger the paywall (attempt a 4th scan)
4. Click **Subscribe** on the paywall
5. **Expected:** RevenueCat/Stripe test-mode checkout page or modal appears in the browser

### 6. Post-checkout entitlement update (live runtime)

1. Complete checkout with test card `4242 4242 4242 4242`
2. Return to the app
3. **Expected:** `useSubscription().isSubscriber` becomes `true`; paywall dismisses; scan upload proceeds without limit

### 7. Cancel checkout is silent (live runtime)

1. Trigger paywall → click Subscribe → checkout opens
2. Close/cancel the checkout without completing payment
3. **Expected:** No alert shown; paywall remains open; no error logged

### 8. Web Restore flow (live runtime)

1. Click **Restore Purchases** on the web paywall
2. **Expected:** `refreshSubscription()` fires, subscription state re-fetches from RevenueCat, alert shows "Subscriptions Refreshed", paywall dismisses

## Edge Cases

### No API key set

1. Start web app without `EXPO_PUBLIC_REVENUECAT_WEB_API_KEY` set
2. **Expected:** `initializeWebBilling` fails gracefully, context falls back to `DEFAULT_STATE`, `console.warn('[SubscriptionProvider] web SDK failed:', ...)` emitted — no crash

### No current offering in RevenueCat dashboard

1. Call `startWebCheckout()` when dashboard has no current offering configured
2. **Expected:** Throws "No offering available"; `showAlert('Subscription Error', 'Could not complete checkout. Please try again.')` shown to user

## Failure Signals

- "Coming Soon" alert appears on web Subscribe click → T03 not applied
- `npx jest` < 640 tests or any failures → regression introduced
- `npx tsc --noEmit` shows errors → TypeScript breakage
- Browser console shows unhandled UserCancelledError → silent-cancel logic broken
- `isSubscriber` stays false after completing Stripe checkout → `refreshSubscription()` not called or web branch still returns DEFAULT_STATE

## Requirements Proved By This UAT

- **SUB-03** — Web subscription checkout via RevenueCat Web Billing / Stripe: contract proven by Jest (initializeWebBilling, startWebCheckout, computeSubscriptionState shapes). Live Stripe test-mode checkout proven manually when API key and dashboard are configured.

## Not Proven By This UAT

- SUB-03 operational validation with a real RevenueCat Web Billing product in production mode — deferred to M006 DoD
- RevenueCat dashboard configuration steps (Stripe product, Web Billing integration) — documented in S06
- SUB-01, SUB-02, SUB-04, SUB-05, SUB-06 — proven in earlier slices (S01–S04)
- Native iOS/Android purchase flow — proven in S03 (RevenueCatUI); EAS build validation deferred to M006 DoD

## Notes for Tester

- The live-runtime tests (5–8) require a RevenueCat account with Web Billing enabled and Stripe test-mode configured. This setup is documented in S06. Without it, tests 1–4 (artifact-driven) fully exercise the contract.
- Use Stripe test card `4242 4242 4242 4242` with any future expiry and any CVC.
- `EXPO_PUBLIC_REVENUECAT_WEB_API_KEY` is a public client-side key (starts with `rcb_`) — safe to commit to `.env.local` for local testing.
- If the paywall isn't visible because scan count hasn't reached 3, temporarily set `scansRemaining` to 0 via React DevTools to force paywall display without consuming real scan quota.
