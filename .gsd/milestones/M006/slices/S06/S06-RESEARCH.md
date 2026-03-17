# S06: Setup Guides + Promotional Entitlements — Research

**Date:** 2026-03-17

## Summary

S06 is a documentation and verification slice — no new application code. The deliverable is `docs/subscription-setup.md` covering RevenueCat project setup, App Store Connect/Google Play subscription products, Stripe Web Billing configuration, EAS env vars, and promotional entitlement grants. The final acceptance verification confirms all M006 slices work end-to-end.

The codebase already references three env vars (`EXPO_PUBLIC_REVENUECAT_API_KEY` in session.tsx for native, `EXPO_PUBLIC_REVENUECAT_WEB_API_KEY` in SubscriptionContext.tsx for web, plus the implicit need for separate iOS/Android keys). However, `.env.example` has **no RevenueCat entries** — this must be fixed. The `eas.json` has no `env` block for RevenueCat keys either. `app.config.ts` has the `purchasesInstalled` guard but no plugin usage (confirmed: `react-native-purchases` has no Expo plugin — native config is manual via EAS).

The S05 forward intelligence flagged a critical fragility: `offerings.current?.monthly` requires the RevenueCat offering to be named "default" with a monthly package. The setup guide must specify exact naming.

## Recommendation

Structure the doc in 6 sections matching the setup flow: (1) RevenueCat project creation, (2) App Store Connect subscription product, (3) Google Play Console subscription product, (4) Stripe + Web Billing configuration, (5) EAS env var setup, (6) Promotional entitlement grants. Each section should be step-by-step with exact field values (product ID, offering name "default", package name "monthly", price $3.99/month). Also update `.env.example` with the three RevenueCat key placeholders and add `env` entries to `eas.json` for build-time injection.

## Don't Hand-Roll

| Problem | Existing Solution | Why Use It |
|---------|------------------|------------|
| Setup documentation format | `docs/oauth-branding.md` | Existing project docs pattern — step-by-step with platform sections |

## Existing Code and Patterns

- `docs/oauth-branding.md` — existing setup guide pattern; S06 doc should follow same structure (platform-sectioned, step-by-step)
- `app.config.ts` — `purchasesInstalled` check exists but no plugin usage; comment references `docs/subscription-setup.md` already
- `src/features/auth/session.tsx` — reads `EXPO_PUBLIC_REVENUECAT_API_KEY` for native SDK; this is platform-agnostic (single key for both iOS/Android based on `Platform.OS`)
- `src/features/subscriptions/SubscriptionContext.tsx` — reads `EXPO_PUBLIC_REVENUECAT_WEB_API_KEY` for web SDK
- `.env.example` — missing all RevenueCat keys; needs `EXPO_PUBLIC_REVENUECAT_API_KEY` and `EXPO_PUBLIC_REVENUECAT_WEB_API_KEY`
- `eas.json` — no `env` block; RevenueCat native key needs to be available at runtime via `process.env`

## Constraints

- `react-native-purchases` has no Expo plugin — native setup is handled by the SDK at runtime, not at build config time
- Session.tsx uses a single `EXPO_PUBLIC_REVENUECAT_API_KEY` — the code selects iOS vs Android key based on `Platform.OS` at runtime (or uses a single project-level key)
- Web billing key (`rcb_*`) is distinct from native keys (`appl_*` / `goog_*`)
- RevenueCat offering must be named "default" with a "monthly" package for `offerings.current?.monthly` to resolve (S05 fragility)
- Promotional entitlements are granted via RevenueCat dashboard only — no in-app promo code redemption
- The doc must cover test-mode → production-mode transition for Stripe

## Common Pitfalls

- **Offering/package naming mismatch** — If the RevenueCat offering isn't "default" or monthly package isn't present, `startWebCheckout` silently fails with "No offering available". Guide must specify exact names.
- **Missing .env.example entries** — Developers cloning the repo won't know which RevenueCat keys to set. Must update `.env.example`.
- **EAS env vars vs .env confusion** — `EXPO_PUBLIC_*` vars work from `.env` for local dev but need explicit `eas.json` env config or EAS Secrets for builds. Guide must distinguish the two paths.
- **Stripe test vs live mode products** — Products created in Stripe test mode don't carry to live. Guide must note that live products need separate creation.

## Open Risks

- RevenueCat's promotional entitlement UI may have changed since research — verify exact dashboard path during doc writing
- App Store Connect subscription product setup requires an active Apple Developer account with agreements signed — can't be verified without the account
- Google Play Console subscription setup requires a published app or internal test track — may need to note prerequisites

## Skills Discovered

| Technology | Skill | Status |
|------------|-------|--------|
| RevenueCat | `revenuecat/revenuecat-skill@revenuecat` (216 installs) | available — `npx skills add revenuecat/revenuecat-skill@revenuecat` |
| RevenueCat + ASC | `rudrankriyam/app-store-connect-cli-skills@asc-revenuecat-catalog-sync` (247 installs) | available |
| Stripe | `stripe/ai@stripe-best-practices` (1.5K installs) | available — `npx skills add stripe/ai@stripe-best-practices` |

Note: These skills may help with accuracy of setup instructions but are not required — S06 is a documentation slice, not an implementation slice.

## Sources

- `app.config.ts` comment referencing `docs/subscription-setup.md` (source: existing codebase)
- `session.tsx` RevenueCat configure pattern (source: existing codebase)
- S05 forward intelligence on `offerings.current?.monthly` fragility (source: S05-SUMMARY.md)
- `.env.example` gap analysis (source: existing codebase)
