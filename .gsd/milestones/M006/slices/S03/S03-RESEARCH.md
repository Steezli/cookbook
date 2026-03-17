# S03: Scan Gating + Paywall — Research

**Date:** 2026-03-17

## Summary

S03 wires S01 and S02 together into a working user-visible scan gate. All the hard infrastructure is in place: `incrementScanCount()` throws `ScanLimitError` at count > 3 (S01), `useSubscription()` returns `{ isSubscriber, scanCount, scansRemaining }` (S02). The work here is threefold: (1) gate `createMultiPhotoScanJob` to check subscriber status and increment the count before inserting the job, (2) update `app/(tabs)/scan/index.tsx` to display remaining scans for free users and catch `ScanLimitError` to present the paywall, and (3) wire paywall presentation — `RevenueCatUI.presentPaywallIfNeeded()` on native, a placeholder web component on web (replaced in S05).

The gate belongs in `createMultiPhotoScanJob` in `scan-service.ts`, not in `scan-upload.ts` or the UI. This is the single entry point for all scan jobs and the only place where the gate cannot be bypassed. The current `createMultiPhotoScanJob` already calls `supabase.auth.getUser()` — the subscriber check slots in immediately after that, before the `scan_jobs` insert.

One subtle complexity: `createMultiPhotoScanJob` is a standalone async function, not a React component — it cannot call `useSubscription()` directly. It needs to receive `isSubscriber` as a parameter, or accept the subscription state from a caller that has context access. The scan upload screen (`index.tsx`) already calls `uploadScanPhotosWithValidation` → `createMultiPhotoScanJob` indirectly. The cleanest approach is to accept `isSubscriber` as an optional parameter to `createMultiPhotoScanJob` (defaults to false for safety) and have the scan screen pass it from `useSubscription()`. This keeps the service layer testable without React context.

## Recommendation

Gate `createMultiPhotoScanJob` by adding an optional `isSubscriber?: boolean` parameter. At the start of the function, after auth: if `!isSubscriber`, call `incrementScanCount(user.id)` — which internally throws `ScanLimitError` when `new_count > 3`. The scan screen calls `useSubscription()`, passes `isSubscriber` to the upload flow, and wraps `handleUpload` in a try/catch that detects `ScanLimitError` and triggers paywall presentation.

For paywall presentation: dynamic import `react-native-purchases-ui` (not `react-native-purchases`) using the same fallback pattern as `AdBanner`; call `RevenueCatUI.presentPaywallIfNeeded({ requiredEntitlementIdentifier: 'premium' })`. On web, `Platform.OS === 'web'` guard — render a placeholder `<PaywallPlaceholder>` component inline (a simple modal or card with price text and a subscribe button stub). S05 replaces this placeholder with real Stripe checkout.

For the remaining scan count badge: render inline in the scan upload screen header, conditional on `!isSubscriber && !isLoading`. Use `scansRemaining` from `useSubscription()`.

## Don't Hand-Roll

| Problem | Existing Solution | Why Use It |
|---------|------------------|------------|
| Atomic scan count increment with limit detection | `incrementScanCount()` from `scan-count.ts` (S01) | Already throws `ScanLimitError` at count > 3; handles `ON CONFLICT DO UPDATE` race safety |
| Subscriber entitlement check | `useSubscription()` from `SubscriptionContext.tsx` (S02) | Already initialized, caches state, handles SDK unavailability gracefully |
| Native paywall presentation | `RevenueCatUI.presentPaywallIfNeeded()` | Apple-approved UI with required subscription disclosures; avoids App Store rejection risk |
| Dynamic import pattern for native-only SDK | `src/features/ads/AdBanner.tsx` + `SubscriptionContext.tsx` | Established pattern for EAS-only packages — dynamic `import('react-native-purchases-ui').catch(() => null)` |

## Existing Code and Patterns

- `src/features/scan/scan-service.ts` `createMultiPhotoScanJob()` — **gate insertion point**. After `getUser()` check, before `supabase.from('scan_jobs').insert(...)`. Add `isSubscriber?: boolean` parameter. If not subscriber, call `incrementScanCount(user.id)`. `ScanLimitError` bubbles up naturally to the caller.
- `src/features/subscriptions/scan-count.ts` `incrementScanCount()` — throws `ScanLimitError` when `data > 3`; correct semantics are already in place from S01.
- `src/features/scan/errors.ts` — `ScanLimitError` with `currentCount` field already exported; callers use `instanceof ScanLimitError` to distinguish from other errors.
- `src/features/subscriptions/SubscriptionContext.tsx` `useSubscription()` — returns `{ isSubscriber, scanCount, scansRemaining, isLoading }`. The scan screen is already inside `SubscriptionProvider` (wired in `app/_layout.tsx`).
- `app/(tabs)/scan/index.tsx` `handleUpload` — current catch block sets `uploadResult` error state; extend it to check `error instanceof ScanLimitError` and trigger paywall. The screen already imports `showAlert` and `router`.
- `src/features/ads/AdBanner.tsx` — **type declaration pattern** for native-only SDKs via dynamic import + `sdkAvailable` state boolean. Follow exactly for `react-native-purchases-ui`.
- `src/features/subscriptions/types/react-native-purchases.d.ts` — existing type declarations for `react-native-purchases`. A companion `react-native-purchases-ui.d.ts` is needed for `RevenueCatUI` (different package).

