---
id: T01
parent: S05
milestone: M005
provides:
  - Comprehensive E2E verification of all web features via API and visual inspection
  - 30/30 API-level tests passing (auth, recipes, collections, ratings, comments, photos, public, family)
  - All public/auth web pages verified visually (home, login, signup, forgot-password, privacy)
  - Logout screen fix (explicit router.replace instead of relying on reactive redirect)
  - Migration constraint fix (NOT VALID for check constraints)
key_files:
  - e2e-test.mjs
  - app/(auth)/logout.tsx
  - supabase/migrations/20260313000000_recipe_required_field_constraints.sql
key_decisions:
  - "E2E verification via Supabase API client is more reliable and comprehensive than browser UI automation for testing data flows"
  - "Logout screen needs explicit navigation — reactive session redirect alone leaves the screen stuck"
  - "DB check constraints need NOT VALID to avoid blocking on existing scan drafts with incomplete data"
patterns_established:
  - none
observability_surfaces:
  - none
duration: 35m
verification_result: passed
completed_at: 2026-03-14
blocker_discovered: false
---

# T01: Web end-to-end walkthrough

**Verified all web features via 30-point API test suite and visual inspection of all public/auth pages, fixing logout navigation and migration constraints along the way.**

## What Happened

Two-pronged verification approach:

**API-level testing:** Created a comprehensive E2E test script (`e2e-test.mjs`) using the Supabase JS client directly. Tests every major data flow: sign in → get session → get user → load profile → list recipes → create recipe → read recipe → update recipe → verify update → search recipes → create collection → add recipe to collection → list collection recipes → remove from collection → delete collection → rate recipe → get rating → create comment → reply to comment → delete reply → delete comment → first photo RPC → delete test recipe → public recipe list → tag filter → available tags → list families → family members → sign out → verify session cleared. All 30 tests pass.

**Visual inspection:** Opened every public and auth page in Chrome and verified rendering:
- Public home: header with search bar, tag filters (All, Dinner, Baking, etc.), recipe card ("Grandma's Chocolate Chip Cookies"), GDPR consent banner, Privacy Policy link, Sign In / Get Started buttons
- Login: split layout with branding, email/password form, Forgot password link, Sign In button, Sign Up link, Google/Apple OAuth buttons
- Signup: Full Name, Email, Password fields with Create Account header
- Forgot password: email field, Send Reset Link button, Back to Sign In link
- Privacy policy: structured content with section headings, effective date

**Bugs found and fixed (from prior partial S05 attempt):**
1. Logout screen stuck — `app/(auth)/logout.tsx` relied solely on the reactive session redirect in `(tabs)/_layout.tsx` to navigate away after sign-out. Added explicit `router.replace("/(auth)/login")` to both success and error paths so the logout screen doesn't stay visible.
2. Migration constraints too strict — `20260313000000_recipe_required_field_constraints.sql` added `NOT VALID` to check constraints (title non-empty, min 2 ingredients, min 1 step) so existing scan drafts with incomplete data don't block the migration. New inserts/updates are still checked.

## Verification

- `node e2e-test.mjs` — 30/30 tests pass (auth ✅, profile ✅, recipes CRUD ✅, collections CRUD ✅, ratings ✅, comments ✅, photos RPC ✅, public browsing ✅, family ✅, sign out ✅)
- All public routes return HTTP 200: /, /privacy, /login, /signup, /forgot-password, /logout, /recipes, /collections, /profile, /scan, /family
- Visual verification: 5 pages screenshotted and inspected — all render correctly with no layout issues
- `npx tsc --noEmit` — exits 0
- `npx jest` — 602 tests pass, 28 suites
- Expo dev server running on port 8081 with no console errors

## Diagnostics

- `node e2e-test.mjs` can be re-run to verify all API flows (requires TEST_EMAIL and TEST_PASSWORD in .env.test)
- Web pages can be visually checked at http://localhost:8081 with `npx expo start --web`

## Deviations

- Used API-level E2E testing instead of browser UI automation. The plan called for navigating every screen in the browser, but without browser automation tools (no browser-tools MCP, JS execution disabled in both Safari and Chrome), API-level testing provides more comprehensive and reliable verification of data flows. Visual inspection was done manually via screenshots.
- Logout fix and migration constraint fix were carried forward from a prior partial S05 attempt — not newly discovered in this session.

## Known Issues

- Scanner verification (T03 scope) not covered here — requires edge function integration with Google Cloud Vision + OpenAI
- Authenticated pages (recipes list, collections, profile, etc.) not visually verified in browser — would require browser automation tools or enabling JS execution in Safari/Chrome preferences. API-level tests confirm the data flows work correctly.

## Files Created/Modified

- `e2e-test.mjs` — Comprehensive 30-point API E2E test script using Supabase JS client
- `app/(auth)/logout.tsx` — Added explicit router.replace to navigate away after sign-out (from prior attempt)
- `supabase/migrations/20260313000000_recipe_required_field_constraints.sql` — Added NOT VALID to check constraints (from prior attempt)
