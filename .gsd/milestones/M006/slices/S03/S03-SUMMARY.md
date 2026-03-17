---
id: S03
parent: M006
milestone: M006
provides:
  - scan gate in createMultiPhotoScanJob (incrementScanCount for free users, ScanLimitError bubbles)
  - isSubscriber threaded through ScanUploadOptions → uploadScanPhotos → createMultiPhotoScanJob (web + native paths)
  - PaywallPlaceholder component (Modal native / absolute overlay web; dynamic RevenueCatUI import with fallback)
  - scan screen: useSubscription, scansRemaining badge, ScanLimitError catch → paywall state
  - react-native-purchases-ui type declarations + Jest mock
  - accentBlueDark token added to src/lib/tokens.ts
requires:
  - slice: S01
    provides: incrementScanCount, ScanLimitError
  - slice: S02
    provides: useSubscription hook (isSubscriber, scansRemaining, isLoading, restorePurchases)
affects:
  - S04
  - S05
key_files:
  - src/features/scan/__tests__/scan-gate.test.ts
  - __mocks__/react-native-purchases-ui.js
  - jest.config.js
  - src/features/scan/scan-service.ts
  - src/features/scan/scan-photos.ts
  - src/features/scan/scan-upload.ts
  - src/features/subscriptions/types/react-native-purchases-ui.d.ts
  - src/features/subscriptions/PaywallPlaceholder.tsx
  - app/(tabs)/scan/index.tsx
  - src/lib/tokens.ts
