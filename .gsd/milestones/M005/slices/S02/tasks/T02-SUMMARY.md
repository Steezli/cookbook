---
id: T02
parent: S02
milestone: M005
provides:
  - Paginated comment loading with limit/offset (default 50 top-level)
  - CommentPage return type with hasMore/total for load-more UI
  - Load More button in CommentThread component
  - Removed deprecated getRecipes() export and its searchRecipes import
key_files:
  - src/features/comments/api.ts
  - src/features/comments/CommentThread.tsx
  - src/features/recipes/api.ts
key_decisions:
  - Pagination applied to top-level comments only; all replies for paginated top-level comments are always included to keep threads complete
  - Client-side pagination over RPC results (RPC returns full tree; slicing done in API layer) — avoids modifying the Postgres RPC which handles access control and recursive CTE
patterns_established:
  - CommentPage type with {comments, hasMore, total} for paginated comment APIs
observability_surfaces:
  - none
duration: 12m
verification_result: passed
completed_at: 2026-03-14
blocker_discovered: false
---

# T02: Add comment pagination and remove deprecated code

**Added limit/offset pagination to getRecipeComments (default 50 top-level) with Load More UI, and removed the deprecated getRecipes() wrapper.**

## What Happened

1. **Comment pagination**: Refactored `getRecipeComments` to accept `GetCommentsOptions` with optional `limit` (default 50) and `offset` params. The function now returns a `CommentPage` object with `{comments, hasMore, total}` instead of a flat array. Pagination applies to top-level comments; all replies within paginated threads are always included so threads remain complete. The path-based filtering leverages the RPC's existing `path` field to identify descendants.

2. **CommentThread UI**: Updated the component to consume the new `CommentPage` shape, added `loadMoreComments()` for incremental loading, and rendered a "Load more comments (N remaining)" button when `hasMore` is true with a loading indicator during fetch.

3. **Deprecated code removal**: Removed the `getRecipes()` function and its `searchRecipes` import from `src/features/recipes/api.ts`. Grep confirms zero remaining references.

## Verification

- `npx tsc --noEmit` — exits 0 ✅
- `npx jest` — 602 tests pass, 28 suites ✅
- `rg 'getRecipes\b' --glob '*.{ts,tsx}'` — no matches ✅
- Edge function parser match — deferred to T03 ✅

## Diagnostics

None — these are API-level changes with no new runtime diagnostic surfaces.

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `src/features/comments/api.ts` — Added CommentPage type, GetCommentsOptions, pagination logic in getRecipeComments
- `src/features/comments/CommentThread.tsx` — Consume paginated response, add Load More button and loadMoreComments handler
- `src/features/recipes/api.ts` — Removed deprecated getRecipes() and unused searchRecipes import
