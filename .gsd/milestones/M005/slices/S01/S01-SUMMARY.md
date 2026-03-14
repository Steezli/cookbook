---
id: S01
parent: M005
milestone: M005
provides:
  - escapeLikePattern helper for injection-safe LIKE/ILIKE queries
  - Fixed scan job retry logic with correct post-increment boundary and preserved error messages
  - Non-mutating backfillIngredients with Readonly<Recipe> contract
  - Atomic photo reorder via single RPC transaction
  - Centralized CORS module with dynamic origin allowlist (replaces wildcard across 11 edge functions)
  - Structured password validation with per-rule error messages and uppercase requirement
requires: []
affects:
  - S03
key_files:
  - src/features/recipes/search.ts
  - src/features/recipes/api.ts
  - src/features/recipes/photos.ts
  - src/features/auth/password.ts
  - src/lib/scan/retry-logic.ts
  - supabase/functions/_shared/cors.ts
  - supabase/functions/process-scan-job/index.ts
  - supabase/migrations/20260314000000_reorder_recipe_photos_rpc.sql
key_decisions:
  - "Escape LIKE patterns at call site rather than in a query builder wrapper — minimal and auditable"
  - "Extract computeRetryDecision() into src/lib/scan/ for Jest testability since edge function runs on Deno"
  - "Single atomic DB update per retry path — eliminates two-step failed→queued race condition"
  - "Readonly<Recipe> parameter type enforces no-mutation contract at compile time"
  - "SQL RPC with security invoker for photo reorder — keeps RLS enforcement while gaining transactional atomicity"
  - "Dynamic CORS origin check via buildCorsHeaders(req) — validates Origin against allowlist from SUPABASE_URL + ALLOWED_ORIGINS env var"
  - "Structured validatePassword() returning {valid, errors[]} alongside boolean isValidPassword() for backward compat"
patterns_established:
  - "Always wrap user input with escapeLikePattern() before passing to ilike()"
  - "computeRetryDecision(retryCount, maxRetries, errorMessage) for testable retry boundary logic"
  - "Always preserve original error_message when re-queuing — never overwrite with status text"
  - "Fire-and-forget background DB writes must never mutate the object passed to them"
  - "Use Supabase RPC for multi-row updates that need atomicity — individual Promise.all updates are not transactional"
  - "All edge functions import CORS config from _shared/cors.ts — no inline CORS headers"
  - "Use validatePassword() for structured error messages; isValidPassword() only for simple boolean checks"
observability_surfaces:
  - "Edge function logs retry count and final status per job (re-queue vs permanent failure)"
  - "scan_jobs table shows correct retry_count and preserved error_message"
  - "Response body includes retryCount and willRetry fields for downstream inspection"
  - "CORS rejections visible in browser DevTools as blocked cross-origin requests"
  - "Password validation errors returned as structured array for UI display"
drill_down_paths:
  - .gsd/milestones/M005/slices/S01/tasks/T01-SUMMARY.md
  - .gsd/milestones/M005/slices/S01/tasks/T02-SUMMARY.md
  - .gsd/milestones/M005/slices/S01/tasks/T03-SUMMARY.md
  - .gsd/milestones/M005/slices/S01/tasks/T04-SUMMARY.md
duration: 52m
verification_result: passed
completed_at: 2026-03-14
---

# S01: Security & Data Integrity Fixes

**Fixed LIKE pattern injection, scan retry off-by-one, data mutation bugs, and tightened CORS and password validation across the entire edge function surface.**

## What Happened

Four security and data integrity issues from the technical audit, resolved in order of risk:

