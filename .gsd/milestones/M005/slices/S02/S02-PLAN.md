# S02: Performance & Code Deduplication

**Goal:** Eliminate N+1 queries, optimize hot paths, deduplicate parser logic, remove deprecated code
**Demo:** Recipe list loads with 1 photo query (not N), tags query skips empty arrays, parser logic exists in one place

## Must-Haves

- getFirstRecipePhotos uses efficient single query (DISTINCT ON or RPC)
- getAvailableTags filters empty tag arrays at DB level
- Comments API gets pagination support
- Multi-recipe parser is single-source (client) with sync/copy to edge function
- Deprecated getRecipes() removed
- Public recipe hero image uses width parameter

## Proof Level

- This slice proves: contract + integration
- Real runtime required: no
- Human/UAT required: no

## Verification

- `npx tsc --noEmit` exits 0
- `npx jest` — all tests pass
- Grep confirms no `getRecipes()` calls remain
- Edge function parser matches client parser exactly

## Observability / Diagnostics

- Runtime signals: none new
- Inspection surfaces: none new
- Failure visibility: none new
- Redaction constraints: none

## Integration Closure

- Upstream surfaces consumed: none (independent of S01)
- New wiring introduced: optimized photo query, paginated comments
- What remains: S03 type safety, S04 code quality, S05 verification

## Tasks

- [ ] **T01: Optimize photo and tag queries** `est:25m`
  - Why: getFirstRecipePhotos fetches all photos then filters client-side; getAvailableTags loads all recipes
  - Files: `src/features/recipes/photos.ts`, `src/features/recipes/search.ts`
  - Do: getFirstRecipePhotos: restructure query to fetch only first photo per recipe. getAvailableTags: add `.neq('tags', '{}')` filter. Add width parameter to public recipe hero image URL.
  - Verify: `npx tsc --noEmit`, query returns correct subset
  - Done when: photo query returns at most N rows for N recipes

- [ ] **T02: Add comment pagination and remove deprecated code** `est:20m`
  - Why: Comments load all at once with no limit; getRecipes() is deprecated but still exported
  - Files: `src/features/comments/api.ts`, `src/features/recipes/api.ts`, `src/features/recipes/search.ts`
  - Do: Add limit/offset params to getRecipeComments (default 50). Remove getRecipes() export and any callers. Clean up any remaining references.
  - Verify: `npx tsc --noEmit`, grep shows no getRecipes usage
  - Done when: comments paginated, deprecated function removed

- [ ] **T03: Deduplicate parser logic between client and edge function** `est:30m`
  - Why: ~150 lines duplicated between src/lib/scan/multi-recipe-parser.ts and edge function
  - Files: `src/lib/scan/multi-recipe-parser.ts`, `supabase/functions/process-scan-job/index.ts`, new: `scripts/sync-scan-parser.sh`
  - Do: Keep src/lib/scan/multi-recipe-parser.ts as source of truth. Create a sync script that copies the relevant functions into the edge function with a "DO NOT EDIT — synced from src/" header. Run the sync and verify edge function still has identical logic. Add sync script to package.json.
  - Verify: diff between synced section and source shows no meaningful differences; `npx jest` passes
  - Done when: single source of truth with automated sync, edge function updated

## Files Likely Touched

- `src/features/recipes/photos.ts`
- `src/features/recipes/search.ts`
- `src/features/recipes/api.ts`
- `src/features/comments/api.ts`
- `src/lib/scan/multi-recipe-parser.ts`
- `supabase/functions/process-scan-job/index.ts`
- `scripts/sync-scan-parser.sh`
