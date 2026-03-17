# S02: RevenueCat SDK + Subscription Context

**Goal:** `useSubscription()` hook returns `{ isSubscriber, scanCount, scansRemaining, isLoading, restorePurchases }` — RevenueCat initialized in the session provider via dynamic import + fallback (same pattern as AdMob), subscription state tested with mock SDK, TypeScript compiles clean locally.
**Demo:** `npx jest src/features/subscriptions/__tests__/subscription-context.test.ts` passes (isSubscriber false with no entitlement, true with "premium" entitlement, scansRemaining computed from getScanCount), `npx tsc --noEmit` exits 0, and `npx jest --no-coverage` runs the full suite green.

## Must-Haves

- `src/features/subscriptions/types/react-native-purchases.d.ts` declares `Purchases` default export, `CustomerInfo`, `EntitlementInfo` — TypeScript compiles without SDK installed
- `SubscriptionContext.tsx` exports `SubscriptionProvider` + `useSubscription()` with `{ isSubscriber, scanCount, scansRemaining, isLoading, restorePurchases }`
- RevenueCat `Purchases.configure()` called inside `session.tsx` `onAuthStateChange` handler when `nextSession?.user.id` is available, guarded by `Platform.OS !== 'web'` and a `purchasesConfiguredRef`
- `SubscriptionProvider` wraps `<ErrorBoundary>` inside `<SessionProvider>` in `app/_layout.tsx`
- `isLoading: false` set on both success and failure paths — no stuck-true case
- `addCustomerInfoUpdateListener` registered and cleaned up in `useEffect` return
- `scansRemaining = Math.max(0, 3 - scanCount)` with getScanCount from S01
- Web path (`Platform.OS === 'web'`) sets `isSubscriber: false`, `scansRemaining: 3`, `isLoading: false` without touching native SDK
- Jest contract tests: no entitlement → `isSubscriber: false`; "premium" entitlement active → `isSubscriber: true`; `scansRemaining` computed correctly; `isLoading` resolves to `false`
- `app.config.ts` plugin guard for `react-native-purchases` (same `fs.existsSync` pattern as AdMob)
- `npx tsc --noEmit` exits 0
- Full Jest suite passes (617+ tests, zero regressions)

## Proof Level

- This slice proves: contract
- Real runtime required: no (EAS build required for true SDK initialization, deferred to milestone DoD)
- Human/UAT required: no

## Verification

- `npx jest src/features/subscriptions/__tests__/subscription-context.test.ts --no-coverage` — all tests pass
- `npx tsc --noEmit` — exits 0
- `npx jest --no-coverage` — 617+ tests pass, zero regressions

## Observability / Diagnostics

- Runtime signals: `isLoading` boolean in context — consumers can distinguish "not yet checked" from "checked, no subscription"
- Inspection surfaces: `useSubscription()` in any component; `getScanCount(userId)` to verify raw count; Jest test suite for contract verification
- Failure state exposed: SDK unavailability → `isSubscriber: false`, `isLoading: false` (never stuck); `console.warn` on configure failure; `restorePurchases()` surfaces errors to callers
- Redaction constraints: `appUserID` (Supabase user UUID) logged to RevenueCat SDK but not to console

## Integration Closure

- Upstream surfaces consumed: `getScanCount()` + `incrementScanCount()` from `src/features/subscriptions/scan-count.ts` (S01); `useSession()` from `src/features/auth/session.tsx`; `ScanLimitError` from `src/features/scan/errors.ts`
- New wiring introduced in this slice: `SubscriptionProvider` wrapping root layout; `Purchases.configure()` in session auth handler; `addCustomerInfoUpdateListener` for real-time updates
- What remains before the milestone is truly usable end-to-end: S03 scan gating (throws ScanLimitError + paywall), S04 ad suppression, S05 web billing, remote migration deployment

## Tasks

