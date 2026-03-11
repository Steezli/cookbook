# T01: 11-public-browsing 01

**Slice:** S10 — **Milestone:** M001

## Description

Create the data layer for public browsing: cursor-based pagination for public recipe search, author attribution via SECURITY DEFINER RPCs, and unit tests for both.

Purpose: Public screens need paginated recipe fetching (anon callers via existing RLS) and author display_name access (blocked by profiles RLS without RPC bypass). This is the foundation for both browse and detail screens.

Output: Migration SQL, `public.ts` module, extended `search.ts`, and unit tests.

## Must-Haves

- [ ] "searchPublicRecipes() returns paginated public recipes with hasMore and nextCursor"
- [ ] "searchPublicRecipes() filters by tag and query string"
- [ ] "get_public_recipe_author RPC returns display_name and initials for public recipe owners"
- [ ] "Batch author fetch returns author info for multiple recipe IDs in one call"

## Files

- `supabase/migrations/20260305000000_public_author_rpc.sql`
- `src/features/recipes/public.ts`
- `src/features/recipes/search.ts`
- `src/features/recipes/__tests__/searchPublicRecipes.test.ts`
- `src/features/recipes/__tests__/publicRecipes.test.ts`
