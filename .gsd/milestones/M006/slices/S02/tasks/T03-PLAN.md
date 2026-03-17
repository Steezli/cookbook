---
estimated_steps: 7
estimated_files: 6
---

# T03: Implement SubscriptionContext and wire into layout + session

**Slice:** S02 — RevenueCat SDK + Subscription Context
**Milestone:** M006

## Description

Implement `SubscriptionContext.tsx` with `SubscriptionProvider` + `useSubscription()` hook. Wire RevenueCat initialization into `session.tsx`. Inject `SubscriptionProvider` into `app/_layout.tsx`. Guard the Expo plugin in `app.config.ts`. This task makes all T01 tests pass and delivers the full S02 contract.

## Steps

1. **Create `src/features/subscriptions/SubscriptionContext.tsx`**:
   - Define `SubscriptionContextValue` type: `{ isSubscriber: boolean; scanCount: number; scansRemaining: number; isLoading: boolean; restorePurchases: () => Promise<void> }`.
   - Create `SubscriptionContext` with `undefined` default.
   - Export `computeSubscriptionState(customerInfo: CustomerInfo | null, scanCount: number): { isSubscriber: boolean; scanCount: number; scansRemaining: number }` as a named export — pure function, testable without React renderer. Logic: `isSubscriber = !!(customerInfo?.entitlements?.active?.['premium'])`, `scansRemaining = Math.max(0, 3 - scanCount)`.
   - Implement `SubscriptionProvider`: reads `useSession()` for `session`. If `Platform.OS === 'web'`, immediately provide `{ isSubscriber: false, scanCount: 0, scansRemaining: 3, isLoading: false, restorePurchases: async () => {} }` and render children. On native: `useEffect` watching `session?.user?.id` — if no user, set `isLoading: false`, defaults; if user, run `async loadSubscriptionState()` that: (a) dynamic `import('react-native-purchases')` with try/catch; if throws, set fallback state (`isSubscriber: false, scanCount: 0, scansRemaining: 3, isLoading: false`) and return; (b) call `Purchases.getCustomerInfo()` and `getScanCount(userId)` in parallel (`Promise.all`); (c) call `computeSubscriptionState(customerInfo, count)`, set state, `setIsLoading(false)`; (d) register `Purchases.addCustomerInfoUpdateListener` callback that re-fetches `getScanCount` and updates state. Return cleanup: call `Purchases.removeCustomerInfoUpdateListener` with the same callback reference. Wrap `loadSubscriptionState` in try/catch — catch sets fallback + `isLoading: false` + `console.warn`.
   - `restorePurchases` function: dynamic import Purchases, call `restorePurchases()`, re-fetch customer info + scan count, update state.
   - Export `useSubscription()` hook that throws `Error("useSubscription must be used within SubscriptionProvider")` if context is undefined.

2. **Update `src/features/auth/session.tsx`**:
   - Add `import { Platform } from 'react-native'` (if not already present).
   - Add `const purchasesConfiguredRef = useRef<boolean>(false)` inside `SessionProvider`.
   - After `safeEnsureProfile(...)` call in `onAuthStateChange`, add: `if (nextSession?.user.id && Platform.OS !== 'web' && !purchasesConfiguredRef.current) { purchasesConfiguredRef.current = true; configurePurchases(nextSession.user.id); }`.
   - Add file-level `async function configurePurchases(userId: string): Promise<void>` that dynamically imports `react-native-purchases` and calls `Purchases.configure({ apiKey: process.env.EXPO_PUBLIC_REVENUECAT_API_KEY ?? '', appUserID: userId })`, wrapped in try/catch with `console.warn` on failure. Keep the function outside the component (same pattern as `ensureProfile`).

3. **Update `app/_layout.tsx`**:
   - Import `{ SubscriptionProvider }` from `@/features/subscriptions/SubscriptionContext`.
   - Wrap `<ErrorBoundary>` with `<SubscriptionProvider>`. New tree: `SafeAreaProvider > SessionProvider > SubscriptionProvider > ErrorBoundary > Stack`.

