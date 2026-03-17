---
id: S06
parent: M006
milestone: M006
provides:
  - docs/subscription-setup.md — complete 6-section subscription configuration guide
  - .env.example RevenueCat key placeholders (EXPO_PUBLIC_REVENUECAT_API_KEY, EXPO_PUBLIC_REVENUECAT_WEB_API_KEY)
  - eas.json env block for build-time RevenueCat key injection across all profiles
requires:
  - slice: S01–S05
    provides: all subscription infrastructure code referenced by the setup guide
affects: []
key_files:
  - docs/subscription-setup.md
  - .env.example
  - eas.json
key_decisions: []
patterns_established: []
observability_surfaces:
  - none (documentation only)
drill_down_paths:
  - .gsd/milestones/M006/slices/S06/tasks/T01-SUMMARY.md
duration: ~15m
verification_result: passed
completed_at: 2026-03-17
---

# S06: Setup Guides + Promotional Entitlements

**Complete subscription setup guide covering RevenueCat, App Store Connect, Google Play, Stripe Web Billing, EAS env vars, and promotional entitlements — plus build config updates for RevenueCat API keys.**

## What Happened

Wrote `docs/subscription-setup.md` as a 6-section developer guide following the existing `docs/oauth-branding.md` pattern. Sections cover: (1) RevenueCat project setup with explicit "default" offering and "monthly" package at $3.99/month, (2) App Store Connect subscription product creation, (3) Google Play Console subscription product, (4) Stripe + Web Billing configuration with test vs live mode distinction, (5) EAS environment variables for local dev and CI builds, (6) step-by-step promotional entitlement grant/revoke via RevenueCat dashboard.

Updated `.env.example` with both `EXPO_PUBLIC_REVENUECAT_API_KEY` and `EXPO_PUBLIC_REVENUECAT_WEB_API_KEY` placeholders with descriptive comments. Added `env` block to all three `eas.json` build profiles (development, preview, production) referencing the native RevenueCat key.

## Verification

- `docs/subscription-setup.md` exists ✅
- `.env.example` has 2 REVENUECAT entries ✅
- `eas.json` has 3 REVENUECAT entries ✅
- Offering "default" and "monthly" documented ✅
- Promotional entitlements documented ✅
- `npx tsc --noEmit` → exit 0 ✅
- `npx jest --no-coverage` → 640 tests, 32 suites, 0 failures ✅

## Requirements Advanced

- SUB-01 through SUB-06 — setup guide documents the configuration needed for operational verification; no contract-level advancement (already proven in S01–S05)

## Requirements Validated

- none — S06 is documentation only; operational validation of SUB-01–SUB-06 deferred to M006 DoD (EAS build + device testing)

## New Requirements Surfaced

- none

## Requirements Invalidated or Re-scoped

- none

## Deviations

None.

## Known Limitations

- SUB-01 through SUB-06 remain contract-verified only — operational proof (real device testing, Stripe live checkout, promotional entitlement grant) is M006 DoD scope, not S06 scope.

## Follow-ups

- M006 DoD operational verification: EAS build + device test for 3-scan limit, subscriber no-ads, Stripe test checkout, promotional entitlement grant

## Files Created/Modified

- `docs/subscription-setup.md` — new 6-section subscription configuration guide
- `.env.example` — added 2 RevenueCat key placeholders with comments
- `eas.json` — added env block to development, preview, production build profiles

## Forward Intelligence

### What the next slice should know
- M006 is complete at the code/documentation level — all 6 slices shipped. Next work is either M006 DoD operational verification or a new milestone.

### What's fragile
- RevenueCat offering must be named exactly "default" with package "monthly" — documented in setup guide but easy to misconfigure in dashboard

### Authoritative diagnostics
- `docs/subscription-setup.md` is the single source of truth for subscription configuration steps

### What assumptions changed
- none
