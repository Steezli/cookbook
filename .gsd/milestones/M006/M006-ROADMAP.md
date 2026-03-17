# M006: Subscriptions

**Vision:** Add a freemium subscription model — 3 free photo scans per calendar month, unlimited scans and no ads for $3.99/month subscribers — using RevenueCat across iOS, Android, and web (Stripe-backed).

## Success Criteria

- A free user can scan 3 times, then sees a paywall on the 4th attempt
- A subscriber can scan unlimited times with no ads anywhere in the app
- A web user can subscribe via Stripe checkout and immediately access premium features
- Remaining free scan count is visible to free users on the scan upload screen
- Scan count resets on the 1st of each calendar month
- Promotional entitlements granted via RevenueCat dashboard work correctly
- Purchase restoration works on a new device

## Key Risks / Unknowns

- **RevenueCat SDK requires EAS builds** — `react-native-purchases` can't be tested in Expo Go or local dev; same constraint as AdMob but the integration is more complex (entitlement checks, paywall presentation)
- **Web billing API maturity** — `@revenuecat/purchases-js` is newer than the native SDK; API shape and React Native Web compatibility need validation before full commitment
- **SDK initialization race** — RevenueCat must be configured before any entitlement check runs; lazy initialization causes false "no entitlement" for legitimate subscribers

## Proof Strategy

- RevenueCat SDK requires EAS builds → retire in S02 by shipping working entitlement check + context provider that compiles without errors in local dev (dynamic import + fallback pattern), and subscription state verifiable via Jest tests
- Web billing API maturity → retire in S03 by shipping functional web paywall with `@revenuecat/purchases-js` checkout in Stripe test mode
- SDK initialization race → retire in S02 by initializing RevenueCat in the session provider alongside Supabase auth, documented in tests

## Verification Classes

- Contract verification: Jest tests for scan count RPC logic, ScanLimitError typing, entitlement check hook behavior (mock SDK), ad suppression logic
- Integration verification: RevenueCat SDK compiles and initializes in EAS dev build; Supabase scan_count RPC increments atomically; paywall presents on iOS/Android
- Operational verification: Real purchase on TestFlight/internal track; Stripe test-mode checkout on web; promotional entitlement granted via RevenueCat dashboard
- UAT / human verification: 3-scan free limit enforced end-to-end; subscriber sees no ads; scan count resets on month boundary; purchase restores on new device

## Milestone Definition of Done

This milestone is complete only when all are true:

- All 6 slices complete with their individual verification passing
- `npx tsc --noEmit` exits 0
- `npx jest` passes (602+ tests, zero failures)
- Supabase migration for `user_scan_counts` deployed to remote and types regenerated
- RevenueCat SDK initializes in EAS dev build without errors
- Free user sees paywall on 4th scan attempt (tested on device or simulator)
- Subscriber sees no ads anywhere in the app (tested manually)
- Web Stripe test-mode checkout completes and entitlement is reflected immediately
- Scan count display correct for free users on scan upload screen

## Requirement Coverage

- Covers: SUB-01, SUB-02, SUB-03, SUB-04, SUB-05, SUB-06
- Partially covers: none
- Leaves for later: none
- Orphan risks: none

## Slices

- [x] **S01: Supabase Scan Count Infrastructure** `risk:high` `depends:[]`
  > After this: A free user's scan count is tracked server-side with an atomic Postgres RPC — enforced by Jest tests proving count increments, limit detection, and month rollover work correctly. The migration is deployable and types regenerated.

- [x] **S02: RevenueCat SDK + Subscription Context** `risk:high` `depends:[S01]`
  > After this: `useSubscription()` hook returns `{ isSubscriber, scanCount, scansRemaining }` — RevenueCat initialized in the session provider with dynamic import + fallback (same pattern as AdMob), subscription state tested with mock SDK, TypeScript compiles clean locally.

- [x] **S03: Scan Gating + Paywall** `risk:medium` `depends:[S02]`
  > After this: A free user hitting their 3-scan limit sees the RevenueCat paywall on iOS/Android and a custom paywall on web; `createMultiPhotoScanJob` throws `ScanLimitError` when limit is reached; scan upload screen shows remaining scans for free users.

- [x] **S04: Ad Suppression for Subscribers** `risk:low` `depends:[S02]`
  > After this: `AdBanner` calls `useSubscription()` and returns null for active subscribers — ad suppression is immediate on purchase without app restart; GDPR consent flow is skipped for subscribers; verified via Jest and manual walkthrough.