**Search injection (T01):** User input containing `%` or `_` was interpolated directly into PostgreSQL `ilike` patterns, letting a query of just `%` match every recipe title. Created `escapeLikePattern()` to escape `\`, `%`, and `_` at all 3 ilike call sites in search.ts. Added 11 tests (7 unit, 4 integration).

**Scan retry logic (T02):** The process-scan-job edge function had three bugs: an off-by-one (compared pre-increment retry_count against max_retries, allowing one extra retry), error message overwrite (replaced the real error with "Retrying..."), and a two-step DB update race (failed→queued via two separate updates). Fixed all three with a single atomic update per retry path using post-increment comparison. Extracted `computeRetryDecision()` into `src/lib/scan/retry-logic.ts` for Jest testability. Added 12 tests.

**Data mutation (T03):** `backfillIngredients` mutated `recipe.ingredients` in-place after a fire-and-forget DB write, risking race conditions during React rendering. Removed the mutation, typed the parameter as `Readonly<Recipe>`, and added an ownership pre-check to skip backfill for non-owned recipes. Separately, `reorderRecipePhotos` used `Promise.all` for N individual updates (non-atomic). Replaced with a single `reorder_recipe_photos` Postgres RPC function using `security invoker`.

**CORS and password validation (T04):** Replaced `Access-Control-Allow-Origin: *` across all 11 edge functions with a centralized CORS module that validates the `Origin` header against an allowlist derived from `SUPABASE_URL` and optional `ALLOWED_ORIGINS` env var. Added uppercase requirement to password validation and introduced `validatePassword()` returning structured per-rule errors. Updated signup and reset-password screens to show specific failure messages. Added 14 tests.

## Verification

- `npx tsc --noEmit` — exits 0
- `npx jest` — 585 tests pass, 26 suites (37 new tests across T01–T04)
- `grep -n 'ilike' src/features/recipes/search.ts | grep -v 'escapeLikePattern'` — empty (no unescaped ilike)
- `rg "Allow-Origin.*\*" supabase/functions/` — only a doc comment in _shared/cors.ts
- `rg "recipe\.ingredients\s*=" src/features/recipes/api.ts` — no matches (no in-place mutation)
- `rg "Promise\.all" src/features/recipes/photos.ts` — no matches (atomic RPC)
- `rg '"Retrying\.\.\."' supabase/functions/process-scan-job/index.ts` — no matches

## Requirements Advanced

- None — this slice addresses technical debt from audit, not tracked requirements

## Requirements Validated

- None — no new requirements were being validated; all changes are hardening of existing validated features

## New Requirements Surfaced

- None

## Requirements Invalidated or Re-scoped

- None

## Deviations

- T02: Extracted `computeRetryDecision()` into `src/lib/scan/retry-logic.ts` — not in the original plan but necessary because the edge function runs on Deno and can't be tested by the project's Jest config
- T04: Updated all 11 edge functions (not just `process-scan-job` mentioned in the plan) — the wildcard CORS issue was present in every function

## Known Limitations

- `process-scan-queue/index.ts` has its own separate retry logic using `<=` while `process-scan-job` uses `<`. Both are correct for their semantics but should be unified in a future cleanup pass.
- CORS dynamic origin checking depends on the `SUPABASE_URL` env var being available (always true in Supabase edge functions) and `ALLOWED_ORIGINS` for custom domains (must be manually configured in Supabase project settings).

## Follow-ups

- Unify retry comparison operators between `process-scan-job` and `process-scan-queue` (both correct but inconsistent — potential S04 cleanup item)

## Files Created/Modified

- `src/features/recipes/search.ts` — Added `escapeLikePattern()`, applied to all 3 ilike call sites
- `src/features/recipes/__tests__/searchPublicRecipes.test.ts` — 11 new tests for escape helper and injection prevention
- `supabase/functions/process-scan-job/index.ts` — Fixed retry logic, replaced inline CORS with shared import
- `src/lib/scan/retry-logic.ts` — New pure helper: `computeRetryDecision()`
- `src/lib/scan/__tests__/retry-logic.test.ts` — 12 tests for retry boundary logic
- `src/features/recipes/api.ts` — Removed in-place mutation, added Readonly<Recipe>, ownership pre-check
- `src/features/recipes/photos.ts` — Replaced N updates with single RPC call
- `supabase/migrations/20260314000000_reorder_recipe_photos_rpc.sql` — New RPC for atomic photo reorder
- `supabase/functions/_shared/cors.ts` — Rewrote with dynamic origin allowlist
- `src/features/auth/password.ts` — Added uppercase requirement, structured `validatePassword()`
- `src/features/auth/__tests__/password.test.ts` — 14 tests for all password rules
- `app/(auth)/signup.tsx` — Use `validatePassword()` for specific error messages
- `app/(auth)/reset-password.tsx` — Use `validatePassword()` for specific error messages
- `supabase/functions/create-scan-job/index.ts` — Replaced inline CORS with shared import
- `supabase/functions/ocr-extract/index.ts` — Replaced inline CORS with shared import
- `supabase/functions/parse-structured-recipe/index.ts` — Replaced inline CORS with shared import
- `supabase/functions/process-scan-queue/index.ts` — Replaced inline CORS with shared import
- `supabase/functions/queue-worker/index.ts` — Replaced inline CORS with shared import
- `supabase/functions/retry-scan-job/index.ts` — Replaced inline CORS with shared import
- `supabase/functions/schedule-queue-processor/index.ts` — Replaced inline CORS with shared import
- `supabase/functions/setup-scan-storage/index.ts` — Replaced inline CORS with shared import

## Forward Intelligence

### What the next slice should know
- All edge functions now import CORS from `_shared/cors.ts`. Any new edge function must use `buildCorsHeaders(req)` or the static `corsHeaders` export — never inline CORS headers.
- `escapeLikePattern()` is exported from `src/features/recipes/search.ts` and should be used anywhere user input touches an `ilike()` query.
- `computeRetryDecision()` in `src/lib/scan/retry-logic.ts` is the canonical retry boundary logic — the edge function uses an inline copy. S02's parser deduplication effort should consider syncing this too.

### What's fragile
- The two-copy pattern for retry logic (`src/lib/scan/retry-logic.ts` for testing, inline in edge function for Deno runtime) — same fragility as the parser duplication that S02 addresses
- CORS origin checking depends on `SUPABASE_URL` env var — always available in Supabase but would fail if somehow unset

### Authoritative diagnostics
- `scan_jobs` table `retry_count` and `error_message` columns — reliable post-fix; `error_message` now always contains the original failure reason
- Edge function logs `Re-queuing job <id>` and `Job <id> failed permanently` — authoritative retry flow signals

### What assumptions changed
- Original plan assumed only `process-scan-job` needed CORS fix — all 11 edge functions had the same wildcard issue
- Original plan didn't account for Deno/Jest boundary for retry logic testing — required extracting a pure function
