# T04: 10-core-screens 03

**Slice:** S09 — **Milestone:** M001

## Description

Rebuild the recipe list screen with a responsive grid layout using the RecipeCard component from Plan 01.

Purpose: The recipe list is the primary browsing surface where users find their recipes. It must display photo-rich cards in a responsive grid that adapts from 1-column on mobile to 3-column on web.

Output: Fully rebuilt recipe list screen with responsive FlatList grid, search, and design tokens.

## Must-Haves

- [ ] "Recipe list displays recipes in a responsive grid: 1-column mobile, 2-column tablet, 3-column web"
- [ ] "Each recipe in the grid is rendered as a RecipeCard with photo thumbnail"
- [ ] "FlatList has key={numColumns} to force remount on column change (browser resize)"
- [ ] "Thumbnails are batch-fetched via getRecipeThumbnailUrlMap (not per-card queries)"
- [ ] "Search bar filters recipes in real-time using existing searchRecipes API"
- [ ] "All colors use design tokens, no hardcoded hex values"

## Files

- `app/(tabs)/recipes/index.tsx`
