---
estimated_steps: 4
estimated_files: 1
---

# T02: Activate web SDK path in SubscriptionContext.tsx

**Slice:** S05 — Web Billing via Stripe
**Milestone:** M006

## Description

Replace the immediate `DEFAULT_STATE` early return in `SubscriptionContext.tsx`'s web branch with a real web SDK initialization and `CustomerInfo` fetch. Add `refreshSubscription()` to the context value so the paywall can trigger a post-checkout entitlement refresh. Update `restorePurchases` to work correctly on web (no store restore — call `getWebCustomerInfo()` instead).

## Steps

1. Add `refreshSubscription: () => Promise<void>` to `SubscriptionContextValue` type and `DEFAULT_STATE` (with a no-op implementation for safety).

2. In `SubscriptionProvider`'s `useEffect`, replace:
   ```ts
   if (Platform.OS === 'web') {
     setState({ ...DEFAULT_STATE });
     return;
   }
   ```
   with a real web branch:
   ```ts
   if (Platform.OS === 'web') {
     const userId = session?.user?.id;
     if (!userId) { setState({ ...DEFAULT_STATE }); return; }
     let cancelled = false;
     async function loadWebState() {
       try {
         const apiKey = process.env.EXPO_PUBLIC_REVENUECAT_WEB_API_KEY ?? '';
         const { initializeWebBilling, getWebCustomerInfo } = await import('@/features/subscriptions/web-billing');
         await initializeWebBilling(apiKey, userId!);
         if (cancelled) return;
         const [customerInfo, count] = await Promise.all([
           getWebCustomerInfo(),
           getScanCount(userId!),
         ]);
         if (cancelled) return;
         const computed = computeSubscriptionState(customerInfo, count);
         setState({ ...computed, isLoading: false });
       } catch (err) {
         if (!cancelled) {
           console.warn('[SubscriptionProvider] web SDK failed:', err instanceof Error ? err.message : String(err));
           setState({ ...DEFAULT_STATE });
         }
       }
     }
     setState(s => ({ ...s, isLoading: true }));
     loadWebState();
     return () => { cancelled = true; };
   }
   ```
   (Use dynamic `import()` to keep the web-billing module out of native bundles — consistent with the native `react-native-purchases` dynamic import pattern.)

3. Implement `refreshSubscription()`:
   - On web: call `getWebCustomerInfo()` + `getScanCount(userId)`, compute new state, call `setState`
   - On native: call `Purchases.getCustomerInfo()` (via dynamic import) + `getScanCount`, update state
   - Add to provider `value` object: `{ ...state, restorePurchases, refreshSubscription }`

4. Update `restorePurchases` for web:
   - Wrap current implementation in `if (Platform.OS !== 'web')` for native path
   - Add `else` web path: call `getWebCustomerInfo()` + `getScanCount(userId)` + `computeSubscriptionState` + setState (no RevenueCat restore concept on web — refreshing CustomerInfo is correct)

## Must-Haves

- [ ] Web branch calls `initializeWebBilling` then `getWebCustomerInfo` — no longer returns DEFAULT_STATE immediately when userId is present
- [ ] Dynamic import used for `web-billing.ts` in the web branch (consistent with native pattern)
- [ ] `refreshSubscription` exported on `SubscriptionContextValue` and implemented for both platforms
- [ ] `restorePurchases` works on web by calling `getWebCustomerInfo()` (no crash)
- [ ] `EXPO_PUBLIC_REVENUECAT_WEB_API_KEY` consumed via `process.env`
- [ ] `npx tsc --noEmit` exits 0
- [ ] `npx jest --no-coverage` ≥628 tests, 0 failures

## Verification

- `npx tsc --noEmit` → no output, exit 0
- `npx jest --no-coverage` → ≥628 tests, 0 failures
- `rg "DEFAULT_STATE" src/features/subscriptions/SubscriptionContext.tsx` — only appears in: const definition, error fallback paths — NOT as an immediate web early return with a userId present
- `rg "refreshSubscription" src/features/subscriptions/SubscriptionContext.tsx` → present in type, default state, and value object

## Observability Impact

- Signals added/changed: `console.warn('[SubscriptionProvider] web SDK failed:', message)` on web SDK init/fetch failure — consistent with existing native warn pattern; `isLoading: true` state during web fetch provides UI loading signal
- How a future agent inspects this: `rg "EXPO_PUBLIC_REVENUECAT_WEB_API_KEY" src/` shows where the key is consumed; browser React DevTools show `isLoading` / `isSubscriber` state during load
- Failure state exposed: web SDK failure falls back to DEFAULT_STATE (conservative — free tier assumed on error); warn message identifies the failure phase

## Inputs

- `src/features/subscriptions/web-billing.ts` — `initializeWebBilling`, `getWebCustomerInfo` (from T01)
- `src/features/subscriptions/SubscriptionContext.tsx` — current file to modify (web branch early return + restorePurchases)
- `src/features/subscriptions/scan-count.ts` — `getScanCount` (already imported)

## Expected Output

- `src/features/subscriptions/SubscriptionContext.tsx` — web branch now initializes SDK and fetches real state; `refreshSubscription` on context value; `restorePurchases` handles web path correctly
