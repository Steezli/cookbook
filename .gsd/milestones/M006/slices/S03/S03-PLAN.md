# S03: Scan Gating + Paywall

**Goal:** A free user hitting their 3-scan limit sees a paywall; `createMultiPhotoScanJob` throws `ScanLimitError` when the limit is reached; the scan upload screen shows remaining scans for free users.
**Demo:** Jest contract tests prove gate throws `ScanLimitError` at count=3, passes at count=2, and bypasses for subscribers. The scan screen shows `scansRemaining` badge for free users. `ScanLimitError` triggers paywall presentation (native: RevenueCatUI dynamic import; web: `PaywallPlaceholder` component). TypeScript compiles clean and all tests pass.

## Must-Haves

- `createMultiPhotoScanJob(photoUrls, { isSubscriber })` increments scan count for free users and throws `ScanLimitError` when `incrementScanCount` signals limit exceeded
- Gate is bypassed entirely for subscribers (`isSubscriber: true`)
- `isSubscriber` flows from scan screen → `uploadScanPhotosWithValidation` → `uploadScanPhotos` → `createMultiPhotoScanJob`
- Scan screen reads `useSubscription()` and passes `isSubscriber` into the upload call
- Scan screen catches `ScanLimitError` and triggers paywall (not generic error UI)
- Native paywall: dynamic import `react-native-purchases-ui`, call `RevenueCatUI.presentPaywallIfNeeded({ requiredEntitlementIdentifier: 'premium' })`, guarded with `Platform.OS !== 'web'`; falls back to `showAlert` if SDK unavailable
- Web paywall: inline `PaywallPlaceholder` modal/card component with price text and stub subscribe button (replaced in S05)
- Scan screen header shows `scansRemaining` badge for free users when `!isSubscriber && !isLoading`
- `react-native-purchases-ui` type declarations in `src/features/subscriptions/types/react-native-purchases-ui.d.ts`
- `__mocks__/react-native-purchases-ui.js` + `jest.config.js` `moduleNameMapper` entry
- Jest tests: gate throws at count=3, passes at count=2, bypasses for subscriber
- `npx tsc --noEmit` exits 0
- `npx jest --no-coverage` passes (≥624 tests, zero failures)

## Proof Level

- This slice proves: contract (Jest) + implementation completeness
- Real runtime required: no (EAS build required for real RevenueCatUI rendering — deferred to milestone DoD)
- Human/UAT required: no (deferred to milestone DoD)

## Verification

- `npx jest src/features/scan/__tests__/scan-gate.test.ts --no-coverage` → 6+ tests pass
- `npx tsc --noEmit` → exits 0
- `npx jest --no-coverage` → ≥624 tests, 0 failures
- `rg "ScanLimitError" app/(tabs)/scan/index.tsx` → present in catch block
- `rg "scansRemaining" app/(tabs)/scan/index.tsx` → present in badge render
- `rg "react-native-purchases-ui" __mocks__/` → mock file exists

## Observability / Diagnostics

- Runtime signals: `ScanLimitError` propagates with `currentCount` field — callers can log it; `console.warn('[ScanScreen] RevenueCatUI unavailable')` when SDK fallback fires on native
- Inspection surfaces: `npx jest src/features/scan/__tests__/scan-gate.test.ts` — gate contract; scan screen `scansRemaining` badge shows live count
- Failure visibility: `ScanLimitError.currentCount` exposes exact count at time of rejection; `isLoading` prevents premature gate during SDK initialization
- Redaction constraints: none — no secrets or PII in scan count data

## Integration Closure

- Upstream surfaces consumed: `incrementScanCount()` + `ScanLimitError` from `src/features/subscriptions/scan-count.ts` (S01); `useSubscription()` from `src/features/subscriptions/SubscriptionContext.tsx` (S02)
- New wiring introduced: `isSubscriber` parameter threaded through scan-service → scan-photos → scan-upload → scan screen; `ScanLimitError` catch + paywall trigger in scan screen; `PaywallPlaceholder` component
- What remains before milestone is truly usable end-to-end: real RevenueCatUI rendering (EAS build), web Stripe checkout (S05), RevenueCat dashboard Offering configuration (S06)

## Tasks

- [x] **T01: Write failing Jest contract tests for scan gate** `est:25m`
  - Why: Defines the exact gate semantics before implementation — ensures S03 makes them pass, not the other way around. Also sets up the `react-native-purchases-ui` mock so later tasks don't hit Jest resolution failures.
  - Files: `src/features/scan/__tests__/scan-gate.test.ts`, `__mocks__/react-native-purchases-ui.js`, `jest.config.js`
  - Do: Create `__mocks__/react-native-purchases-ui.js` with a `RevenueCatUI` object exposing `presentPaywallIfNeeded: jest.fn()`. Add `moduleNameMapper` entry `'^react-native-purchases-ui$'` in `jest.config.js`. Create `src/features/scan/__tests__/scan-gate.test.ts` mocking `incrementScanCount` from `scan-count.ts` and asserting: (1) free user at count 1 — `createMultiPhotoScanJob` resolves; (2) free user at count 2 — resolves; (3) free user at count 3 (incrementScanCount throws ScanLimitError) — `createMultiPhotoScanJob` rejects with `ScanLimitError`; (4) subscriber — `incrementScanCount` not called, resolves. Also mock `supabase.auth.getUser` to return a user. These tests should fail (function signature not yet updated).
  - Verify: `npx jest src/features/scan/__tests__/scan-gate.test.ts --no-coverage` → tests run (and fail) without resolution errors
  - Done when: Tests are collected and failing on assertion (not on import/resolution errors); mock files exist

