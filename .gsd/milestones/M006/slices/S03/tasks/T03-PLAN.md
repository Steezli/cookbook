---
estimated_steps: 6
estimated_files: 4
---

# T03: Update scan screen with remaining scans badge, ScanLimitError catch, and paywall

**Slice:** S03 — Scan Gating + Paywall
**Milestone:** M006

## Description

Delivers the user-visible surfaces of S03. Updates `app/(tabs)/scan/index.tsx` to: (1) read subscription state from `useSubscription()`, (2) pass `isSubscriber` into `uploadScanPhotosWithValidation`, (3) catch `ScanLimitError` and present the paywall instead of generic error UI, (4) show a remaining scans badge for free users. Creates `PaywallPlaceholder` component — a modal that shows pricing copy, a stub Subscribe button (native path attempts `RevenueCatUI.presentPaywallIfNeeded` via dynamic import; web shows the placeholder), and a Restore Purchases link. S05 replaces the web billing path.

## Steps

1. Create `src/features/subscriptions/PaywallPlaceholder.tsx`. Props: `{ visible: boolean; onDismiss: () => void }`. Uses `Modal` from react-native (or a conditional View-overlay on web — use `Platform.OS === 'web'` check). Shows: headline ("Scan Unlimited Recipes"), price line ("$3.99 / month"), feature bullets (Unlimited Scans, No Ads), Subscribe button (tapping it: on `Platform.OS !== 'web'`, dynamic import `react-native-purchases-ui` and call `RevenueCatUI.presentPaywallIfNeeded({ requiredEntitlementIdentifier: 'premium' })` with `.catch(() => showAlert('Subscribe', 'Please visit Settings > Subscriptions to manage your subscription.'))`; on web: `showAlert('Coming Soon', 'Web subscriptions coming soon!')`), Restore Purchases link (`restorePurchases()` from props or import `useSubscription`), dismiss button. All colors from tokens; no hardcoded hex values.
2. In `app/(tabs)/scan/index.tsx`: add imports — `useSubscription` from `@/features/subscriptions/SubscriptionContext`, `ScanLimitError` from `@/features/scan/errors`, `PaywallPlaceholder` from `@/features/subscriptions/PaywallPlaceholder`.
3. Inside `ScanUploadScreen`: call `const { isSubscriber, scansRemaining, isLoading, restorePurchases } = useSubscription()`. Add `const [paywallVisible, setPaywallVisible] = useState(false)`.
4. In `handleUpload`: pass `isSubscriber` into the `uploadScanPhotosWithValidation` call options. In the `catch` block, add `if (error instanceof ScanLimitError) { setPaywallVisible(true); return; }` before the existing generic error path.
5. In the render, add the scans remaining badge. Place it near the upload button area (above or below). Condition: `{!isSubscriber && !isLoading && scansRemaining <= 3}`. Show: `"{scansRemaining} scan{scansRemaining !== 1 ? 's' : ''} remaining this month"`. Use `textSecondary` color and `fontSizeSm` from tokens. Show nothing when `scansRemaining === 0` (paywall will fire on next attempt).
6. Render `<PaywallPlaceholder visible={paywallVisible} onDismiss={() => setPaywallVisible(false)} />` at the bottom of the return, outside ScrollView.

## Must-Haves

- [ ] `PaywallPlaceholder.tsx` exists with price copy, Subscribe button, Restore link, dismiss control
- [ ] Subscribe button on native: dynamic import `react-native-purchases-ui`, call `presentPaywallIfNeeded`, fallback to `showAlert`
- [ ] Subscribe button on web: `showAlert` "Coming Soon" placeholder
- [ ] `useSubscription()` called in scan screen; `isSubscriber` passed to upload options
- [ ] `catch (error instanceof ScanLimitError)` sets `paywallVisible = true` (not generic error state)
- [ ] Remaining scans badge rendered when `!isSubscriber && !isLoading`
- [ ] Zero hardcoded hex colors in new files (all from tokens)
- [ ] `npx tsc --noEmit` exits 0
- [ ] `npx jest --no-coverage` → ≥624 tests, 0 failures

## Verification

- `npx tsc --noEmit` → exits 0
- `npx jest --no-coverage` → ≥624 tests, 0 failures
- `rg "ScanLimitError" app/(tabs)/scan/index.tsx` → present
- `rg "scansRemaining" app/(tabs)/scan/index.tsx` → present
- `rg "#[0-9a-fA-F]{3,6}" src/features/subscriptions/PaywallPlaceholder.tsx` → no matches (zero hardcoded hex)

## Observability Impact

- Signals added/changed: `console.warn('[ScanScreen] RevenueCatUI unavailable — using alert fallback')` when native SDK dynamic import fails; `paywallVisible` state exposes the gate trigger in component state
- How a future agent inspects this: Check `scansRemaining` value from `useSubscription()` in the scan screen; check `paywallVisible` state; `console.warn` in device logs for SDK availability
- Failure state exposed: `ScanLimitError` caught and surfaced as paywall trigger rather than silent failure; SDK unavailability logged as warn with fallback path

## Inputs

- `src/features/subscriptions/SubscriptionContext.tsx` — `useSubscription()` hook API: `{ isSubscriber, scanCount, scansRemaining, isLoading, restorePurchases }`
- `src/features/scan/errors.ts` — `ScanLimitError` with `currentCount` field
- `app/(tabs)/scan/index.tsx` — existing `handleUpload` catch block, `uploadScanPhotosWithValidation` call, render structure
- `src/features/ads/AdBanner.tsx` — dynamic import pattern for native SDK fallback (structural reference)
- `src/lib/tokens.ts` — color/spacing tokens for `PaywallPlaceholder` styling
- `src/lib/alert.ts` — `showAlert` for fallback and web placeholder

## Expected Output

- `src/features/subscriptions/PaywallPlaceholder.tsx` — paywall modal component with price copy, native/web platform branching, dynamic import RevenueCatUI
- `app/(tabs)/scan/index.tsx` — updated with `useSubscription`, `isSubscriber` param to upload, `ScanLimitError` catch + paywall, scans remaining badge
- `npx tsc --noEmit` exits 0; `npx jest --no-coverage` ≥624 tests passing
