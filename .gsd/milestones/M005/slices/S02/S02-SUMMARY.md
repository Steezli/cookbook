---
id: S02
parent: M005
milestone: M005
provides:
  - Efficient single-query photo fetching via DISTINCT ON RPC (no N+1)
  - DB-level empty tag array filtering in getAvailableTags
  - Width-parameterized hero image on public recipe detail
  - Paginated comment loading with hasMore/total and Load More UI
  - Removed deprecated getRecipes() export
  - Single-source parser with automated sync script and CI-friendly drift detection
requires:
  - slice: none
    provides: none
affects:
  - S04
key_files:
  - src/features/recipes/photos.ts
  - src/features/recipes/search.ts
  - src/features/comments/api.ts
  - src/features/comments/CommentThread.tsx
  - src/features/recipes/api.ts
  - app/(public)/recipe/[id].tsx
  - supabase/migrations/20260314100000_first_recipe_photos_rpc.sql
  - scripts/sync-scan-parser.sh
  - supabase/functions/process-scan-job/index.ts
  - src/features/recipes/__tests__/photos.test.ts
  - src/features/recipes/__tests__/search.test.ts
key_decisions:
  - Postgres DISTINCT ON via RPC for first-photo-per-recipe instead of client-side dedup
  - Client-side pagination over RPC results for comments (avoids modifying recursive CTE RPC)
  - Marker-based sync with SHA-256 content hash for cross-runtime parser deduplication
patterns_established:
  - RPC pattern for queries needing DISTINCT ON (Supabase JS doesn't support it natively)
  - CommentPage type with {comments, hasMore, total} for paginated APIs
  - Sync marker pattern (BEGIN/END SYNCED FROM) with hash-based drift detection for code shared across runtimes
observability_surfaces:
  - npm run sync:scan-parser:check — exits non-zero when edge function parser drifts from source (CI-friendly)
drill_down_paths:
  - .gsd/milestones/M005/slices/S02/tasks/T01-SUMMARY.md
  - .gsd/milestones/M005/slices/S02/tasks/T02-SUMMARY.md
  - .gsd/milestones/M005/slices/S02/tasks/T03-SUMMARY.md
duration: 47m
verification_result: passed
completed_at: 2026-03-14
---

# S02: Performance & Code Deduplication

**Eliminated N+1 photo queries via Postgres RPC, added comment pagination, and established single-source parser with automated sync to edge function.**

## What Happened

Three tasks shipped performance optimizations, pagination, deprecated code removal, and parser deduplication:

**Photo & tag query optimization (T01):** Replaced the client-side photo deduplication pattern — which fetched ALL photos for N recipes then filtered — with a new `get_first_recipe_photos` Postgres RPC using `DISTINCT ON (recipe_id)` ordered by `sort_order, created_at`. This returns exactly one row per recipe at the database level. Also added `.neq('tags', '{}')` to `getAvailableTags` so empty tag arrays are filtered at DB level, and switched the public recipe hero image from full-size to `getThumbnailUrl(path, 800)` using Supabase image transforms. Added 17 new tests across 2 suites.

**Comment pagination & deprecated code removal (T02):** Refactored `getRecipeComments` to accept `limit`/`offset` (default 50 top-level) and return a `CommentPage` with `{comments, hasMore, total}`. Pagination applies to top-level comments only; all replies within paginated threads are always included to keep threads complete. Updated `CommentThread` with a "Load more comments (N remaining)" button. Removed the deprecated `getRecipes()` export and its `searchRecipes` import.

**Parser deduplication (T03):** Created `scripts/sync-scan-parser.sh` that copies parser functions from `src/lib/scan/multi-recipe-parser.ts` (source of truth) into the edge function between `BEGIN SYNCED`/`END SYNCED` markers. The script strips `export` keywords and JSDoc module comments, stamps a SHA-256 content hash for drift detection, and supports `--check` mode for CI. Added `sync:scan-parser` and `sync:scan-parser:check` npm scripts.

## Verification

- `npx tsc --noEmit` — exits 0 ✅
- `npx jest` — 602 tests pass, 28 suites ✅
- `rg 'getRecipes\b' --glob '*.{ts,tsx}'` — no matches (deprecated function fully removed) ✅
- `npm run sync:scan-parser:check` — edge function parser matches client parser exactly ✅

## Requirements Advanced

- None — this slice addresses performance and code quality, not tracked requirements

## Requirements Validated

- None — no requirements moved to validated status from this slice

## New Requirements Surfaced

- None

## Requirements Invalidated or Re-scoped

- None

## Deviations

None.

## Known Limitations

- Comment pagination is client-side over RPC results (RPC returns full tree, slicing done in API layer). This means the full comment tree is still fetched from Postgres; pagination saves rendering cost, not DB cost. Modifying the Postgres RPC would save DB cost but is deferred since it handles access control and recursive CTE.
- The sync script requires manual execution (`npm run sync:scan-parser`) after editing the parser. CI check (`sync:scan-parser:check`) catches drift but doesn't auto-fix.

## Follow-ups

- Consider adding `sync:scan-parser:check` to CI pipeline to catch drift before deployment
- If comment volumes grow large, the recursive CTE RPC itself should be refactored for server-side pagination

## Files Created/Modified

- `src/features/recipes/photos.ts` — Rewrote getFirstRecipePhotos to use DISTINCT ON RPC
- `src/features/recipes/search.ts` — Added .neq('tags', '{}') to getAvailableTags
- `src/features/recipes/api.ts` — Removed deprecated getRecipes() and unused searchRecipes import
- `src/features/comments/api.ts` — Added CommentPage type, GetCommentsOptions, pagination logic
- `src/features/comments/CommentThread.tsx` — Consume paginated response, Load More button
- `app/(public)/recipe/[id].tsx` — Switched hero image to getThumbnailUrl with width=800
- `supabase/migrations/20260314100000_first_recipe_photos_rpc.sql` — New RPC for DISTINCT ON first photo
- `scripts/sync-scan-parser.sh` — Sync script for parser deduplication with hash-based drift detection
- `supabase/functions/process-scan-job/index.ts` — Replaced duplicated parser with sync-marker-delineated auto-synced version
- `package.json` — Added sync:scan-parser and sync:scan-parser:check scripts
- `src/features/recipes/__tests__/photos.test.ts` — New test suite (12 tests)
- `src/features/recipes/__tests__/search.test.ts` — New test suite (5 tests)

## Forward Intelligence

### What the next slice should know
- The RPC pattern for `get_first_recipe_photos` is a good reference for any future query needing DISTINCT ON — Supabase JS client doesn't support it natively
- The sync script pattern (`scripts/sync-scan-parser.sh`) establishes the precedent for how to handle code shared between client and Deno edge functions

### What's fragile
- The sync marker pattern in `process-scan-job/index.ts` depends on exact `// --- BEGIN SYNCED ---` / `// --- END SYNCED ---` markers. If someone edits these markers manually, the sync script will fail silently or corrupt the file.
- Comment pagination is over the full RPC result set. If a recipe gets 1000+ comments, the RPC will fetch them all before the API layer slices.

### Authoritative diagnostics
- `npm run sync:scan-parser:check` — exits non-zero with a clear message when parser drift is detected. Trust this over manual diffing.
- Test count should be 602+ going forward (up from 585 at start of S02)

### What assumptions changed
- No assumptions changed — all three tasks were straightforward implementations matching the plan
