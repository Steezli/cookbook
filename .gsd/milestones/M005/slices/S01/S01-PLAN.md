# S01: Security & Data Integrity Fixes

**Goal:** Fix all security vulnerabilities and data integrity issues found in audit
**Demo:** Search with `%` character returns no unintended results; scan retry stays within max_retries; backfill doesn't mutate returned objects

## Must-Haves

- LIKE pattern injection fixed in searchRecipes and searchPublicRecipes
- Scan retry logic off-by-one fixed, error messages preserved
- backfillIngredients returns new object instead of mutating in-place
- Photo reorder made atomic (single RPC call)
- CORS tightened on edge functions
- Password validation strengthened

## Proof Level

- This slice proves: contract + integration
- Real runtime required: no (tests prove behavior)
- Human/UAT required: no

## Verification

- `npx tsc --noEmit` exits 0
- `npx jest` — all tests pass
- New test: search with `%` and `_` characters returns correct results
- New test: retry logic respects max_retries boundary
- Grep confirms no unescaped ilike interpolation in search.ts

## Observability / Diagnostics

- Runtime signals: edge function logs retry count and final status
- Inspection surfaces: scan_jobs table shows correct retry_count and error_message
- Failure visibility: error_message preserved through retry cycle, not overwritten
- Redaction constraints: none

## Integration Closure

- Upstream surfaces consumed: none (first slice)
- New wiring introduced: fixed edge function retry flow
- What remains: S02-S04 code quality work, S05 verification

## Tasks

- [x] **T01: Fix LIKE pattern injection in search functions** `est:20m`
  - Why: User input containing `%` or `_` bypasses search filtering — can expose all recipes
  - Files: `src/features/recipes/search.ts`
  - Do: Create `escapeLikePattern()` helper that escapes `%`, `_`, and `\`. Apply to all `ilike()` calls in `searchRecipes()` and `searchPublicRecipes()`. Add tests for edge cases.
  - Verify: New test with `%` and `_` in query returns empty (not all recipes)
  - Done when: no unescaped user input in any ilike call

- [x] **T02: Fix scan retry logic and preserve error messages** `est:25m`
  - Why: Off-by-one in retry comparison causes extra retry; error_message is overwritten with "Retrying..."
  - Files: `supabase/functions/process-scan-job/index.ts`
  - Do: Use incremented retry_count for comparison. Keep original error_message when re-queuing. Combine the two updates into one. Add guard against re-queuing already-at-max jobs.
  - Verify: Code review of the retry block logic
  - Done when: retry comparison uses post-increment value, error_message preserved

- [x] **T03: Fix backfillIngredients mutation and make photo reorder atomic** `est:20m`
  - Why: In-place mutation causes race conditions during render; photo reorder is non-atomic
  - Files: `src/features/recipes/api.ts`, `src/features/recipes/photos.ts`
  - Do: backfillIngredients: remove `recipe.ingredients = updated` mutation — let caller re-fetch if needed. Photo reorder: replace individual updates with a single RPC or batch approach. Skip backfill for recipes user doesn't own (check before firing).
  - Verify: `npx tsc --noEmit`, grep confirms no in-place mutation
  - Done when: getRecipeById returns immutable data, reorderRecipePhotos is safe

- [x] **T04: Tighten CORS and strengthen password validation** `est:15m`
  - Why: CORS `*` on sensitive edge functions is unnecessarily permissive; password validation is minimal
  - Files: `supabase/functions/_shared/cors.ts`, `supabase/functions/process-scan-job/index.ts`, `src/features/auth/password.ts`
  - Do: Update CORS to use site domain or Supabase project URL. Add uppercase requirement and minimum entropy check to password validation. Update tests.
  - Verify: `npx jest` passes with updated password tests
  - Done when: CORS restricted, password requires uppercase + number/symbol + 8 chars

## Files Likely Touched

- `src/features/recipes/search.ts`
- `src/features/recipes/api.ts`
- `src/features/recipes/photos.ts`
- `src/features/auth/password.ts`
- `supabase/functions/process-scan-job/index.ts`
- `supabase/functions/_shared/cors.ts`
