# S09: Core Screens

**Goal:** Create Wave 0 test stubs and their corresponding pure utility modules for RecipeCard and Cooking Mode.
**Demo:** Create Wave 0 test stubs and their corresponding pure utility modules for RecipeCard and Cooking Mode.

## Must-Haves


## Tasks

- [x] **T01: 10-core-screens 00** `est:5min`
  - Create Wave 0 test stubs and their corresponding pure utility modules for RecipeCard and Cooking Mode.

Purpose: The Nyquist validation strategy requires automated test coverage for the two testable areas in Phase 10 -- RecipeCard metadata formatting and cooking mode progress/navigation. These pure functions are extracted into utility modules so they can be tested independently of React components. Plans 01 and 05 will import these utilities rather than inlining the logic.

Output: Two test files and two utility modules, all tests green.
- [x] **T02: 10-core-screens 01** `est:2min`
  - Create the RecipeCard shared component and rebuild the home screen to match cookbook.pen spec.

Purpose: RecipeCard is the foundation component used by Home (this plan) and Recipe List (Plan 03). The home screen is the first thing users see after login and must display greeting, search, featured recipes, and recent recipes per the cookbook.pen design.

Output: RecipeCard.tsx reusable component + fully rebuilt home screen at all 3 breakpoints.
- [x] **T03: 10-core-screens 02** `est:25min`
  - Rebuild the recipe detail screen to match cookbook.pen spec at all three breakpoints with ratings, comments, and Start Cooking navigation.

Purpose: The recipe detail screen is the core content display -- where users read recipes, rate them, comment, and launch cooking mode. The existing 740-line implementation is functional but uses hardcoded styles and lacks responsive layout.

Output: Fully rebuilt recipe detail screen with responsive two-column layout, design tokens, and integrated ratings/comments.
- [x] **T04: 10-core-screens 03** `est:2min`
  - Rebuild the recipe list screen with a responsive grid layout using the RecipeCard component from Plan 01.

Purpose: The recipe list is the primary browsing surface where users find their recipes. It must display photo-rich cards in a responsive grid that adapts from 1-column on mobile to 3-column on web.

Output: Fully rebuilt recipe list screen with responsive FlatList grid, search, and design tokens.
- [x] **T05: 10-core-screens 04** `est:3min`
  - Extract a shared RecipeForm component and rebuild create/edit recipe screens to cookbook.pen spec with photo-first layout, bulk add, and reorder.

Purpose: Create and edit screens share ~90% of their form UI. Extracting RecipeForm eliminates duplication and ensures both screens match the cookbook.pen spec consistently. The key UX changes are: photo upload at top, single-add + bulk-add toggle for ingredients, and up/down arrow reordering.

Output: RecipeForm shared component + rebuilt create.tsx and edit.tsx wrappers.
- [x] **T06: 10-core-screens 05** `est:1min`
  - Create the Cooking Mode walkthrough screen -- a new route that guides users through a recipe one step at a time.

Purpose: Cooking mode is a focused, distraction-free experience designed for use while actually cooking. Users see one step at a time with the ingredients they need, navigate with previous/next, and track progress via a progress bar. This is the most architecturally new feature in Phase 10.

Output: New cook.tsx route at app/(tabs)/recipes/[id]/cook.tsx with responsive layout.
- [x] **T07: 10-core-screens 06** `est:1min`
  - Add missing Stack navigator layouts to recipes/ and collections/ tab directories to fix silent navigation failures.

Purpose: UAT tests 6 and 11 (and cascading skips 7-10, 12-13) all trace to the same root cause — `app/(tabs)/recipes/` and `app/(tabs)/collections/` have no `_layout.tsx` with a Stack navigator. Without a Stack, `router.push()` calls to sub-routes (detail, create, edit, cook) silently fail because there is no navigator to push onto within the Tabs group. The working pattern already exists in `app/(tabs)/family/_layout.tsx`.

Output: Two new `_layout.tsx` files that enable all sub-route navigation within the recipes and collections tabs.
- [x] **T08: 10-core-screens 07** `est:3min`
  - Fix safe area inset handling on recipe detail and cooking mode screens so sticky headers render below the iOS status bar / Dynamic Island.

Purpose: UAT tests 6, 8, 9, 10, and 14 are blocked or failed because the recipe detail sticky header renders behind the iOS status bar. The Start Cooking button is untappable, which cascades to block all cooking mode testing. Both screens in the recipes Stack use raw Views with no safe area padding while the Stack layout has headerShown:false.

Output: Both screens import useSafeAreaInsets and apply paddingTop:insets.top to their top-level header Views, matching the established codebase pattern (PageContainer, profile screen).

## Files Likely Touched

- `src/components/recipes/__tests__/RecipeCard.test.ts`
- `src/features/cooking/__tests__/cookingMode.test.ts`
- `src/components/recipes/recipeCardUtils.ts`
- `src/features/cooking/cookingModeUtils.ts`
- `src/components/recipes/RecipeCard.tsx`
- `app/(tabs)/index.tsx`
- `app/(tabs)/recipes/[id].tsx`
- `app/(tabs)/recipes/index.tsx`
- `src/components/recipes/RecipeForm.tsx`
- `app/(tabs)/recipes/create.tsx`
- `app/(tabs)/recipes/[id]/edit.tsx`
- `app/(tabs)/recipes/[id]/cook.tsx`
- `app/(tabs)/recipes/_layout.tsx`
- `app/(tabs)/collections/_layout.tsx`
- `app/(tabs)/recipes/[id].tsx`
- `app/(tabs)/recipes/[id]/cook.tsx`
