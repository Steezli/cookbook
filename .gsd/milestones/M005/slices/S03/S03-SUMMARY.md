---
id: S03
parent: M005
milestone: M005
provides:
  - Generated Supabase database types (database.types.ts) with typed client
  - Zero `: any` types in src/features/ and src/lib/ (non-test, non-.d.ts)
  - Web scan upload marks job as failed on edge function error
  - ensureProfile logs errors with structured prefix
  - GET /health endpoint for Railway/load-balancer probes
  - NonEmptyArray<T> type for recipe input validation
requires:
  - slice: S01
    provides: Security fixes (clean base for type changes)
affects:
  - S04
  - S05
key_files:
  - src/lib/database.types.ts
  - src/lib/supabase.ts
  - src/lib/scan/scan-draft-service.ts
  - src/lib/scan/multi-recipe-parser.ts
  - src/features/scan/scan-photos.ts
  - src/features/auth/session.tsx
  - src/features/recipes/types.ts
  - server.js
key_decisions:
  - Generated Supabase types via `supabase gen types typescript --project-id` from remote DB rather than manual type creation
  - Created toJson() helper for casting typed objects to Supabase Json columns
  - NonEmptyArray<T> tuple type ([T, ...T[]]) for compile-time non-empty enforcement on recipe ingredients/steps
  - Used `unknown` + Record<string, unknown> narrowing pattern for parsing untyped external JSON in multi-recipe-parser
  - Web error handling mirrors native path pattern — always update job status to 'failed' with user-facing message
patterns_established:
  - Import Tables<'table_name'> and TablesInsert<'table_name'> from database.types.ts for row/insert types
  - Use toJson() helper when assigning typed objects to jsonb columns
  - RPCs not in generated types use (supabase.rpc as Function) cast with TODO comment
  - NonEmptyArray<T> utility type exported from recipes/types.ts for reuse
  - Edge function .catch() handlers should always update job status to 'failed'
  - Auth-adjacent best-effort operations log with '[SessionProvider]' prefix on failure
  - Use unknown + Record narrowing for parsing untyped external JSON
observability_surfaces:
  - GET /health returns { status: 'ok', timestamp } for deployment probes
  - "[SessionProvider] ensureProfile failed:" console.warn on profile upsert failure
  - scan_jobs.status='failed' + error_message set on web edge function invocation failure
drill_down_paths:
  - .gsd/milestones/M005/slices/S03/tasks/T01-SUMMARY.md
  - .gsd/milestones/M005/slices/S03/tasks/T02-SUMMARY.md
  - .gsd/milestones/M005/slices/S03/tasks/T03-SUMMARY.md
duration: 48m
verification_result: passed
completed_at: 2026-03-14
---

# S03: Type Safety & Error Handling

**Generated Supabase database types eliminating all `any` from feature code, fixed silent error swallowing in scan upload and auth, added health check endpoint and compile-time non-empty array enforcement for recipe inputs.**

## What Happened

Three tasks completed in sequence:

**T01 — Supabase types and typed scan draft service (25m):** Generated `src/lib/database.types.ts` (1304 lines) from remote DB using `supabase gen types typescript --project-id`. Typed the Supabase client with `createClient<Database>()`. Replaced all 11 `any` usages in `scan-draft-service.ts` with proper types (`ScanDraftRow`, `ParsedIngredient[]`, `ScanDraftInsert`, `RecipeInsert`, etc.). Created `toJson()` helper for jsonb column casting. Fixed collateral type errors in `photos.ts`, `comments/api.ts`, and `search.ts` caused by the newly typed client.

**T02 — Error handling fixes (8m):** Web scan upload's `.catch()` handler now marks the job as `status: 'failed'` with a user-facing `error_message` — mirroring the native path pattern that already did this correctly. `ensureProfile` in `session.tsx` now logs failures with `console.warn('[SessionProvider] ensureProfile failed:', error.message)` instead of silently swallowing.

**T03 — Health endpoint, type tightening, remaining any cleanup (15m):** Added `GET /health` to `server.js` returning `{ status: 'ok', timestamp }` before the SPA fallback. Created `NonEmptyArray<T>` utility type (`[T, ...T[]]`) applied to both `CreateRecipeInput` and `UpdateRecipeInput` for `ingredients` and `steps`. Replaced the final 4 `any` types in `multi-recipe-parser.ts` with `unknown` + `Record<string, unknown>` narrowing.

