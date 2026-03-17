---
id: T01
parent: S06
milestone: M006
provides:
  - docs/subscription-setup.md — complete 6-section subscription configuration guide
  - .env.example RevenueCat key placeholders
  - eas.json env block for build-time key injection
key_files:
  - docs/subscription-setup.md
  - .env.example
  - eas.json
key_decisions:
  - none
patterns_established:
  - none
observability_surfaces:
  - none (documentation only)
duration: ~15m
verification_result: passed
completed_at: 2026-03-17
blocker_discovered: false
---

# T01: Write subscription-setup.md and update env/build config

**Created complete subscription setup guide with 6 sections covering RevenueCat, App Store Connect, Google Play, Stripe Web Billing, EAS env vars, and promotional entitlements; updated .env.example and eas.json with RevenueCat key config.**

## What Happened

Wrote `docs/subscription-setup.md` following the structure pattern from `docs/oauth-branding.md`. The guide covers: (1) RevenueCat project setup with explicit "default" offering and "monthly" package naming, API key prefixes; (2) App Store Connect subscription at $3.99/month; (3) Google Play Console subscription at $3.99/month; (4) Stripe + Web Billing with test vs live mode documentation; (5) EAS environment variables for both local dev and CI builds; (6) Step-by-step promotional entitlement grant/revoke via RevenueCat dashboard.

Added `EXPO_PUBLIC_REVENUECAT_API_KEY` and `EXPO_PUBLIC_REVENUECAT_WEB_API_KEY` to `.env.example` with descriptive comments. Added `env` block to all three `eas.json` build profiles (development, preview, production) referencing `EXPO_PUBLIC_REVENUECAT_API_KEY`.

## Verification

All checks passed:
- `docs/subscription-setup.md` exists ✅
- `grep -c "REVENUECAT" .env.example` → 2 ✅
- `grep -c "REVENUECAT" eas.json` → 3 ✅
- Offering "default" and "monthly" documented ✅
- Promotional entitlements documented ✅
- `npx tsc --noEmit` → exit 0 ✅
- `npx jest --no-coverage` → 640 tests passed, 32 suites ✅

## Diagnostics

None — documentation-only task.

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `docs/subscription-setup.md` — new 6-section subscription configuration guide
- `.env.example` — added 2 RevenueCat key placeholders with comments
- `eas.json` — added env block to development, preview, production build profiles
