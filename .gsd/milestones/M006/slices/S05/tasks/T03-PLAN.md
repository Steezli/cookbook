---
estimated_steps: 4
estimated_files: 1
---

# T03: Replace "Coming Soon" stub in PaywallPlaceholder with real checkout

**Slice:** S05 — Web Billing via Stripe
**Milestone:** M006

## Description

Replace the `showAlert('Coming Soon', ...)` stub in `PaywallPlaceholder.tsx`'s web `handleSubscribe` branch with a real `startWebCheckout()` call, post-checkout context refresh, and silent `UserCancelledError` handling. Update the web `handleRestore` path to call `refreshSubscription()` instead of `restorePurchases()` (which is a native App Store concept unavailable on web).

## Steps

1. Add imports to `PaywallPlaceholder.tsx`:
   - `startWebCheckout` from `@/features/subscriptions/web-billing` (dynamic import inside the handler to keep it web-only and avoid native bundle pollution — use `await import(...)` inside the handler body)
   - `refreshSubscription` destructured from `useSubscription()` (added in T02)
   - `useSession` from `@/features/auth/session` to get the user's email for checkout pre-fill

2. Replace the web `else` branch in `handleSubscribe`:
   ```ts
   } else {
     try {
       const { startWebCheckout } = await import('@/features/subscriptions/web-billing');
       const userEmail = session?.user?.email ?? undefined;
       const result = await startWebCheckout(userEmail);
       if (result !== null) {
         await refreshSubscription();
         onDismiss();
       }
       // result === null means UserCancelledError — do nothing (silent)
     } catch (err) {
       showAlert('Subscription Error', 'Could not complete checkout. Please try again.');
     }
   }
   ```

3. Update `handleRestore` on web:
   - Wrap the existing `restorePurchases()` call in `if (Platform.OS !== 'web')` block
   - Add web `else` block: call `await refreshSubscription()` then `showAlert('Subscriptions Refreshed', 'Your subscription status has been updated.')` then `onDismiss()`
   - Both paths keep the existing try/catch structure

4. Verify no "Coming Soon" text remains and TypeScript is clean:
   - `rg "Coming Soon" src/features/subscriptions/PaywallPlaceholder.tsx` → 0 matches
   - `npx tsc --noEmit` → exit 0
   - `npx jest --no-coverage` → ≥628 tests, 0 failures

## Must-Haves

- [ ] `showAlert('Coming Soon', ...)` removed — 0 occurrences remain in PaywallPlaceholder
- [ ] Web `handleSubscribe` calls `startWebCheckout()` with user email pre-fill
- [ ] `UserCancelledError` path (result === null) is silent — no alert, no dismiss
- [ ] Successful checkout calls `refreshSubscription()` then `onDismiss()`
- [ ] Other errors surfaced via `showAlert('Subscription Error', ...)`
- [ ] Web `handleRestore` calls `refreshSubscription()` instead of native `restorePurchases()`
- [ ] `npx tsc --noEmit` exits 0
- [ ] `npx jest --no-coverage` ≥628 tests, 0 failures

## Verification

- `rg "Coming Soon" src/features/subscriptions/PaywallPlaceholder.tsx` → 0 matches
- `npx tsc --noEmit` → no output, exit 0
- `npx jest --no-coverage` → ≥628 tests, 0 failures
- Browser (manual): navigate to web app → trigger paywall → click "Subscribe" → Stripe/RevenueCat checkout UI appears (test mode) OR actionable error if `EXPO_PUBLIC_REVENUECAT_WEB_API_KEY` not configured
- Browser (manual): click X on checkout modal → paywall stays open, no error shown (silent cancel)

## Observability Impact

- Signals added/changed: `showAlert('Subscription Error', ...)` on non-cancel checkout failure gives user-visible diagnostic; `refreshSubscription()` call after purchase triggers a re-fetch whose result is visible in React DevTools subscription state
- How a future agent inspects this: browser devtools network tab shows RevenueCat API calls during checkout; `rg "startWebCheckout" src/` shows all call sites; `rg "Coming Soon"` confirms stub is gone
- Failure state exposed: checkout errors show user-visible alert with retry guidance; silent cancel leaves paywall open for retry; `refreshSubscription` failure is caught in the context layer (falls back to current state)

## Inputs

- `src/features/subscriptions/PaywallPlaceholder.tsx` — current file with "Coming Soon" stub to replace
- `src/features/subscriptions/web-billing.ts` — `startWebCheckout` (from T01)
- `src/features/subscriptions/SubscriptionContext.tsx` — `refreshSubscription` on context value (from T02)
- `src/features/auth/session.tsx` — `useSession` hook for user email

## Expected Output

- `src/features/subscriptions/PaywallPlaceholder.tsx` — web `handleSubscribe` calls real checkout; web `handleRestore` calls `refreshSubscription`; zero "Coming Soon" references; TypeScript clean