4. **Update `app.config.ts`**:
   - Add `const purchasesInstalled = fs.existsSync(path.join(__dirname, 'node_modules', 'react-native-purchases'))` after the existing `admobInstalled` guard.
   - Check if `react-native-purchases` ships an Expo config plugin — if it does (file `node_modules/react-native-purchases/app.plugin.js` or `app.plugin.ts`), add `...(purchasesInstalled ? [['react-native-purchases/app.plugin']] : [])` to the plugins array. If no plugin exists (likely), add a comment: `// react-native-purchases has no Expo plugin; EAS config is manual (see docs/subscription-setup.md)`.

5. **Verify T01 tests pass**:
   - The tests import `computeSubscriptionState` for pure-function assertions, and mock `useSession` + `getScanCount` + `react-native-purchases` for hook behavior. Adjust test expectations if implementation differs slightly from T01 plan, but do not weaken the assertions.

6. **Run `npx tsc --noEmit`** — fix any type errors. Common issues: `session` could be null (guard `session?.user?.id`); `import` of `react-native-purchases` type needs to match `.d.ts`.

7. **Run `npx jest --no-coverage`** — ensure 617+ tests pass, zero regressions.

## Must-Haves

- [ ] `computeSubscriptionState` exported as named pure function from `SubscriptionContext.tsx`
- [ ] Web path returns `isSubscriber: false`, `scansRemaining: 3`, `isLoading: false` immediately (no SDK touch)
- [ ] Native path: SDK import failure → `isSubscriber: false`, `isLoading: false` (no stuck-true)
- [ ] `addCustomerInfoUpdateListener` registered and cleaned up in `useEffect` return
- [ ] `scansRemaining = Math.max(0, 3 - scanCount)` — never negative
- [ ] `Purchases.configure()` in `session.tsx` guarded by `Platform.OS !== 'web'` and `purchasesConfiguredRef`
- [ ] `SubscriptionProvider` wraps `ErrorBoundary` in `app/_layout.tsx`
- [ ] `app.config.ts` has `purchasesInstalled` guard
- [ ] All T01 tests pass
- [ ] `npx tsc --noEmit` exits 0
- [ ] Full Jest suite passes (617+ tests)

## Verification

- `npx jest src/features/subscriptions/__tests__/subscription-context.test.ts --no-coverage` — all pass
- `npx tsc --noEmit` — exits 0
- `npx jest --no-coverage` — 617+ tests, zero failures

## Observability Impact

- Signals added/changed: `isLoading` boolean in `SubscriptionContext` — consumers know when entitlement check is in progress; `console.warn('[SubscriptionProvider]')` on SDK or configure failure
- How a future agent inspects this: `useSubscription()` in any component; `getScanCount(userId)` for raw count; Jest test suite for contract re-verification; `isLoading` distinguishes "SDK pending" from "SDK unavailable"
- Failure state exposed: SDK unavailable → graceful `isSubscriber: false` with `isLoading: false`; RevenueCat configure failure → `console.warn` in session provider; `restorePurchases()` surfaces errors to callers via thrown error

## Inputs

- `src/features/subscriptions/__tests__/subscription-context.test.ts` — T01 tests that must pass (acceptance target)
- `src/features/subscriptions/types/react-native-purchases.d.ts` — T02 type declarations (must exist before this task)
- `src/features/subscriptions/scan-count.ts` — `getScanCount(userId)` signature
- `src/features/auth/session.tsx` — `useSession`, `hasSessionChanged`, `onAuthStateChange` handler structure
- `app/_layout.tsx` — current provider tree to extend
- `app.config.ts` — existing `admobInstalled` guard pattern to replicate
- `src/features/ads/AdBanner.tsx` — dynamic import + `cancelled` flag pattern

## Expected Output

- `src/features/subscriptions/SubscriptionContext.tsx` — `SubscriptionProvider`, `useSubscription()`, `computeSubscriptionState()` (named export)
- `src/features/auth/session.tsx` — modified with `configurePurchases` + `purchasesConfiguredRef`
- `app/_layout.tsx` — modified with `SubscriptionProvider` wrapper
- `app.config.ts` — modified with `purchasesInstalled` guard
- All T01 contract tests passing