## Verification

All four slice-level checks pass:

- `npx tsc --noEmit` — exits 0 (clean)
- `npx jest` — 602 tests passing, 28 suites
- `grep -r ': any' src/features/ src/lib/` (excluding tests and .d.ts) — zero hits
- `curl localhost:3000/health` — returns HTTP 200 with `{ "status": "ok", "timestamp": "..." }`

## Requirements Advanced

- None — this slice is a technical hardening improvement with no new user-facing capabilities

## Requirements Validated

- None — no requirements moved to validated status (type safety and error handling are internal quality improvements)

## New Requirements Surfaced

- None

## Requirements Invalidated or Re-scoped

- None

## Deviations

- T01 fixed collateral type errors in `photos.ts`, `comments/api.ts`, and `search.ts` — not in the original plan but required to keep `tsc --noEmit` passing after typing the Supabase client
- T03 also tightened `CreateRecipeInput` (not just `UpdateRecipeInput`) because values flow between them
- T03 fixed the 4 remaining `any` types in `multi-recipe-parser.ts` — not in T03's scope but required to pass the slice verification criterion

## Known Limitations

- Two RPCs (`get_first_recipe_photos`, `reorder_recipe_photos`) are not in the generated types — they need to be applied to the remote DB. Workaround: `(supabase.rpc as Function)` cast with TODO comments.
- `NonEmptyArray<T>` is a compile-time constraint only; runtime validation in `api.ts` remains the authoritative guard against empty arrays.

## Follow-ups

- Apply the two missing RPC migrations to the remote DB so generated types include them (eliminates the `Function` cast workaround)
- Regenerate `database.types.ts` after applying pending migrations

## Files Created/Modified

- `src/lib/database.types.ts` — **new** — Generated Supabase types (1304 lines)
- `src/lib/supabase.ts` — Typed client with `createClient<Database>()`
- `src/lib/scan/scan-draft-service.ts` — Replaced all 11 `any` usages with proper types
- `src/lib/scan/__tests__/scan-draft-service.test.ts` — Updated test fixtures for typed ParsedIngredient
- `src/lib/scan/multi-recipe-parser.ts` — Replaced 4 `any` with `unknown` + Record narrowing
- `src/features/recipes/photos.ts` — Fixed RPC type errors from typed client
- `src/features/comments/api.ts` — Fixed null handling for display_name
- `src/features/recipes/search.ts` — Fixed tags neq filter type mismatch
- `src/features/scan/scan-photos.ts` — Web .catch() marks job as failed with error_message
- `src/features/auth/session.tsx` — ensureProfile logs errors with [SessionProvider] prefix
- `server.js` — Added GET /health endpoint
- `src/features/recipes/types.ts` — Added NonEmptyArray<T>; tightened Create/UpdateRecipeInput
- `src/components/recipes/RecipeForm.tsx` — NonEmptyArray safe casts
- `app/(tabs)/recipes/[id]/edit.tsx` — NonEmptyArray safe casts

## Forward Intelligence

### What the next slice should know
- The Supabase client is now fully typed — any new table access or RPC call will get type checking automatically. New RPCs need to be in the remote DB before `supabase gen types` will include them.
- All `any` elimination is done — S04 code quality work starts from a fully typed codebase.

### What's fragile
- The two RPC `Function` casts in `photos.ts` — if someone removes the cast without applying the migration, `tsc` will fail. The TODO comments explain this.
- `database.types.ts` is generated — do not hand-edit it. Regenerate with `supabase gen types typescript --project-id`.

### Authoritative diagnostics
- `grep -r ': any' src/features/ src/lib/ --include='*.ts' --include='*.tsx' | grep -v __tests__ | grep -v '.d.ts'` — zero hits confirms type safety maintained
- `curl localhost:3000/health` — confirms server is up and responding

### What assumptions changed
- Originally expected to manually create types from migration schema if CLI wasn't available — CLI was available and worked directly against the remote DB
- Expected `multi-recipe-parser.ts` any cleanup to be a separate follow-up — done in T03 to satisfy the slice verification criterion