key_decisions:
  - isSubscriber passed as parameter to service layer (not context access) — keeps service testable in Jest
  - isSubscriber threaded through both web and native uploadScanPhotos paths for consistency
  - ScanLimitError caught before generic error path in handleUpload → paywallVisible state
  - PaywallPlaceholder uses dynamic import for RevenueCatUI with null-catch + showAlert fallback
  - Platform.OS === 'web' guard in PaywallPlaceholder: Modal on native, absolute overlay on web
  - accentBlueDark (#0066DD) added to tokens.ts to maintain zero-hardcoded-hex policy
patterns_established:
  - react-native-purchases-ui mock mirrors react-native-purchases mock shape
  - isSubscriber defaults false at every call site (conservative/safe)
  - ScanLimitError.currentCount exposes count at rejection time
observability_surfaces:
  - npx jest src/features/scan/__tests__/scan-gate.test.ts — primary gate contract diagnostic
  - console.warn('[ScanScreen] RevenueCatUI unavailable — using alert fallback') — native SDK fallback signal
  - ScanLimitError.currentCount — exact count at rejection, visible in caller logs
  - paywallVisible state — confirms gate was triggered in scan screen
drill_down_paths:
  - .gsd/milestones/M006/slices/S03/tasks/T01-SUMMARY.md
  - .gsd/milestones/M006/slices/S03/tasks/T02-SUMMARY.md
  - .gsd/milestones/M006/slices/S03/tasks/T03-SUMMARY.md
duration: ~1.5 hours (3 tasks)
verification_result: passed
completed_at: 2026-03-17
---

# S03: Scan Gating + Paywall

**Free users hitting their 3-scan monthly limit now see a paywall — `createMultiPhotoScanJob` throws `ScanLimitError` at limit, the scan screen catches it and presents `PaywallPlaceholder`, and a remaining-scans badge shows live count for free users.**

## What Happened

**T01** established the test-first foundation: created `__mocks__/react-native-purchases-ui.js`, added the `moduleNameMapper` entry in `jest.config.js`, and wrote 4 gate contract tests (3 intentionally failing). Extended `createMultiPhotoScanJob` signature to accept `CreateMultiPhotoScanJobOptions | string[]` for backward compatibility.

**T02** implemented the gate logic: `createMultiPhotoScanJob` now imports `incrementScanCount` and calls it for non-subscribers before the DB insert — `ScanLimitError` bubbles naturally when the limit is hit. `isSubscriber` was threaded through the full call chain (`ScanUploadOptions` → `uploadScanPhotosWithValidation` → `uploadScanPhotos` → both web and native code paths → `createMultiPhotoScanJob`). TypeScript declarations for `react-native-purchases-ui` were added. All 4 gate tests passed after implementation.

**T03** delivered the user-visible surfaces: `PaywallPlaceholder.tsx` (price copy, feature bullets, Subscribe + Restore Purchases, platform-branched rendering, dynamic RevenueCatUI import with fallback), and scan screen updates (`useSubscription` call, `isSubscriber` passed into upload, `ScanLimitError` catch → `paywallVisible` state, `scansRemaining` badge). Added `accentBlueDark` token to maintain zero-hardcoded-hex policy.

## Verification

- `npx jest src/features/scan/__tests__/scan-gate.test.ts --no-coverage` → 4/4 pass
- `npx tsc --noEmit` → exits 0 (no output)
- `npx jest --no-coverage` → 628 tests, 31 suites, 0 failures
- `rg "ScanLimitError" app/(tabs)/scan/index.tsx` → present in import and catch block ✓
- `rg "scansRemaining" app/(tabs)/scan/index.tsx` → present in badge render ✓
- `rg "react-native-purchases-ui" __mocks__/` → mock file exists ✓

## Requirements Advanced

- SUB-01 — scan gate now enforces free/subscriber branching; `createMultiPhotoScanJob` is the enforcement point
- SUB-02 — paywall is triggered and `PaywallPlaceholder` presented on `ScanLimitError`; native RevenueCatUI path wired (requires EAS for real rendering)
- SUB-05 — gate fires at count=3; incrementScanCount is called per free scan; failed scans don't count (exception before DB insert)
- SUB-06 — `scansRemaining` badge renders on scan screen for free users when `!isSubscriber && !subscriptionLoading`

## Requirements Validated

- none — SUB-01/02/05/06 require EAS build + real device for full operational validation (deferred to M006 DoD)

## New Requirements Surfaced

- none

## Requirements Invalidated or Re-scoped

- none

## Deviations

- `isSubscriber` was also threaded through `uploadScanPhotosInline` (native inline upload path), which the plan didn't mention explicitly. Necessary to ensure the gate applies on both platforms.
- `accentBlueDark` token added to `src/lib/tokens.ts` (unplanned). Required to maintain zero-hardcoded-hex policy in new `PaywallPlaceholder.tsx`.

## Known Limitations

- `PaywallPlaceholder` Subscribe button on web shows "Coming Soon" alert — replaced in S05 with real Stripe checkout via `@revenuecat/purchases-js`
- Native RevenueCatUI rendering requires EAS build — cannot be verified in Expo Go or local dev
- Operational validation (real 3-scan limit enforcement, RevenueCatUI presentation on device) deferred to M006 DoD

## Follow-ups

- S05 replaces `PaywallPlaceholder` web stub with real Stripe checkout
- M006 DoD: EAS build needed to verify RevenueCatUI renders correctly on iOS/Android
- M006 DoD: Test 3-scan limit enforcement end-to-end on device

## Files Created/Modified

- `src/features/scan/__tests__/scan-gate.test.ts` — gate contract tests (4 tests)
- `__mocks__/react-native-purchases-ui.js` — Jest mock for RevenueCatUI SDK
- `jest.config.js` — moduleNameMapper entry for react-native-purchases-ui
- `src/features/scan/scan-service.ts` — CreateMultiPhotoScanJobOptions, gate logic (incrementScanCount + ScanLimitError)
- `src/features/scan/scan-photos.ts` — isSubscriber threaded through uploadScanPhotos (web + native paths)
- `src/features/scan/scan-upload.ts` — isSubscriber in ScanUploadOptions, passed to uploadScanPhotos
- `src/features/subscriptions/types/react-native-purchases-ui.d.ts` — TypeScript declarations
- `src/features/subscriptions/PaywallPlaceholder.tsx` — paywall modal component
- `app/(tabs)/scan/index.tsx` — useSubscription, ScanLimitError catch, paywall render, scansRemaining badge
- `src/lib/tokens.ts` — accentBlueDark token added

## Forward Intelligence

### What the next slice should know
- `PaywallPlaceholder` is a deliberate placeholder — S05 replaces the web Subscribe button with real RevenueCat Web Billing. The component structure (visible/onDismiss props, Subscribe handler) is stable; S05 only needs to replace the handler body.
- `isSubscriber` is now available throughout the upload chain. S04 (AdBanner) only needs `useSubscription()` — no changes to scan-service or upload chain needed.
- `uploadScanPhotosInline` (native path in scan-photos.ts) also receives `isSubscriber` — the gate applies on both platforms.

### What's fragile
- Dynamic import of `react-native-purchases-ui` in PaywallPlaceholder — if the module changes its export shape, the null-catch fallback silently degrades to alert. Test in EAS build before ship.
- `scansRemaining <= 3` guard in badge render — badge only shows when count is 3 or fewer. If a subscriber's `scansRemaining` is not `Infinity` or a large number from context, badge could appear incorrectly. Verify `useSubscription` returns correct shape for subscribers.

### Authoritative diagnostics
- `npx jest src/features/scan/__tests__/scan-gate.test.ts` — primary contract verification for gate behavior; run first when gate behavior seems wrong
- `ScanLimitError.currentCount` — exact Supabase count at time of rejection; most actionable field for diagnosing premature/late gate triggers

### What assumptions changed
- Plan assumed `uploadScanPhotosInline` (native path) didn't need updating; in practice it does receive isSubscriber since both paths call into the same gate. Threading was extended to native inline path.
