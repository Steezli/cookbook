# M006: Subscriptions — Context

**Gathered:** 2026-03-17
**Status:** Queued — pending auto-mode execution

## Project Description

Berven Book is a cross-platform Expo/React Native cookbook app with Supabase backend, AI-powered recipe scanning, family sharing, and public browsing. Five milestones complete (M001–M005). 602 tests, zero TypeScript errors. The app is feature-complete but has no monetization. This milestone adds the subscription system.

## Why This Milestone

The app's core value proposition — AI-powered recipe scanning — has no revenue model. Scanning is the most expensive feature (Claude API calls per scan) and needs to be monetized. Additionally, ads on public pages provide some revenue but degrade UX for engaged users. A subscription removes ads and unlocks unlimited scanning, creating a clear value exchange.

## User-Visible Outcome

### When this milestone is complete, the user can:

- Use the app for free with 3 photo scans per calendar month
- See a paywall screen when they hit the scan limit, explaining the $3.99/month subscription
- Subscribe via App Store (iOS), Play Store (Android), or Stripe (web) through RevenueCat
- Get unlimited scans and an ad-free experience as a subscriber
- See their remaining free scans for the month
- Restore purchases on a new device
- Manage/cancel their subscription through platform-native settings

### Entry point / environment

- Entry point: Expo app on iOS, Android, and web
- Environment: local dev + EAS builds for native testing
- Live dependencies involved: RevenueCat (entitlements, paywalls), App Store Connect, Google Play Console, Stripe (web billing), Supabase (scan count tracking)

## Completion Class

- Contract complete means: scan gating logic tested (free limit enforcement, subscriber bypass), paywall renders, ad suppression for subscribers, scan count tracking per calendar month
- Integration complete means: RevenueCat SDK initializes, entitlement checks gate scanning, paywall presents and completes purchase flow, web billing works via Stripe
- Operational complete means: real purchase on TestFlight/internal testing track, web Stripe test-mode checkout, promotional entitlement granted via RevenueCat dashboard for beta testers

## Final Integrated Acceptance

To call this milestone complete, we must prove:

- A free user can scan 3 times, then sees the paywall on the 4th attempt
- A subscriber can scan unlimited times with no ads anywhere in the app
- A web user can subscribe via Stripe checkout and immediately access premium features
- A purchase on one platform unlocks entitlements on all platforms (same RevenueCat user)
- Promotional entitlements granted via RevenueCat dashboard work correctly (for beta testers/family)
- Scan count resets on the 1st of each month

## Risks and Unknowns

- **RevenueCat + Expo compatibility** — `react-native-purchases` requires native builds (not Expo Go). Development/testing requires EAS development builds. This is the same pattern as AdMob — type declarations + dynamic import for dev, real SDK in EAS builds.
- **Web Billing setup** — RevenueCat Web Billing uses Stripe as payment processor. Requires Stripe account, product configuration in both Stripe and RevenueCat, and `@revenuecat/purchases-js` SDK for web.
- **App Store review** — Apple reviews subscription implementations carefully. Paywall must show price, subscription terms, and link to terms/privacy policy.
- **Scan count tracking** — needs a server-side count (Supabase) to prevent client-side manipulation. Must handle edge cases: what counts as a "scan" (photo upload, not recipe extraction), month boundary rollover, failed scans.
- **Cross-platform entitlement sync** — RevenueCat handles this, but the app_user_id must be consistent across platforms. Currently using Supabase auth user ID which should work.
- **Ad suppression timing** — when a user subscribes mid-session, ads should disappear immediately without requiring app restart.

## Existing Codebase / Prior Art

- `src/features/ads/AdBanner.tsx` — platform-branched ad banner; needs subscriber check to suppress
- `src/features/ads/config.ts` — ad placement logic with route-pattern allowlist
- `src/features/ads/consent.ts` — GDPR consent module; subscribers skip this entirely (no ads)
- `src/features/scan/scan-service.ts` — `createMultiPhotoScanJob()` is the entry point for scanning; gate goes here
- `app/(tabs)/scan/` — scan route screens; paywall intercept goes before upload
- `src/features/auth/session.ts` — Supabase auth session management; provides user ID for RevenueCat
- `app.config.ts` — already migrated from app.json for env-based config; RevenueCat API keys go here
- `src/features/ads/types/react-native-google-mobile-ads.d.ts` — existing pattern for type declarations of native-only packages

