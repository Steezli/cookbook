# Phase 10: Core Screens - Context

**Gathered:** 2026-03-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Home, recipe list, recipe detail, and create/edit screens rebuilt to match cookbook.pen at all three breakpoints (mobile/tablet/web). Additionally, a new Cooking Mode walkthrough screen (designed in cookbook.pen during this session) that guides users through a recipe one step at a time with per-step ingredients.

</domain>

<decisions>
## Implementation Decisions

### Home Screen
- Follow cookbook.pen layout exactly: greeting + search + featured recipes + recent recipes
- Override greeting text: use "Welcome back, [name]" instead of .pen's "Good morning, [name]"
- Featured recipes section shows most recent recipes (not curated/algorithmic)
- Keep both "Featured Recipes" and "Recent Recipes" sections as designed in .pen (may differentiate later)
- No quick-action buttons — rely on tab bar / sidebar for feature navigation
- Layout adaptation per breakpoint follows cookbook.pen exactly (vertical stack mobile/tablet, sidebar + main on web)

### Recipe Card Design
- Follow cookbook.pen RecipeCard component: 180px image area, title, time + servings metadata, visibility badge pill
- Photo aspect ratio and card structure match .pen spec exactly
- No-photo state: use .pen placeholder color (#E8E0D8) but add a subtle utensil icon or recipe first letter so cards don't look broken
- Visibility badge (private/family/public) included per .pen spec

### Recipe List
- Responsive grid: 1-column mobile, 2-column tablet, 3-column web (per SCREEN-02 requirement)
- Photo thumbnails on each card

### Recipe Detail
- Layout follows cookbook.pen exactly per breakpoint (hero image mobile, two-column tablet/web)
- Photo display, section ordering, and typography per .pen spec
- Ratings section added to .pen: star display with average + count, placed after story section
- Comments section added to .pen: comment items (avatar, name, date, text) + input field, placed after ratings
- Comments and ratings inline below recipe content (single scrollable page)
- Sticky header with action buttons (edit, share) — always accessible while scrolling
- Ingredients remain static (not checkable) — cooking mode handles the interactive experience

### Cooking Mode (new — designed in cookbook.pen)
- Triggered by "Start Cooking" button on recipe detail (button already exists in .pen action bar)
- Full-screen focused experience showing one step at a time
- Each step shows: step number badge, instruction text, "You'll need" card with ingredients for that step only
- Progress bar at top showing position in recipe
- Previous / Next navigation at bottom
- X button to exit back to recipe detail
- Mobile: centered vertical layout, clean and readable
- Tablet: same layout with more padding
- Web: sidebar with step nav list (clickable steps) + main content area
- Designed in cookbook.pen at all 3 breakpoints

### Create/Edit Form UX
- Photo upload area at top of form (photo-first, encourages adding photos)
- Ingredient input: single input + Add button as default, with "Bulk add" toggle for pasting multiple ingredients
- Steps input: same single-add pattern
- Reordering: up/down arrow buttons for ingredients and steps (not drag-and-drop — works cross-platform)
- No live preview — standard form, submit to save
- Form uses PageContainer variant="form" (600px max-width centered)

### Claude's Discretion
- Exact empty state designs (no recipes, no comments, etc.)
- Loading skeleton patterns
- Error state handling
- Search bar behavior on home screen
- How "See all" links on home screen navigate (to recipe list with filter?)
- Ingredient-to-step mapping logic for cooking mode (how to determine which ingredients belong to which step)

</decisions>

<specifics>
## Specific Ideas

- "Welcome back, [name]" greeting — warmer than time-based, simpler to implement
- No-photo recipe cards should still look intentional, not broken — a utensil icon on the warm placeholder color
- Cooking mode should feel focused and distraction-free — no nav chrome, just the recipe step
- The "Start Cooking" button already exists in the .pen action bar — it just needs to route to the cooking mode screen

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `PageContainer` (src/components/nav/PageContainer.tsx): Wraps screens with responsive padding, variants: default/form/content
- `useBreakpoint()` (src/lib/hooks/useBreakpoint.ts): Returns mobile/tablet/web + width
- `tokens.ts` (src/lib/tokens.ts): All design tokens (colors, fonts, radii, shadows, font sizes)
- `StarRating` (src/features/ratings/): Interactive star rating component
- `CommentThread` + `CommentInput` (src/features/comments/): Comment UI with real-time updates
- `RecipeCard component` in cookbook.pen (MDQuY): Reusable card with image, title, meta, badge
- All recipe CRUD APIs (src/features/recipes/api.ts): getRecipeById, createRecipe, updateRecipe
- Recipe search + filtering (src/features/recipes/search.ts): searchRecipes with query/tags/visibility/family filters
- Photo management (src/features/recipes/photos.ts): upload, thumbnails, URL generation
- Unit conversion (src/features/units/): displayAmount, parseIngredient

### Established Patterns
- Inline style objects (no Tailwind CSS in React Native)
- All dimension-sensitive styles via useBreakpoint() — never in StyleSheet.create
- Expo Router v4 file-based routing with _layout.tsx per route group
- FlatList on web: flexGrow:1, flexBasis:0 + key={numColumns}
- Supabase client for all data fetching, RLS enforces access control

### Integration Points
- Home screen: app/(tabs)/index.tsx — currently a placeholder, needs full rebuild
- Recipe list: app/(tabs)/recipes/index.tsx — functional but needs .pen styling + responsive grid
- Recipe detail: app/(tabs)/recipes/[id].tsx — functional but needs .pen layout + responsive columns
- Create/Edit: app/(tabs)/recipes/create.tsx and [id]/edit.tsx — functional forms needing .pen styling
- Cooking mode: new route needed — likely app/(tabs)/recipes/[id]/cook.tsx or modal presentation
- MobileTabBar + WebSidebar already handle breakpoint-aware navigation chrome

</code_context>

<deferred>
## Deferred Ideas

- Checkable ingredients (tap to strike through while cooking) — cooking mode handles the guided experience instead
- Recipe sharing / social features — separate phase
- Recipe print view — future phase

</deferred>

---

*Phase: 10-core-screens*
*Context gathered: 2026-03-04*
