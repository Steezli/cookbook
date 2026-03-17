# S05: Web Billing via Stripe — Research

**Date:** 2026-03-17

## Summary

S05 replaces the `PaywallPlaceholder` web stub (currently showing a "Coming Soon" alert) with a real RevenueCat Web Billing checkout using `@revenuecat/purchases-js`. It also activates the web path in `SubscriptionContext.tsx`, which currently falls back to defaults (`isSubscriber: false`) on web — the context needs to initialize the web SDK and query real entitlement state.

The `@revenuecat/purchases-js` SDK API is clean and well-documented. Initialization follows the same `configure({ apiKey, appUserId })` shape as the native SDK, making it a natural fit for the existing context structure. The key differences from native: (1) the web API key starts with `rcb_` (not `appl_`/`goog_`), (2) purchase is triggered via `purchases.purchase({ rcPackage })` or `purchases.presentPaywall()` which renders a hosted checkout UI, and (3) there is no listener pattern — entitlement state must be re-fetched after purchase returns.

The implementation has three parts: a `web-billing.ts` wrapper module, updates to `SubscriptionContext.tsx` to activate the web SDK path, and replacing the `handleSubscribe` stub in `PaywallPlaceholder.tsx` with real checkout. The boundary map from the roadmap also mentions a `app/(tabs)/scan/paywall.tsx` screen, but given that `PaywallPlaceholder.tsx` already exists as a modal overlay with the correct structure, the simpler path is to upgrade the component in place rather than adding a new route — the roadmap description should be treated as intent, not a filename requirement.

## Recommendation

Three-task execution:

1. **T01** — Install `@revenuecat/purchases-js`, add minimal type declarations (or let the package provide its own types), create `web-billing.ts` wrapper with `initializeWebBilling(apiKey, appUserId)` and `startWebCheckout()`, write Jest tests for `computeSubscriptionState` with web customerInfo shape and error paths.
2. **T02** — Update `SubscriptionContext.tsx` web branch: replace the immediate `DEFAULT_STATE` return with a `@revenuecat/purchases-js` SDK init + `getCustomerInfo()` call; add customer info update listener if the SDK supports it; keep `Platform.OS !== 'web'` branching explicit.
3. **T03** — Replace the "Coming Soon" stub in `PaywallPlaceholder.tsx` handleSubscribe with real `startWebCheckout()` call; handle `UserCancelledError` silently, other errors via `showAlert`.

## Don't Hand-Roll

| Problem | Existing Solution | Why Use It |
|---------|------------------|------------|
| Stripe checkout, payment intents, webhook sync | `@revenuecat/purchases-js` + RevenueCat Web Billing | RevenueCat handles Stripe integration, checkout session, and entitlement sync. A custom Stripe integration would need a separate webhook to keep RevenueCat entitlements consistent across web + native |
| Entitlement state sync across platforms | RevenueCat customer info — same `appUserId` (Supabase user ID) used on native | Same user ID means a subscription purchased on web immediately shows as active when the user opens the iOS/Android app |
| Checkout UI (price, terms, payment form) | `purchases.presentPaywall()` or `purchases.purchase({ rcPackage })` | RevenueCat's checkout renders an embedded Stripe-backed payment form with correct subscription terms — compliant and tested |

## Existing Code and Patterns

