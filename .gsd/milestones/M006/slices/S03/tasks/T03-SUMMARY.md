---
id: T03
parent: S03
milestone: M006
provides:
  - PaywallPlaceholder component (modal with price copy, native/web platform branching, dynamic RevenueCatUI import)
  - scan screen updated with useSubscription, isSubscriber param, ScanLimitError catch → paywall, scansRemaining badge
  - accentBlueDark token added to src/lib/tokens.ts
key_files:
  - src/features/subscriptions/PaywallPlaceholder.tsx
  - app/(tabs)/scan/index.tsx
  - src/lib/tokens.ts
key_decisions:
  - Added accentBlueDark (#0066DD) to tokens.ts to allow zero hardcoded hex colors in new files; consistent with existing codebase pressed-state pattern
patterns_established:
  - PaywallPlaceholder uses Platform.OS === 'web' guard to choose between Modal (native) and absolute-positioned View overlay (web)
  - RevenueCatUI loaded via dynamic import with null-catch + console.warn + showAlert fallback for SDK unavailability
  - ScanLimitError caught before generic error path; triggers paywall state, not error UI
observability_surfaces:
  - console.warn('[ScanScreen] RevenueCatUI unavailable — using alert fallback') when SDK dynamic import fails on native
  - paywallVisible state in ScanUploadScreen exposes gate trigger point
  - ScanLimitError.currentCount carries count at rejection time
duration: short
verification_result: passed
completed_at: 2026-03-17
blocker_discovered: false
---

# T03: Update scan screen with remaining scans badge, ScanLimitError catch, and paywall

**Delivered PaywallPlaceholder component and wired scan screen to show remaining scans, catch ScanLimitError, and present the paywall.**

## What Happened

Created `src/features/subscriptions/PaywallPlaceholder.tsx` with:
- Props `{ visible, onDismiss }`
- Modal (native) / absolute overlay (web) rendering
- Headline "Scan Unlimited Recipes", price "$3.99 / month", 3 feature bullets with green checkmarks
- Subscribe button: native path does dynamic import of `react-native-purchases-ui`, calls `RevenueCatUI.presentPaywallIfNeeded({ requiredEntitlementIdentifier: 'premium' })` with catch → `showAlert` fallback; web path calls `showAlert('Coming Soon', ...)`
- Restore Purchases link via `useSubscription().restorePurchases()`
- All colors from tokens (zero hardcoded hex); added `accentBlueDark` token for pressed state

Updated `app/(tabs)/scan/index.tsx`:
- Added imports: `useSubscription`, `ScanLimitError`, `PaywallPlaceholder`
- Called `useSubscription()` for `isSubscriber`, `scansRemaining`, `subscriptionLoading`, `restorePurchases`
- Added `paywallVisible` state
- Passed `{ isSubscriber }` to `uploadScanPhotosWithValidation`
- In catch block: `ScanLimitError` → `setPaywallVisible(true); return` before generic error path
- Scans remaining badge: shown when `!isSubscriber && !subscriptionLoading && scansRemaining <= 3 && scansRemaining > 0`
- `<PaywallPlaceholder>` rendered outside ScrollView at bottom of return

Added `accentBlueDark = '#0066DD'` to `src/lib/tokens.ts` (existing pressed-state value used throughout codebase).

## Verification

- `npx tsc --noEmit` → exits 0 (no output)
- `npx jest --no-coverage` → 628 tests, 31 suites, 0 failures
- `rg "ScanLimitError" app/(tabs)/scan/index.tsx` → present in import and catch block
- `rg "scansRemaining" app/(tabs)/scan/index.tsx` → present in hook destructure and badge render
- `rg "#[0-9a-fA-F]{3,6}" src/features/subscriptions/PaywallPlaceholder.tsx` → no matches

## Diagnostics

- `console.warn('[ScanScreen] RevenueCatUI unavailable — using alert fallback')` — fires in device logs when native SDK is unavailable
- `paywallVisible` state in ScanUploadScreen — check component state to see if gate was triggered
- `ScanLimitError.currentCount` — carries exact scan count at time of rejection

## Deviations

- Added `accentBlueDark` token to `src/lib/tokens.ts` (unplanned but necessary to satisfy zero-hardcoded-hex requirement; low-risk additive change consistent with existing codebase patterns)

## Known Issues

none

## Files Created/Modified

- `src/features/subscriptions/PaywallPlaceholder.tsx` — new paywall modal component
- `app/(tabs)/scan/index.tsx` — subscription integration, ScanLimitError catch, scans badge, paywall render
- `src/lib/tokens.ts` — added accentBlueDark token
