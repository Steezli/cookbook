# S02: Performance & Code Deduplication — UAT

**Milestone:** M005
**Written:** 2026-03-14

## UAT Type

- UAT mode: artifact-driven
- Why this mode is sufficient: All changes are query optimizations, API refactoring, and build-time sync tooling. Correctness is fully verifiable through TypeScript compilation, test suites, grep audits, and sync script execution. No user-facing behavior changes require live runtime verification.

## Preconditions

- Repository checked out on gsd/M005/S02 branch
- Node modules installed (`npm install`)
- No running dev server required

## Smoke Test

Run `npx tsc --noEmit && npx jest && npm run sync:scan-parser:check` — all three must exit 0 with 602+ tests passing.

## Test Cases

### 1. Photo query uses RPC instead of client-side dedup

1. Open `src/features/recipes/photos.ts`
2. Verify `getFirstRecipePhotos` calls `.rpc('get_first_recipe_photos', ...)` instead of fetching all photos and filtering
3. Verify migration file `supabase/migrations/20260314100000_first_recipe_photos_rpc.sql` exists with `DISTINCT ON (recipe_id)` query
4. Run `npx jest src/features/recipes/__tests__/photos.test.ts`
5. **Expected:** 12 tests pass, RPC is called with recipe IDs array

### 2. Tag query filters empty arrays at DB level

1. Open `src/features/recipes/search.ts`
2. Verify `getAvailableTags` includes `.neq('tags', '{}')` in the query chain
3. Run `npx jest src/features/recipes/__tests__/search.test.ts`
4. **Expected:** 5 tests pass, query builder includes neq filter

### 3. Public hero image uses width parameter

1. Open `app/(public)/recipe/[id].tsx`
2. Verify hero image uses `getThumbnailUrl` with width parameter (not `getPhotoUrl`)
3. **Expected:** Image URL includes `?width=800` parameter

### 4. Comment pagination with Load More

1. Open `src/features/comments/api.ts`
2. Verify `getRecipeComments` accepts `GetCommentsOptions` with `limit` (default 50) and `offset`
3. Verify return type is `CommentPage` with `{comments, hasMore, total}`
4. Open `src/features/comments/CommentThread.tsx`
5. Verify Load More button renders when `hasMore` is true
6. **Expected:** Paginated API with UI support for incremental loading

### 5. Deprecated getRecipes() fully removed

1. Run `rg 'getRecipes\b' --glob '*.{ts,tsx}'`
2. **Expected:** Zero matches

### 6. Parser sync script works correctly

1. Run `npm run sync:scan-parser:check`
2. **Expected:** Exits 0 with "Edge function parser is in sync" message
3. Open `supabase/functions/process-scan-job/index.ts`
4. Verify `// --- BEGIN SYNCED FROM src/lib/scan/multi-recipe-parser.ts ---` and `// --- END SYNCED ---` markers exist
5. Verify `@synced-hash` comment contains a SHA-256 hash
6. **Expected:** Synced section matches source file content exactly

### 7. Full TypeScript and test verification

1. Run `npx tsc --noEmit`
2. Run `npx jest`
3. **Expected:** tsc exits 0, 602+ tests pass across 28 suites

## Edge Cases

### Parser sync drift detection

1. Manually add a comment inside the synced section of the edge function
2. Run `npm run sync:scan-parser:check`
3. **Expected:** Exits non-zero with a message indicating drift
4. Run `npm run sync:scan-parser` to re-sync
5. Run `npm run sync:scan-parser:check` again
6. **Expected:** Exits 0, drift resolved

### Comment pagination with zero comments

1. Verify `getRecipeComments` returns `{comments: [], hasMore: false, total: 0}` for a recipe with no comments
2. **Expected:** No errors, empty page returned

## Failure Signals

- `npx tsc --noEmit` exits non-zero — type errors from refactored APIs
- `npx jest` has failures — broken tests from API changes
- `rg 'getRecipes\b'` finds matches — deprecated function not fully removed
- `npm run sync:scan-parser:check` exits non-zero — parser drift between client and edge function
- `getFirstRecipePhotos` still references `.from('recipe_photos')` directly instead of `.rpc(...)` — optimization not applied

## Requirements Proved By This UAT

- None — this slice addresses internal performance and code quality, not tracked user-facing requirements

## Not Proven By This UAT

- Runtime performance improvement (query execution time) — verified structurally but not measured at runtime
- Comment pagination under real load — verified via code structure, not live database
- Edge function deployment with synced parser — sync verified locally, deployment is an ops concern

## Notes for Tester

- The RPC migration (`20260314100000_first_recipe_photos_rpc.sql`) must be applied to the Supabase database before the new photo query will work in production. Tests mock the RPC call.
- The sync script requires `bash` and `shasum` (available on macOS and Linux by default).
- Test count increased from 585 to 602 during this slice (17 new tests in photos.test.ts and search.test.ts).