- `src/features/subscriptions/SubscriptionContext.tsx` — **primary file to update**. The web branch already has a clear `if (Platform.OS === 'web') { setState({ ...DEFAULT_STATE }); return; }` early return. Replace this with web SDK init + `getCustomerInfo()`. The `computeSubscriptionState()` pure function already handles the `CustomerInfo` shape; `@revenuecat/purchases-js`'s `CustomerInfo` has the same `entitlements.active` structure.
- `src/features/subscriptions/PaywallPlaceholder.tsx` — the `handleSubscribe` function has a web branch (`Platform.OS !== 'web'` for native, `else` for web) with a `showAlert('Coming Soon', ...)` stub. Only the web `else` branch needs replacing with `startWebCheckout()`.
- `src/features/subscriptions/types/react-native-purchases.d.ts` — pattern for minimal type declarations. `@revenuecat/purchases-js` ships its own TypeScript types (it's a JS-first package), so no `.d.ts` file is needed — just install and import.
- `src/features/auth/session.tsx` — uses `Platform.OS !== 'web'` guard before calling native `Purchases.configure()`. The web SDK initialization must go in `SubscriptionContext.tsx`'s `useEffect`, NOT in `session.tsx` (web has no auth state change listener that drives RevenueCat in the same way).
- `src/features/scan/scan-service.ts` — `isSubscriber` is threaded through from the scan screen context call; no changes needed for S05.

## Constraints

- **`@revenuecat/purchases-js` is NOT installed** — `package.json` has no revenucat/purchases-js dependency. Must install with `npx expo install @revenuecat/purchases-js` (not native, so no Expo plugin needed).
- **Web API key is different from native** — native keys are `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY` / `EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY`. Web billing uses a separate key that starts with `rcb_`. Add `EXPO_PUBLIC_REVENUECAT_WEB_API_KEY` env var.
- **`Purchases.isConfigured()` guard** — the web SDK singleton pattern requires checking `Purchases.isConfigured()` before calling `configure()` to prevent double-initialization on React re-renders.
- **`purchases.purchase()` requires an offerings fetch first** — must call `getOfferings()`, access `offerings.current?.monthly` (or the relevant package), then pass it to `purchase({ rcPackage })`. The offering identifier must match what's configured in the RevenueCat dashboard.
- **UserCancelledError should be silent** — when a user closes the checkout modal without completing, catch `error.errorCode === ErrorCode.UserCancelledError` and don't show an error alert.
- **Stripe test mode vs production** — `EXPO_PUBLIC_REVENUECAT_WEB_API_KEY` must be the test-mode key for development and staging. The setup guide (S06) will document the live key swap.
- **No `addCustomerInfoUpdateListener` in web SDK** — the native SDK has a real-time listener; the web SDK does not (as of Feb 2026). Entitlement state must be re-fetched after `purchase()` returns by calling `getCustomerInfo()` and updating context state.
- **`restorePurchases` on web** — the web SDK does not have a `restorePurchases()` method (it's a Stripe billing concept, not an app store concept). On web, the correct flow is: call `getCustomerInfo()` to refresh entitlements. The `restorePurchases` button in `PaywallPlaceholder` should either be hidden on web or trigger a `getCustomerInfo()` refresh with a "subscriptions refreshed" success message.

## Common Pitfalls

- **Initializing web SDK in session.tsx** — `session.tsx` guards `Purchases.configure()` with `Platform.OS !== 'web'`. Don't try to add the web SDK here. The web SDK initialization belongs in `SubscriptionContext.tsx`'s `useEffect` where the userId is available.
- **computeSubscriptionState already works** — `@revenuecat/purchases-js`'s `CustomerInfo.entitlements.active` has the same key structure as the native SDK's shape. The existing pure function requires no changes; the web `CustomerInfo` object can be passed directly.
- **Missing offering causes silent failure** — if `offerings.current` is null (RevenueCat project not configured or wrong API key), `purchase()` will throw. Handle this explicitly: check for null offering before calling purchase, show an actionable error message.
- **htmlTarget for embedded checkout** — `purchases.purchase()` accepts an optional `htmlTarget` element to embed the Stripe checkout inline. On web-only, this could be used instead of a page navigation. For S05, the simpler approach is no `htmlTarget` (Stripe checkout renders as an overlay/modal in the RevenueCat SDK's default behavior).
- **TypeScript module resolution** — `@revenuecat/purchases-js` ships ESM. Expo's Metro bundler should handle this for web; verify the web bundle builds without errors after install.

## Open Risks

- **`@revenuecat/purchases-js` web bundle size** — the package includes Stripe.js dependencies. Check bundle impact after install. If large, lazy-import it in `SubscriptionContext.tsx` using dynamic `import()` on the web path (consistent with native dynamic import pattern).
- **RevenueCat Web Billing product configuration** — the offering must be configured in the RevenueCat dashboard with a Stripe product attached. If this isn't set up yet, `getOfferings()` returns null/empty and the checkout can't proceed. S05 implementation should handle this gracefully; the configuration itself is documented in S06.
- **Stripe test checkout requires a real email** — Stripe test mode accepts test card numbers (e.g., 4242 4242 4242 4242) but still requires a valid email. The `purchase()` call accepts `customerEmail` to pre-fill this — pass the user's Supabase email.
- **Web checkout redirect behavior** — depending on RevenueCat's checkout implementation, the user may be redirected to a Stripe-hosted page and back. If so, the app needs to handle the return URL and re-fetch entitlements on mount. Verify whether RevenueCat Web Billing uses an embedded checkout (no redirect) or a hosted checkout (redirect) — the `purchase()` API docs suggest embedded, but this needs confirmation in Stripe test mode.

## Skills Discovered

| Technology | Skill | Status |
|------------|-------|--------|
| @revenuecat/purchases-js | none found | none found |
| Stripe web checkout | none found | none found |

## Sources

- `@revenuecat/purchases-js` SDK: `configure()`, `getCustomerInfo()`, `getOfferings()`, `purchase()`, `presentPaywall()`, `PurchasesError`, `ErrorCode.UserCancelledError` (source: Context7 `/revenuecat/purchases-js`)
- Existing web branch stub (source: `src/features/subscriptions/SubscriptionContext.tsx` — current codebase)
- PaywallPlaceholder web stub (source: `src/features/subscriptions/PaywallPlaceholder.tsx` — current codebase)
- Native SDK initialization pattern with `purchasesConfiguredRef` guard (source: `src/features/auth/session.tsx` — current codebase)
- Type declaration pattern for native-only packages (source: `src/features/subscriptions/types/react-native-purchases.d.ts` — current codebase)
