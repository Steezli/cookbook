# T01: Optimize photo and tag queries

## Objective
Optimize `getFirstRecipePhotos` to avoid fetching all photos then filtering client-side. Optimize `getAvailableTags` to filter empty tag arrays at the DB level. Add width parameter to public recipe hero image URL.

## Steps

1. **Optimize getFirstRecipePhotos** — restructure query to use Supabase's `limit` per group or fetch only first photo per recipe. Since Supabase JS doesn't support DISTINCT ON, keep the current approach but note it already only fetches needed columns and deduplicates client-side (it's O(N) not N+1 — it's a single query). The real optimization: add `.order().limit()` pattern or use an RPC. Evaluate best approach.

2. **Optimize getAvailableTags** — add `.neq('tags', '{}')` filter to skip recipes with empty tag arrays at the DB level.

3. **Add width parameter to public recipe hero image** — in `app/(public)/recipe/[id].tsx`, use `getThumbnailUrl` with a width parameter instead of raw `getPhotoUrl` for the hero image.

4. **Write tests** for the optimized functions.

5. **Verify** — `npx tsc --noEmit` passes.

## Must-Haves
- getFirstRecipePhotos uses efficient single query
- getAvailableTags filters empty tag arrays at DB level
- Public recipe hero image uses width parameter
- TypeScript compiles clean

## Estimate
25 minutes