## Constraints

- `react-native-purchases-ui` is a **separate package** from `react-native-purchases` — it must be declared separately in type declarations and imported separately via dynamic import.
- `RevenueCatUI.presentPaywallIfNeeded()` on web does nothing or throws — must be guarded with `Platform.OS !== 'web'` before calling.
- `createMultiPhotoScanJob` cannot call `useSubscription()` — it's a plain async function outside React. `isSubscriber` must be passed as a parameter from a component that has context access.
- The scan limit check must happen **before** `scan_jobs` insert — not after photo upload. Photos are already uploaded by the time `createMultiPhotoScanJob` is called; the gate decides whether to record the job (= count the scan).
- All error display must use `showAlert` / `confirmAction` from `@/lib/alert` (established constraint) — except inline UI states which should use styled View/Text error components using tokens.
- All new UI tokens must come from `src/lib/tokens.ts` — no hardcoded hex values.
- `incrementScanCount` throws `ScanLimitError` when `new_count > 3` (strictly greater than) — meaning the 4th scan attempt is blocked. Counts 1, 2, 3 succeed. This is already correct in S01's implementation.

## Common Pitfalls

- **`isSubscriber` defaults to false, not true** — if context is unavailable or loading, the gate should be conservative (treat as free user). Safe default: block on `isLoading` until resolved, or pass `isSubscriber ?? false`. Do not default to `true`.
- **Double-incrementing the count** — if `incrementScanCount` is called before the gate check and again after, the count advances twice. Call it once, before the insert, and only if not a subscriber.
- **`ScanLimitError` caught too broadly** — the existing `catch (error)` in `handleUpload` sets generic error state. Add `instanceof ScanLimitError` check first, before the generic catch, to trigger paywall path instead of error UI.
- **Paywall presented before `RevenueCatUI` is available** — the SDK requires an EAS build. On local dev/web, the dynamic import returns null. If the SDK is unavailable on native (fallback path), fall back to `showAlert` explaining the limit and directing to subscription settings. Do not crash.
- **`react-native-purchases-ui` not mocked in Jest** — same issue as `react-native-purchases` in S02. A `__mocks__/react-native-purchases-ui.js` module + `moduleNameMapper` entry in `jest.config.js` is required. Without it, Jest will fail to resolve the module in tests that import the scan service.
- **Scan screen renders before subscription state loads** — on native, `isLoading` is `true` briefly after mount. The scan badge and gate logic should handle `isLoading: true` gracefully (hide badge, don't block UI, defer gate until loaded).
- **`scansRemaining` goes negative** — `computeSubscriptionState` already clamps to `Math.max(0, 3 - scanCount)`. Display "0 scans remaining" correctly rather than negative numbers.

## Open Risks

- `RevenueCatUI.presentPaywallIfNeeded()` API shape — needs verification via `get_library_docs` before implementation. The method signature may require an options object or `Offering` parameter. The `requiredEntitlementIdentifier` field name must match exactly.
- App Store guidelines require the paywall to show price + subscription period + auto-renewal disclosure before the user commits. RevenueCat's built-in paywall handles this, but only if the RevenueCat dashboard has a configured Offering with a Package and product attached. Without that setup, the paywall will fail to render (SDK returns no offerings). The placeholder web component sidesteps this for web — but native paywall depends on RevenueCat dashboard configuration being in place.
- `react-native-purchases-ui` may or may not be the correct package name (could be `react-native-purchases/ui` sub-path or bundled in `react-native-purchases`). Verify package structure before writing type declarations.
- The Jest test for `createMultiPhotoScanJob` gate needs to mock `useSubscription` state — but the function accepts `isSubscriber` as a parameter, so the mock is on the parameter, not the hook. This is cleaner and avoids context mocking.

## Skills Discovered

| Technology | Skill | Status |
|------------|-------|--------|
| RevenueCat / react-native-purchases-ui | none installed | none found in available_skills |
| expo-image-picker / React Native scan UI | none needed | existing code is clear |

## Sources

- `src/features/scan/scan-service.ts` — gate insertion point, auth pattern (source: codebase)
- `src/features/subscriptions/scan-count.ts` — `incrementScanCount` throws `ScanLimitError` at `data > 3` (source: codebase)
- `src/features/subscriptions/SubscriptionContext.tsx` — `useSubscription()` hook API, `isLoading` behavior, web vs native branch (source: codebase)
- `app/(tabs)/scan/index.tsx` — `handleUpload` error handling, existing catch block pattern, UI structure for badge insertion (source: codebase)
- `src/features/ads/AdBanner.tsx` — dynamic import pattern for `react-native-purchases-ui` (source: codebase, established S02/S13 pattern)
- S02-SUMMARY.md — `isLoading` semantics, `restorePurchases()` API, `purchasesConfiguredRef` guard, `__mocks__` requirement (source: preloaded context)
- RevenueCat `presentPaywallIfNeeded` — requires `react-native-purchases-ui` separate package, `requiredEntitlementIdentifier` option (source: M006-RESEARCH.md + Context7 to verify)
