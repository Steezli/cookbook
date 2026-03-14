---
id: T01
parent: S03
milestone: M005
provides:
  - Generated Supabase database types (database.types.ts)
  - Typed Supabase client with Database generic
  - Zero `any` in scan-draft-service.ts
key_files:
  - src/lib/database.types.ts
  - src/lib/supabase.ts
  - src/lib/scan/scan-draft-service.ts
key_decisions:
  - Used `supabase gen types typescript --project-id` to generate types from remote DB rather than manual type creation
  - Created `toJson()` helper for casting typed objects to Supabase Json columns
  - Fixed collateral type errors in photos.ts, comments/api.ts, search.ts caused by newly typed client
patterns_established:
  - Import `Tables<'table_name'>` and `TablesInsert<'table_name'>` from database.types.ts for row/insert types
  - Use `toJson()` helper when assigning typed objects to jsonb columns
  - RPCs not yet in generated types use `(supabase.rpc as Function)` cast with TODO comment
observability_surfaces:
  - none (type-safety improvement, no runtime behavior change)
duration: 25m
verification_result: passed
completed_at: 2026-03-14
blocker_discovered: false
---

# T01: Generate Supabase types and replace `any` in scan draft service

**Generated Supabase database types from remote DB and eliminated all `any` types from scan-draft-service.ts**

## What Happened

1. Generated `src/lib/database.types.ts` using `supabase gen types typescript --project-id` (1304 lines, covering all tables, RPCs, and enums)
2. Typed the Supabase client in `src/lib/supabase.ts` with `createClient<Database>()`
3. Rewrote `src/lib/scan/scan-draft-service.ts` to use proper types:
   - `mapRecordToDraft()` parameter: `any` → `ScanDraftRow` (= `Tables<'scan_drafts'>`)
   - All `.map()` callbacks: removed explicit `(record: any)` — TypeScript now infers from typed client
   - `convertToRecipe` ingredients parameter: `any[]` → `ParsedIngredient[]`
   - `DraftReviewAction.oldValue/newValue`: `any` → `string | string[] | number | null`
   - Insert/update data: typed as `ScanDraftInsert` / `RecipeInsert`
   - Added `RecipeIngredientRow` and `RecipeStepRow` interfaces for jsonb column shapes
4. Fixed collateral type errors caused by the newly typed client:
   - `src/features/recipes/photos.ts`: RPCs not in generated types → `(supabase.rpc as Function)` cast
   - `src/features/comments/api.ts`: `display_name` null handling → `?? undefined`
   - `src/features/recipes/search.ts`: `neq("tags", "{}")` type mismatch → cast through `unknown`
5. Updated test fixtures to include required `confidence` field on `ParsedIngredient`

## Verification

- `npx tsc --noEmit` — exits 0 (clean)
- `npx jest` — 602 passing, 28 suites
- `grep -n ': any' src/lib/scan/scan-draft-service.ts` — zero hits
- Broader `grep -r ': any' src/features/ src/lib/` excluding tests/declarations — 4 hits remain in `multi-recipe-parser.ts` (not in scope for T01, needs follow-up)

### Slice verification status (partial — intermediate task)
- ✅ `npx tsc --noEmit` exits 0
- ✅ `npx jest` — all tests pass
- ⬜ `grep -r ': any'` zero hits — 4 remain in `multi-recipe-parser.ts` (out of T01 scope)
- ⬜ `curl localhost:3000/health` — health endpoint not yet created (T03)

## Diagnostics

None — this task is purely a type-safety improvement with no runtime behavior change. All existing runtime behavior preserved.

## Deviations

- Fixed collateral type errors in `photos.ts`, `comments/api.ts`, and `search.ts` that were caused by typing the Supabase client. These files were not in the T01 plan but had to be fixed to keep `tsc --noEmit` passing.
- `multi-recipe-parser.ts` has 4 remaining `any` hits not covered by T01's scope — will need a follow-up task or be addressed in T02/T03 scope.

## Known Issues

- `multi-recipe-parser.ts` still has 4 `any` usages — needs typing in a follow-up
- Two RPCs (`get_first_recipe_photos`, `reorder_recipe_photos`) are not reflected in generated types — likely not applied to remote DB yet. Workaround: cast `supabase.rpc` as `Function`.

## Files Created/Modified

- `src/lib/database.types.ts` — **new** — Generated Supabase types (1304 lines)
- `src/lib/supabase.ts` — Typed client with `createClient<Database>()`
- `src/lib/scan/scan-draft-service.ts` — Replaced all 11 `any` usages with proper types
- `src/lib/scan/__tests__/scan-draft-service.test.ts` — Updated test fixtures for typed `ParsedIngredient[]`
- `src/features/recipes/photos.ts` — Fixed RPC type errors from typed client
- `src/features/comments/api.ts` — Fixed null handling for `display_name`
- `src/features/recipes/search.ts` — Fixed tags `neq` filter type mismatch