- [ ] **S05: Web Billing via Stripe** `risk:medium` `depends:[S03]`
  > After this: Web users can complete a Stripe test-mode checkout via `@revenuecat/purchases-js`, entitlement is immediately reflected in `useSubscription()`, and the web paywall screen shows the correct price and subscribe button.

- [ ] **S06: Setup Guides + Promotional Entitlements** `risk:low` `depends:[S05]`
  > After this: `docs/subscription-setup.md` covers step-by-step RevenueCat, App Store Connect, Google Play Console, and Stripe configuration; promotional entitlement process documented; EAS env var setup documented; milestone acceptance verified end-to-end on device.

## Boundary Map

### S01 → S02, S03

Produces:
- `supabase/migrations/20260317000000_add_scan_counts.sql` — `user_scan_counts(user_id, year_month TEXT, count INTEGER)` table with RLS, unique constraint `(user_id, year_month)`, and `increment_scan_count(p_user_id uuid)` RPC that computes `year_month` server-side via `TO_CHAR(NOW(), 'YYYY-MM')` and returns `new_count`
- `src/lib/database.types.ts` — regenerated to include `user_scan_counts` table and `increment_scan_count` RPC
- `src/features/subscriptions/scan-count.ts` — `getScanCount(userId)` and `incrementScanCount(userId)` client wrappers
- `ScanLimitError` typed error class exported from `src/features/scan/errors.ts`
- Jest tests: count increments atomically, limit detection at count ≥ 3, month key rollover, failed scan not counted

Consumes:
- nothing (first slice)

### S02 → S03, S04, S05

Produces:
- `src/features/subscriptions/SubscriptionContext.tsx` — `SubscriptionProvider` + `useSubscription()` hook returning `{ isSubscriber: boolean, scanCount: number, scansRemaining: number, isLoading: boolean, restorePurchases: () => Promise<void> }`
- `src/features/subscriptions/types/react-native-purchases.d.ts` — minimal type declarations for native SDK (follows AdMob pattern)
- RevenueCat initialized in `src/features/auth/session.tsx` via `Purchases.configure({ apiKey, appUserID: user.id })` using dynamic import with try/catch fallback
- `SubscriptionProvider` wrapping `SessionProvider` in `app/_layout.tsx`
- Jest tests: entitlement check with mock SDK, `isSubscriber` false when no entitlement, `scansRemaining` computed from scan count

Consumes:
- `getScanCount()` + `incrementScanCount()` from S01
- `ScanLimitError` from S01

### S03 → S04, S05

Produces:
- `createMultiPhotoScanJob()` gated: checks `isSubscriber` from context; if free user, calls `incrementScanCount()` and throws `ScanLimitError` when count would exceed 3
- `app/(tabs)/scan/index.tsx` updated: shows remaining scan count badge for free users; catches `ScanLimitError` and presents paywall
- Paywall presentation: `RevenueCatUI.presentPaywallIfNeeded()` on native; placeholder web paywall component (replaced in S05)
- Jest tests: gate throws `ScanLimitError` at count=3, passes at count=2, bypasses for subscriber

Consumes:
- `useSubscription()` from S02
- `ScanLimitError` from S01

### S04 → S05, S06

Produces:
- `AdBanner` updated to call `useSubscription()` and return `null` for subscribers
- `src/features/ads/consent.ts` updated to skip GDPR consent flow for subscribers
- Jest tests: AdBanner renders null for subscriber, renders ad for free user

Consumes:
- `useSubscription()` from S02

### S05 → S06

Produces:
- `src/features/subscriptions/web-billing.ts` — `@revenuecat/purchases-js` wrapper with `initializeWebBilling()` and `startWebCheckout()`
- `app/(tabs)/scan/paywall.tsx` — web-only paywall screen showing $3.99/month price, subscribe button, terms link
- Platform branching in `SubscriptionContext.tsx`: web path uses `@revenuecat/purchases-js`; native path uses `react-native-purchases`
- Stripe test-mode checkout verified in browser

Consumes:
- `SubscriptionProvider` from S02
- Web paywall placeholder from S03

### S06 (terminal)

Produces:
- `docs/subscription-setup.md` — RevenueCat project setup, App Store Connect subscription product, Google Play subscription product, Stripe + Web Billing configuration, EAS env var setup, promotional entitlement grant process
- Final end-to-end acceptance verification: 3-scan limit on device, subscriber no-ads, Stripe test checkout, promotional entitlement

Consumes:
- All prior slices complete
