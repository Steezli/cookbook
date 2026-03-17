# S06: Setup Guides + Promotional Entitlements — UAT

**Milestone:** M006
**Written:** 2026-03-17

## UAT Type

- UAT mode: artifact-driven
- Why this mode is sufficient: S06 is a documentation-only slice — no runtime code shipped. Verification is file existence, content checks, and build/test health.

## Preconditions

- Repository cloned and dependencies installed
- S01–S05 code already merged

## Smoke Test

`test -f docs/subscription-setup.md && echo "exists"` → "exists"

## Test Cases

### 1. Setup guide exists with all sections

1. Open `docs/subscription-setup.md`
2. **Expected:** 6 sections present: RevenueCat Project Setup, App Store Connect, Google Play Console, Stripe Web Billing, EAS Environment Variables, Promotional Entitlements

### 2. RevenueCat keys in .env.example

1. `grep -c "REVENUECAT" .env.example`
2. **Expected:** 2 (both `EXPO_PUBLIC_REVENUECAT_API_KEY` and `EXPO_PUBLIC_REVENUECAT_WEB_API_KEY`)

### 3. EAS build config includes RevenueCat env

1. `grep -c "REVENUECAT" eas.json`
2. **Expected:** ≥1 (env block in build profiles)

### 4. Offering naming documented

1. `grep -q "default" docs/subscription-setup.md && grep -q "monthly" docs/subscription-setup.md`
2. **Expected:** Both present — explicit "default" offering and "monthly" package at $3.99/month

### 5. Promotional entitlements documented

1. `grep -q "promotional" docs/subscription-setup.md`
2. **Expected:** Present — step-by-step grant/revoke process

### 6. Build and tests still pass

1. `npx tsc --noEmit` → exit 0
2. `npx jest --no-coverage` → 640+ tests, 0 failures

## Edge Cases

### No real secrets in documentation

1. Review `docs/subscription-setup.md` for any actual API keys or secrets
2. **Expected:** Only placeholder values like `appl_xxxxx`, never real keys

## Failure Signals

- `docs/subscription-setup.md` missing or incomplete sections
- `.env.example` missing RevenueCat key placeholders
- `eas.json` missing env block
- TypeScript or test failures

## Requirements Proved By This UAT

- none — S06 is documentation only; it does not prove any SUB-* requirements at the operational level

## Not Proven By This UAT

- SUB-01 through SUB-06 operational validation (device testing, real purchases, promotional entitlements) — deferred to M006 DoD
- Actual RevenueCat dashboard configuration — manual ops task guided by the documentation

## Notes for Tester

This is a documentation slice. The setup guide is a developer reference, not runtime code. The real proof of the subscription system comes from M006 DoD operational verification (EAS builds, device testing, Stripe checkout).