> See `.gsd/DECISIONS.md` for all architectural and pattern decisions — it is an append-only register; read it during planning, append to it during execution.

## Relevant Requirements

- SUB-01 — Subscription gating on scan feature via RevenueCat entitlement → promoted from deferred to active
- SUB-02 — Paywall UI displayed when non-subscriber accesses scan → promoted from deferred to active
- SUB-03 — Web subscription checkout via RevenueCat Web Billing / Stripe → promoted from deferred to active
- NEW: SUB-04 — Ad-free experience for subscribers
- NEW: SUB-05 — Freemium scan limit (3 photo scans per calendar month for free users)
- NEW: SUB-06 — Scan count tracking and display (remaining scans visible to free users)

## Scope

### In Scope

- RevenueCat account/project setup guide (step-by-step, beginner-friendly)
- App Store Connect and Google Play Console product/subscription configuration guide
- Stripe account setup and RevenueCat Web Billing configuration guide
- `react-native-purchases` SDK integration for iOS/Android
- `@revenuecat/purchases-js` SDK integration for web
- Entitlement checking (is user a subscriber?)
- Scan gating: 3 free photo scans per calendar month, unlimited for subscribers
- Scan count tracking in Supabase (server-side, tamper-resistant)
- Remaining scan count display for free users
- Paywall UI when scan limit reached (price, terms, subscribe button)
- Ad suppression for active subscribers
- Purchase restoration
- Promotional entitlement documentation (granting free access via RevenueCat dashboard)
- Subscription pricing: $3.99/month

### Out of Scope / Non-Goals

- Family plan ($19.99/6 users) — deferred for future consideration
- Annual subscription tier — can be added later in RevenueCat dashboard without code changes
- Free trial period — can be configured in App Store Connect/Play Console later
- Offline entitlement caching beyond what RevenueCat SDK provides
- Custom paywall design in this milestone (use RevenueCat's built-in paywall UI initially)
- Subscription analytics dashboard
- Promo/invite codes redeemable in-app (use RevenueCat dashboard manual grants instead)

## Technical Constraints

- `react-native-purchases` and `react-native-purchases-ui` are native-only — require EAS builds, not Expo Go
- Follow existing pattern: type declarations + dynamic import + catch fallback for dev compatibility
- Web uses separate `@revenuecat/purchases-js` package (not the React Native SDK)
- Scan count must be tracked server-side in Supabase to prevent client-side manipulation
- All new UI must use design tokens from `src/lib/tokens.ts` and reference cookbook.pen designs
- Alerts must use `showAlert`/`confirmAction` from `@/lib/alert`
- Platform branching via `Platform.OS` runtime checks (established pattern, not file extensions)

## Integration Points

- **RevenueCat** — SDK initialization with API keys, entitlement checks, paywall presentation, purchase flow
- **App Store Connect** — subscription product setup, pricing, review guidelines compliance
- **Google Play Console** — subscription product setup, pricing
- **Stripe** — web payment processing via RevenueCat Web Billing
- **Supabase** — scan count tracking table, RPC for atomic count increment, auth user ID as RevenueCat app_user_id
- **Existing ad system** — AdBanner needs subscriber-aware suppression; GDPR consent can be skipped for subscribers

## Open Questions

- Should the paywall use RevenueCat's remote paywall UI (`RevenueCatUI.presentPaywallIfNeeded`) or a custom-designed screen? — Start with RevenueCat's built-in paywall for speed; custom design can come later if needed
- Where should the remaining scan count be displayed? — Likely on the scan upload screen and possibly the home screen
- Should failed/errored scans count against the free limit? — Lean toward no — only count scans where photos were successfully uploaded to the edge function
- What happens to a subscriber's recipes if they cancel? — Recipes stay (they're the user's data). Only scanning is gated. All existing features continue working.
