# S04: Ad Suppression for Subscribers — UAT

**Milestone:** M006
**Written:** 2026-03-17

## UAT Type

- UAT mode: artifact-driven
- Why this mode is sufficient: S04 proof level is contract-only per the slice plan. The subscriber suppression logic is a pure boolean function (`shouldSuppressAd`) and a conditional early return — both fully exercisable in Jest with a mocked `useSubscription`. Visual/runtime verification on a subscribed device is explicitly deferred to M006 DoD (EAS build required for RevenueCat entitlement).

## Preconditions

- `npx jest --no-coverage` passes (634 tests, 0 failures)
- `npx tsc --noEmit` exits 0
- `src/features/subscriptions/SubscriptionContext.tsx` (S02) exports `useSubscription`

## Smoke Test

```bash
npx jest src/features/ads/__tests__/AdBanner.test.ts src/features/ads/__tests__/consent.test.ts --no-coverage
# Expected: 66 passed, 0 failed
```

## Test Cases

### 1. Subscriber suppression — shouldSuppressAd logic

1. Run: `npx jest src/features/ads/__tests__/AdBanner.test.ts --no-coverage`
2. Check `shouldSuppressAd describe` block
3. **Expected:** `shouldSuppressAd(false, true)` → `true`; `shouldSuppressAd(true, true)` → `false` (loading guard); `shouldSuppressAd(false, false)` → `false` (non-subscriber)

### 2. AdBanner returns null for subscriber

1. In test: mock `useSubscription` to return `{ isLoading: false, isSubscriber: true }`
2. Render `<AdBanner />`
3. **Expected:** component renders `null` — no ad surface in the DOM

### 3. AdBanner renders for free user

1. In test: mock `useSubscription` to return `{ isLoading: false, isSubscriber: false }`
2. Render `<AdBanner />`
3. **Expected:** normal ad surface rendered (web placeholder or native AdMob path)

### 4. Consent bypass for subscriber

1. Run: `npx jest src/features/ads/__tests__/consent.test.ts --no-coverage`
2. Check `subscriber consent bypass` describe block
3. **Expected:** `getConsentStatus({ isSubscriber: true })` → `'not_required'`; `requestConsent({ isSubscriber: true })` → `'not_required'`

### 5. Consent flow unchanged for non-subscriber

1. Call `getConsentStatus({ isSubscriber: false })`
2. **Expected:** normal consent flow runs — does NOT immediately return `'not_required'`

## Edge Cases

### Loading state — no premature suppression

1. Mock `useSubscription` to return `{ isLoading: true, isSubscriber: true }`
2. Render `<AdBanner />`
3. **Expected:** does NOT return null — placeholder renders until loading resolves (prevents layout shift)

### Existing callers unaffected

1. Call `getConsentStatus()` with no arguments
2. **Expected:** normal consent flow unchanged — backward-compatible

## Failure Signals

- Any of the 66 AdBanner/consent tests failing
- `shouldSuppressAd(false, true)` returns `false` — subscriber would see ads
- `getConsentStatus({ isSubscriber: true })` does not return `'not_required'` — consent shown to subscribers
- `npx tsc --noEmit` non-zero exit — type regression introduced

## Requirements Proved By This UAT

- **SUB-04** (Ad-free experience for subscribers) — contract-level proof: `AdBanner` returns `null` for `isSubscriber: true`; GDPR consent skipped for subscribers; immediate suppression guaranteed by `addCustomerInfoUpdateListener` in `SubscriptionProvider` (S02)

## Not Proven By This UAT

- Visual verification that a subscribed user on a real device sees no ads — deferred to M006 DoD (requires EAS build + live RevenueCat entitlement)
- `NativeAdBanner` consent useEffect explicitly passing `isSubscriber` — implementation skips this since the wrapper already short-circuits before `NativeAdBanner` renders; deferred as belt-and-suspenders work if desired

## Notes for Tester

- Ad suppression works via a silent `return null` — there is no log line when a subscriber's ad is suppressed. If verifying on device, the absence of the ad surface is the signal.
- The `isLoading` guard is important: during the brief window while `SubscriptionProvider` resolves entitlement state, `AdBanner` renders its placeholder (not null). This prevents layout shift on app launch for subscribers.
- Full end-to-end visual verification is part of M006 DoD, not this slice.