- [x] **T01: Write failing contract tests for SubscriptionContext** `est:20m`
  - Why: Tests define the exact contract before implementation — `isSubscriber`, `scansRemaining`, `isLoading` semantics, SDK unavailability fallback. Failing tests are the target for T02.
  - Files: `src/features/subscriptions/__tests__/subscription-context.test.ts`
  - Do: Create test file with `jest.mock('react-native-purchases')` (default export with `configure`, `getCustomerInfo`, `restorePurchases`, `addCustomerInfoUpdateListener`, `removeCustomerInfoUpdateListener`). Mock `react-native` Platform. Mock `@/features/subscriptions/scan-count` for `getScanCount`. Mock `@/features/auth/session` for `useSession`. Write tests: (1) no entitlement → `isSubscriber: false`; (2) active "premium" entitlement → `isSubscriber: true`; (3) `scansRemaining = Math.max(0, 3 - scanCount)` computed correctly; (4) `isLoading` resolves to `false` after SDK responds; (5) SDK unavailable (import throws) → `isSubscriber: false`, `isLoading: false`. Follow the pure-function mock style from `AdBanner.test.ts` — no React renderer needed; test the context state logic via the hook's exported helpers or by invoking the context value computation directly. If the hook cannot be tested without a renderer, use a minimal `renderHook` approach with the mock provider.
  - Verify: `npx jest src/features/subscriptions/__tests__/subscription-context.test.ts --no-coverage` — tests run but FAIL (SubscriptionContext doesn't exist yet)
  - Done when: Test file exists, all tests run, all fail with "Cannot find module" or similar — not with syntax errors

- [x] **T02: Add react-native-purchases type declarations** `est:15m`
  - Why: TypeScript must compile locally without the native SDK installed. The `.d.ts` unblocks implementation in T03.
  - Files: `src/features/subscriptions/types/react-native-purchases.d.ts`
  - Do: Create `declare module 'react-native-purchases'` with: default export `Purchases` object with `configure({ apiKey: string, appUserID: string }): void`, `getCustomerInfo(): Promise<CustomerInfo>`, `restorePurchases(): Promise<CustomerInfo>`, `addCustomerInfoUpdateListener(listener: (info: CustomerInfo) => void): void`, `removeCustomerInfoUpdateListener(listener: (info: CustomerInfo) => void): void`. Export `CustomerInfo` interface: `entitlements: { active: Record<string, EntitlementInfo> }`. Export `EntitlementInfo` interface: `expirationDate: string | null`, `willRenew: boolean`, `productIdentifier: string`. Follow the exact shape of `react-native-google-mobile-ads.d.ts` in `src/features/ads/types/`.
  - Verify: `npx tsc --noEmit` exits 0 (or at worst fails only on missing SubscriptionContext, not on missing react-native-purchases types)
  - Done when: `npx tsc --noEmit` does not report errors related to `react-native-purchases`

- [x] **T03: Implement SubscriptionContext and wire into layout + session** `est:40m`
  - Why: This is the core deliverable — the `useSubscription()` hook and `SubscriptionProvider` that all subsequent slices (S03, S04, S05) depend on.
  - Files: `src/features/subscriptions/SubscriptionContext.tsx`, `src/features/auth/session.tsx`, `app/_layout.tsx`, `app.config.ts`
  - Do:
    1. Create `src/features/subscriptions/SubscriptionContext.tsx`: define `SubscriptionContextValue` type with `{ isSubscriber: boolean, scanCount: number, scansRemaining: number, isLoading: boolean, restorePurchases: () => Promise<void> }`. Create context with `undefined` default. Implement `SubscriptionProvider` that: (a) reads `useSession()` to get `session.user.id`; (b) on web (`Platform.OS === 'web'`), immediately sets `{ isSubscriber: false, scanCount: 0, scansRemaining: 3, isLoading: false }` and returns; (c) on native, uses `useEffect` watching `session?.user?.id` — dynamic `import('react-native-purchases')` with try/catch, sets `sdkAvailable`, calls `Purchases.getCustomerInfo()`, checks `entitlements.active['premium']`, calls `getScanCount(userId)`, computes `scansRemaining = Math.max(0, 3 - scanCount)`, registers `addCustomerInfoUpdateListener` for real-time updates (cleanup in return), sets `isLoading: false` on both success and failure paths. Export `useSubscription()` hook that throws if used outside provider.
    2. In `src/features/auth/session.tsx`: import `Platform` from `react-native`. Add `purchasesConfiguredRef = useRef<boolean>(false)`. In the `onAuthStateChange` handler (after `safeEnsureProfile`), add: `if (nextSession?.user.id && Platform.OS !== 'web' && !purchasesConfiguredRef.current) { configurePurchases(nextSession.user.id); purchasesConfiguredRef.current = true; }`. Add `async function configurePurchases(userId: string)` that dynamically imports `react-native-purchases` and calls `Purchases.configure({ apiKey: process.env.EXPO_PUBLIC_REVENUECAT_API_KEY ?? '', appUserID: userId })` with try/catch + `console.warn` on failure.
    3. In `app/_layout.tsx`: import `SubscriptionProvider`, wrap `<ErrorBoundary>` with `<SubscriptionProvider>` — order: `SafeAreaProvider > SessionProvider > SubscriptionProvider > ErrorBoundary > Stack`.
    4. In `app.config.ts`: add `purchasesInstalled = fs.existsSync(path.join(__dirname, 'node_modules', 'react-native-purchases'))` guard; conditionally include `react-native-purchases/app.plugin` (if it exists — check README; if no plugin, skip entirely and note in comment).
  - Verify: `npx jest src/features/subscriptions/__tests__/subscription-context.test.ts --no-coverage` — all tests pass; `npx tsc --noEmit` exits 0
  - Done when: All S02 contract tests pass, tsc clean, full suite green (617+ tests)

## Files Likely Touched

- `src/features/subscriptions/types/react-native-purchases.d.ts` (new)
- `src/features/subscriptions/SubscriptionContext.tsx` (new)
- `src/features/subscriptions/__tests__/subscription-context.test.ts` (new)
- `src/features/auth/session.tsx` (modified — add configurePurchases + purchasesConfiguredRef)
- `app/_layout.tsx` (modified — add SubscriptionProvider wrapper)
- `app.config.ts` (modified — add purchases plugin guard)
