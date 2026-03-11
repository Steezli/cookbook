# T02: 10-core-screens 01

**Slice:** S09 — **Milestone:** M001

## Description

Create the RecipeCard shared component and rebuild the home screen to match cookbook.pen spec.

Purpose: RecipeCard is the foundation component used by Home (this plan) and Recipe List (Plan 03). The home screen is the first thing users see after login and must display greeting, search, featured recipes, and recent recipes per the cookbook.pen design.

Output: RecipeCard.tsx reusable component + fully rebuilt home screen at all 3 breakpoints.

## Must-Haves

- [ ] "Home screen displays 'Welcome back, [name]' greeting using profile display_name or email prefix"
- [ ] "Home screen shows a search entry point that navigates to the recipe list"
- [ ] "Home screen displays 'Featured Recipes' section with the 3 most recent recipes as RecipeCards"
- [ ] "Home screen displays 'Recent Recipes' section with the next 6 recipes as RecipeCards"
- [ ] "RecipeCard shows 180px image area, title, time + servings metadata, and visibility badge pill"
- [ ] "RecipeCard no-photo state shows #E8E0D8 warm placeholder with UtensilsCrossed icon"
- [ ] "Home screen layout adapts per breakpoint: vertical stack on mobile/tablet, sidebar+main on web"

## Files

- `src/components/recipes/RecipeCard.tsx`
- `app/(tabs)/index.tsx`
