# S06: Setup Guides + Promotional Entitlements

**Goal:** Ship `docs/subscription-setup.md` covering end-to-end RevenueCat/Stripe/store configuration, update `.env.example` and `eas.json` with RevenueCat keys, and document the promotional entitlement grant process.
**Demo:** A developer cloning the repo can follow `docs/subscription-setup.md` to configure RevenueCat, App Store Connect, Google Play Console, Stripe Web Billing, and EAS env vars — and knows how to grant promotional entitlements via the RevenueCat dashboard.

## Must-Haves

- `docs/subscription-setup.md` with 6 sections: RevenueCat project, App Store Connect product, Google Play product, Stripe Web Billing, EAS env vars, promotional entitlements
- `.env.example` includes `EXPO_PUBLIC_REVENUECAT_API_KEY` and `EXPO_PUBLIC_REVENUECAT_WEB_API_KEY` with descriptions
- `eas.json` includes `env` block referencing RevenueCat keys for build profiles
- Offering named "default" with "monthly" package at $3.99/month explicitly documented (S05 fragility)
- Promotional entitlement grant process documented step-by-step
- Test vs production mode distinction documented for Stripe
- `npx tsc --noEmit` exits 0
- `npx jest --no-coverage` passes (640+ tests)

## Proof Level

- This slice proves: final-assembly (documentation + config completeness for M006)
- Real runtime required: no (documentation slice)
- Human/UAT required: no (doc review is implicit; M006 DoD covers operational verification)

## Verification

- `test -f docs/subscription-setup.md && echo "exists"` → "exists"
- `grep -c "REVENUECAT" .env.example` → 2 (both keys present)
- `grep -c "REVENUECAT" eas.json` → at least 1
- `grep -q "default" docs/subscription-setup.md && grep -q "monthly" docs/subscription-setup.md && echo "offering names documented"` → pass
- `grep -q "promotional" docs/subscription-setup.md && echo "promo documented"` → pass
- `npx tsc --noEmit` → exit 0
- `npx jest --no-coverage` → 640+ tests, 0 failures

## Observability / Diagnostics

- Runtime signals: none (documentation slice — no runtime code)
- Inspection surfaces: `docs/subscription-setup.md` serves as the inspection surface for subscription configuration state
- Failure visibility: none
- Redaction constraints: Doc uses placeholder values for API keys, never real secrets

## Integration Closure

- Upstream surfaces consumed: All S01–S05 code (session.tsx RevenueCat init, SubscriptionContext.tsx, web-billing.ts, PaywallPlaceholder.tsx, scan-count.ts)
- New wiring introduced in this slice: `.env.example` key placeholders, `eas.json` env block for build-time injection
- What remains before the milestone is truly usable end-to-end: M006 DoD operational verification (EAS build + device testing, real Stripe checkout, promotional entitlement grant)

## Tasks

- [x] **T01: Write subscription-setup.md and update env/build config** `est:45m`
  - Why: The sole deliverable of S06 — complete setup documentation plus the missing `.env.example` and `eas.json` config entries
  - Files: `docs/subscription-setup.md`, `.env.example`, `eas.json`
  - Do: Write the full 6-section guide following `docs/oauth-branding.md` pattern; add RevenueCat key placeholders to `.env.example`; add `env` block to `eas.json` build profiles; specify exact offering name "default" and package "monthly" at $3.99/month; document promotional entitlement grant via RevenueCat dashboard; document Stripe test→live mode transition
  - Verify: All verification commands in the Verification section pass; `npx tsc --noEmit` exits 0; `npx jest --no-coverage` passes 640+ tests
  - Done when: `docs/subscription-setup.md` exists with all 6 sections, `.env.example` has both RevenueCat keys, `eas.json` has env block, TypeScript and tests still pass

## Files Likely Touched

- `docs/subscription-setup.md` (new)
- `.env.example`
- `eas.json`
