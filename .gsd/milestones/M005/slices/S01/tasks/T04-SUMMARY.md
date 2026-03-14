---
id: T04
parent: S01
milestone: M005
provides:
  - CORS restricted from wildcard to Supabase project URL allowlist across all edge functions
  - Password validation requires uppercase + number/symbol + 8 chars
  - Structured password validation result with per-rule error messages
key_files:
  - supabase/functions/_shared/cors.ts
  - src/features/auth/password.ts
  - src/features/auth/__tests__/password.test.ts
key_decisions:
  - "Dynamic CORS origin check via buildCorsHeaders(req) rather than static wildcard — validates Origin header against allowlist derived from SUPABASE_URL and optional ALLOWED_ORIGINS env var"
  - "Kept static corsHeaders export for backward compat (functions that spread it into responses) but it uses SUPABASE_URL instead of *"
  - "Added validatePassword() returning {valid, errors[]} alongside boolean isValidPassword() for backward compat"
patterns_established:
  - "All edge functions import CORS config from _shared/cors.ts — no inline CORS headers"
  - "Use validatePassword() for structured error messages; isValidPassword() only for simple boolean checks"
observability_surfaces:
  - "CORS rejections visible in browser network tab as blocked cross-origin requests (no Allow-Origin header returned for non-matching origins)"
  - "Password validation errors returned as structured array for UI display"
duration: 15m
verification_result: passed
completed_at: 2026-03-14
blocker_discovered: false
---

# T04: Tighten CORS and strengthen password validation

**Replaced wildcard CORS with origin allowlist across all 11 edge functions and added uppercase requirement to password validation with structured error reporting.**

## What Happened

### CORS

Replaced `Access-Control-Allow-Origin: *` in all edge functions with a centralized CORS module (`_shared/cors.ts`) that:
- Reads allowed origins from `SUPABASE_URL` (always available in Supabase edge functions) and an optional `ALLOWED_ORIGINS` comma-separated env var
- Dynamically checks the request's `Origin` header against the allowlist
- Returns the matching origin in the response header (with `Vary: Origin`) or omits the header entirely for non-matching origins
- Handles OPTIONS preflight with a proper 204 response
- Native mobile clients (which don't send `Origin` headers) are unaffected — CORS is a browser-only mechanism

All 11 edge functions that previously had inline `corsHeaders` with `*` now import from `_shared/cors.ts`. The 3 functions that already imported from the shared module (`accept-invite`, `create-invite`, `reset-request`) automatically get the tightened policy.

### Password Validation

Added uppercase letter requirement to password validation. Introduced `validatePassword()` which returns a structured `{ valid: boolean, errors: string[] }` with specific per-rule error messages. The existing `isValidPassword()` is preserved as a thin wrapper for backward compatibility.

Updated both callers (`signup.tsx`, `reset-password.tsx`) to use `validatePassword()` so users see specific failure reasons instead of a generic message.

## Verification

- `npx tsc --noEmit` — exits 0, no type errors
- `npx jest` — 585 tests pass across 26 suites (including 14 new password tests)
- `rg "Allow-Origin.*\*"` in `supabase/functions/` — only result is a doc comment in `_shared/cors.ts`
- `rg "ilike" src/features/recipes/search.ts` — all 3 calls use `escapeLikePattern()` (T01 verification)
- All slice-level verification checks pass:
  - `npx tsc --noEmit` exits 0 ✅
  - `npx jest` all tests pass ✅
  - Grep confirms no unescaped ilike interpolation ✅

## Diagnostics

- **CORS rejections**: Visible in browser DevTools Network tab — non-matching origins get no `Access-Control-Allow-Origin` header in the response, causing the browser to block the request. The `Vary: Origin` header ensures CDNs/proxies don't cache CORS responses incorrectly.
- **Password validation**: `validatePassword()` returns machine-readable `errors[]` array — callers can display individual rules or join them for a summary message.
- **Custom origins**: Set `ALLOWED_ORIGINS` env var in Supabase project settings (comma-separated URLs) to add custom domains beyond the default Supabase project URL.

## Deviations

- Updated all 11 edge functions (not just `process-scan-job` mentioned in the plan) — the wildcard CORS issue was present in every function, so fixing only one would leave the vulnerability open.
- Added `buildCorsHeaders(req)` for dynamic origin validation in addition to the static `corsHeaders` export — the static version can't check the request's `Origin` header, so dynamic is needed for proper CORS.

## Known Issues

None.

## Files Created/Modified

- `supabase/functions/_shared/cors.ts` — Rewrote with dynamic origin allowlist, `buildCorsHeaders(req)`, and backward-compat static `corsHeaders`
- `src/features/auth/password.ts` — Added uppercase requirement, `validatePassword()` with structured errors
- `src/features/auth/__tests__/password.test.ts` — 14 tests covering all password rules and edge cases
- `app/(auth)/signup.tsx` — Use `validatePassword()` for specific error messages
- `app/(auth)/reset-password.tsx` — Use `validatePassword()` for specific error messages
- `supabase/functions/process-scan-job/index.ts` — Replaced inline CORS with shared import
- `supabase/functions/create-scan-job/index.ts` — Replaced inline CORS with shared import
- `supabase/functions/ocr-extract/index.ts` — Replaced inline CORS with shared import
- `supabase/functions/parse-structured-recipe/index.ts` — Replaced inline CORS with shared import
- `supabase/functions/process-scan-queue/index.ts` — Replaced inline CORS with shared import
- `supabase/functions/queue-worker/index.ts` — Replaced inline CORS with shared import
- `supabase/functions/retry-scan-job/index.ts` — Replaced inline CORS with shared import
- `supabase/functions/schedule-queue-processor/index.ts` — Replaced inline CORS with shared import
- `supabase/functions/setup-scan-storage/index.ts` — Replaced inline CORS with shared import