- [x] **T02: Gate `createMultiPhotoScanJob` and thread `isSubscriber` through the call chain** `est:35m`
  - Why: Implements the core scan gate logic and wires `isSubscriber` from the service layer entry point up through `uploadScanPhotos` and `uploadScanPhotosWithValidation`. Also adds type declarations for `react-native-purchases-ui` so TypeScript compiles.
  - Files: `src/features/scan/scan-service.ts`, `src/features/scan/scan-photos.ts`, `src/features/scan/scan-upload.ts`, `src/features/subscriptions/types/react-native-purchases-ui.d.ts`
  - Do: (1) Create `src/features/subscriptions/types/react-native-purchases-ui.d.ts` declaring `declare module 'react-native-purchases-ui'` with `RevenueCatUI.presentPaywallIfNeeded({ requiredEntitlementIdentifier: string }): Promise<void>`. (2) Add optional `options?: { isSubscriber?: boolean }` parameter to `createMultiPhotoScanJob`; after `getUser()`, if `!options?.isSubscriber`, call `await incrementScanCount(user.id)` — `ScanLimitError` bubbles naturally. (3) Thread `isSubscriber` through `uploadScanPhotos` in `scan-photos.ts` — add `isSubscriber?: boolean` to its options/parameter object and pass it into `createMultiPhotoScanJob`. (4) Thread `isSubscriber` through `uploadScanPhotosWithValidation` in `scan-upload.ts` — add `isSubscriber?: boolean` to `ScanUploadOptions` and pass it down. Defaults to false (safe). Do not double-increment — call `incrementScanCount` only once, inside `createMultiPhotoScanJob`.
  - Verify: `npx jest src/features/scan/__tests__/scan-gate.test.ts --no-coverage` → all gate tests pass; `npx tsc --noEmit` exits 0
  - Done when: All gate tests pass, TypeScript exits 0

- [x] **T03: Update scan screen with remaining scans badge, ScanLimitError catch, and paywall** `est:40m`
  - Why: Delivers the user-visible surfaces of S03 — the scan count badge for free users and the paywall trigger. Closes the integration between `useSubscription()` context and the scan upload flow.
  - Files: `app/(tabs)/scan/index.tsx`, `src/features/subscriptions/PaywallPlaceholder.tsx`
  - Do: (1) Create `src/features/subscriptions/PaywallPlaceholder.tsx` — a Modal/View component showing "$3.99/month · Unlimited Scans · No Ads" price copy, a stub "Subscribe" button (calls `restorePurchases` as placeholder — S05 replaces), a "Restore Purchases" link, and a dismiss/close control. Use tokens for all colors/spacing. (2) In `app/(tabs)/scan/index.tsx`: import `useSubscription`; call `const { isSubscriber, scansRemaining, isLoading, restorePurchases } = useSubscription()`. (3) Add `paywallVisible` state boolean. (4) Pass `isSubscriber` into `uploadScanPhotosWithValidation` call (inside `handleUpload`). (5) In the `catch` block of `handleUpload`, check `error instanceof ScanLimitError` first — if true, set `paywallVisible = true` instead of setting `uploadResult` error. (6) In the render, add scans remaining badge: render `{!isSubscriber && !isLoading && <Text>...scansRemaining scans remaining this month</Text>}` near the upload button area. Use tokens for styling. (7) Render `<PaywallPlaceholder visible={paywallVisible} onDismiss={() => setPaywallVisible(false)} />`. (8) In `PaywallPlaceholder`, add native paywall presentation: when subscribe is tapped and `Platform.OS !== 'web'`, do `const RCUIModule = await import('react-native-purchases-ui').catch(() => null)` and call `RCUIModule?.default?.RevenueCatUI?.presentPaywallIfNeeded(...)` or log warn if unavailable.
  - Verify: `npx tsc --noEmit` exits 0; `npx jest --no-coverage` → ≥624 tests, 0 failures; `rg "ScanLimitError" app/(tabs)/scan/index.tsx` confirms catch; `rg "scansRemaining" app/(tabs)/scan/index.tsx` confirms badge
  - Done when: TypeScript exits 0, all tests pass, `ScanLimitError` catch and badge render are present in scan screen

## Files Likely Touched

- `src/features/scan/__tests__/scan-gate.test.ts` — new: contract tests for scan gate
- `__mocks__/react-native-purchases-ui.js` — new: Jest mock for RevenueCatUI
- `jest.config.js` — modified: moduleNameMapper entry for react-native-purchases-ui
- `src/features/scan/scan-service.ts` — modified: `isSubscriber` param, `incrementScanCount` call
- `src/features/scan/scan-photos.ts` — modified: thread `isSubscriber` through `uploadScanPhotos`
- `src/features/scan/scan-upload.ts` — modified: `isSubscriber` in `ScanUploadOptions`, thread down
- `src/features/subscriptions/types/react-native-purchases-ui.d.ts` — new: TypeScript declarations
- `src/features/subscriptions/PaywallPlaceholder.tsx` — new: web + native paywall placeholder component
- `app/(tabs)/scan/index.tsx` — modified: `useSubscription`, badge, `ScanLimitError` catch, paywall modal
