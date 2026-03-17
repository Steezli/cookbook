---
estimated_steps: 5
estimated_files: 3
---

# T01: Write subscription-setup.md and update env/build config

**Slice:** S06 — Setup Guides + Promotional Entitlements
**Milestone:** M006

## Description

Create `docs/subscription-setup.md` with step-by-step configuration instructions for the entire subscription stack (RevenueCat, App Store Connect, Google Play Console, Stripe Web Billing, EAS env vars, promotional entitlements). Update `.env.example` with RevenueCat key placeholders and `eas.json` with env block for build-time key injection.

## Steps

1. Read `docs/oauth-branding.md` for the existing doc structure pattern, `eas.json` for current build profiles, and `src/features/auth/session.tsx` + `src/features/subscriptions/SubscriptionContext.tsx` for exact env var names used in code
2. Write `docs/subscription-setup.md` with 6 sections: (1) RevenueCat Project Setup — create project, add iOS/Android/Web apps, note API key types (`appl_`/`goog_`/`rcb_`); (2) App Store Connect — create subscription group, product ID, $3.99/month pricing; (3) Google Play Console — create subscription, base plan, $3.99/month; (4) Stripe + Web Billing — connect Stripe to RevenueCat, create product in Stripe, configure Web Billing integration, test vs live mode note; (5) EAS Env Vars — `.env` for local dev, EAS Secrets for builds, exact key names; (6) Promotional Entitlements — grant via RevenueCat dashboard step-by-step. Critical: specify offering name "default" and package name "monthly" explicitly in Section 1 (S05 fragility).
3. Add `EXPO_PUBLIC_REVENUECAT_API_KEY` and `EXPO_PUBLIC_REVENUECAT_WEB_API_KEY` entries to `.env.example` with descriptive comments
4. Add `env` block to `eas.json` build profiles (`development`, `preview`, `production`) referencing `EXPO_PUBLIC_REVENUECAT_API_KEY`
5. Run `npx tsc --noEmit` and `npx jest --no-coverage` to confirm no regressions

## Must-Haves

- [ ] `docs/subscription-setup.md` exists with all 6 sections
- [ ] Offering "default" and package "monthly" naming explicitly documented
- [ ] $3.99/month price documented in all relevant store sections
- [ ] Stripe test vs live mode distinction documented
- [ ] Promotional entitlement grant process documented step-by-step
- [ ] `.env.example` has `EXPO_PUBLIC_REVENUECAT_API_KEY` and `EXPO_PUBLIC_REVENUECAT_WEB_API_KEY`
- [ ] `eas.json` has env entries for RevenueCat key
- [ ] `npx tsc --noEmit` exits 0
- [ ] `npx jest --no-coverage` passes 640+ tests

## Verification

- `test -f docs/subscription-setup.md && echo "exists"` → "exists"
- `grep -c "REVENUECAT" .env.example` → 2
- `grep -c "REVENUECAT" eas.json` → at least 1
- `grep -q '"default"' docs/subscription-setup.md && grep -q '"monthly"' docs/subscription-setup.md && echo "offering names documented"`
- `grep -q "promotional" docs/subscription-setup.md && echo "promo documented"`
- `npx tsc --noEmit` → exit 0
- `npx jest --no-coverage` → 640+ tests, 0 failures

## Observability Impact

- Signals added/changed: None (documentation only)
- How a future agent inspects this: Read `docs/subscription-setup.md` for subscription configuration requirements; check `.env.example` for required env vars
- Failure state exposed: None

## Inputs

- `docs/oauth-branding.md` — existing doc pattern to follow
- `src/features/auth/session.tsx` — reads `EXPO_PUBLIC_REVENUECAT_API_KEY`
- `src/features/subscriptions/SubscriptionContext.tsx` — reads `EXPO_PUBLIC_REVENUECAT_WEB_API_KEY`
- `src/features/subscriptions/web-billing.ts` — `offerings.current?.monthly` fragility (must document "default" offering + "monthly" package)
- `eas.json` — current build profile structure
- S05 forward intelligence on offering naming and key types

## Expected Output

- `docs/subscription-setup.md` — complete 6-section setup guide
- `.env.example` — updated with 2 RevenueCat key entries
- `eas.json` — updated with env block for RevenueCat keys
