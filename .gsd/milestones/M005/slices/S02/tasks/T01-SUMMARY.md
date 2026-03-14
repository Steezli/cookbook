---
id: T01
parent: S02
milestone: M005
provides:
  - Optimized getFirstRecipePhotos using Postgres DISTINCT ON via RPC
  - DB-level filtering of empty tag arrays in getAvailableTags
  - Width-parameterized hero image on public recipe detail page
  - Test coverage for photo and search query functions
key_files:
  - src/features/recipes/photos.ts
  - src/features/recipes/search.ts
  - app/(public)/recipe/[id].tsx
  - supabase/migrations/20260314100000_first_recipe_photos_rpc.sql
  - src/features/recipes/__tests__/photos.test.ts
  - src/features/recipes/__tests__/search.test.ts
key_decisions:
  - Used Postgres DISTINCT ON via RPC for first-photo-per-recipe instead of client-side dedup
patterns_established:
  - RPC pattern for queries needing DISTINCT ON (Supabase JS doesn't support it natively)
observability_surfaces:
  - none
duration: 20m
verification_result: passed
completed_at: 2026-03-14
blocker_discovered: false
---

# T01: Optimize photo and tag queries

**Replaced client-side photo dedup with Postgres DISTINCT ON RPC, added DB-level empty-tag filtering, and added width parameter to public hero image.**

## What Happened

Three optimizations implemented:

1. **getFirstRecipePhotos** — Previously fetched ALL photos for the given recipe IDs and deduplicated client-side. Now calls a new `get_first_recipe_photos` RPC that uses `DISTINCT ON (recipe_id)` with ordering by `sort_order, created_at` to return exactly one row per recipe directly from Postgres. This reduces data transfer proportionally to the number of extra photos per recipe.

2. **getAvailableTags** — Added `.neq('tags', '{}')` to the Supabase query so recipes with empty tag arrays are filtered at the database level instead of being fetched and discarded client-side.

3. **Public recipe hero image** — Changed `app/(public)/recipe/[id].tsx` from `getPhotoUrl` (full-size) to `getThumbnailUrl(path, 800)` which appends `?width=800&quality=80` to the storage URL, leveraging Supabase's built-in image transform to serve a resized image.

## Verification

- `npx tsc --noEmit` — exits 0
- `npx jest` — 602 tests pass (28 suites), up from 585/26 (+17 new tests in 2 suites)
- New test suites: `photos.test.ts` (12 tests), `search.test.ts` (5 tests)
- Slice-level checks: tsc ✅, jest ✅, getRecipes() removal ⏳ (T02), parser dedup ⏳ (T03)

## Diagnostics

None — these are query optimizations with no new runtime diagnostic surfaces.

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `src/features/recipes/photos.ts` — Rewrote getFirstRecipePhotos to use RPC
- `src/features/recipes/search.ts` — Added .neq('tags', '{}') to getAvailableTags
- `app/(public)/recipe/[id].tsx` — Switched hero image from getPhotoUrl to getThumbnailUrl with width=800
- `supabase/migrations/20260314100000_first_recipe_photos_rpc.sql` — New RPC for DISTINCT ON first photo per recipe
- `src/features/recipes/__tests__/photos.test.ts` — New test suite for photo query functions
- `src/features/recipes/__tests__/search.test.ts` — New test suite for tag query and escapeLikePattern
