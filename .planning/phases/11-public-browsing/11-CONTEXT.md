# Phase 11: Public Browsing - Context

**Gathered:** 2026-03-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Unauthenticated users can browse and read public recipes without logging in. A separate `(public)/` route group with its own navigation header (no authenticated chrome). Includes search, filter chips, author attribution, sign-up nudges, and cursor-based pagination. Ad slot placement is designed but ad SDK integration is Phase 13.

</domain>

<decisions>
## Implementation Decisions

### Browse layout
- Follow cookbook.pen exactly — NOT the same as the authenticated recipe list
- Mobile: list layout with circular photo thumbnails + text (title, metadata, author)
- Tablet: card grid (from .pen spec)
- Web: card grid, 4 columns (from .pen spec)
- Filter chips: "All", "Dinner", "Baking", "Dessert", "Quick" per .pen spec
- Sort: "Popular" as default and only option — no dropdown picker
- Result count shown ("248 public recipes")

### Public navigation header
- Follow cookbook.pen exactly at all 3 breakpoints
- Mobile: Logo (icon + "Cookbook") left, "Sign In" pill button right. Scrolls away with content.
- Tablet: Logo left, search + Sign In right
- Web: Logo (icon + "Cookbook") left, search bar center, "Sign In" text + "Get Started" orange button right. Full viewport width, content constrained inside.
- Header has bottom border ($border-subtle)
- Search bar always visible (not collapsed behind icon) — per .pen spec

### Author attribution
- Follow cookbook.pen exactly
- Avatar circle with initials + display name + "Public recipe" label
- Shown on both browse list items and recipe detail
- Uses profiles table display_name (not raw email)

### Recipe detail (public)
- Follow cookbook.pen exactly — read-only view
- Mobile: back arrow + "Cookbook" + Sign In in nav bar, hero image, title, author card, description, metadata stats (time, servings, temp), ingredients (truncated with "+N more" link), sign-up CTA card
- Web: two-column layout — recipe content left, ingredients + sign-up CTA right
- "Want to save this recipe?" CTA card with "Create Free Account" button
- No ratings, comments, or edit actions on public view

### Sign-in prompts
- Header "Sign In" button on all breakpoints (per .pen)
- "Get Started" CTA button on web header (per .pen)
- "Want to save this recipe?" inline CTA card on recipe detail (per .pen)
- No aggressive gating — users can freely browse and read full recipes

### Pagination
- Cursor-based pagination (PUB-04 requirement)
- Auto-load next page when user scrolls near the bottom
- Spinner at bottom while loading next batch

### Ad slot
- Sponsored banner placeholder positioned between recipe results (per .pen)
- Render as empty/hidden placeholder in Phase 11 — actual AdMob integration is Phase 13

### Claude's Discretion
- Loading states and skeletons for browse and detail screens
- Empty state design (no results found)
- Error handling for failed fetches
- Exact cursor pagination implementation (keyset vs offset-based cursor)
- How to handle the Supabase client for unauthenticated reads (anon key with RLS)
- Search debounce timing
- Mobile list item exact spacing and typography (derive from .pen)

</decisions>

<specifics>
## Specific Ideas

- cookbook.pen is the source of truth for all visual decisions — 6 screens already designed (Public Browse and Public Recipe Detail at all 3 breakpoints)
- Mobile browse uses a distinct list layout (not RecipeCard grid) — circular thumbnails with horizontal text layout, different from the authenticated recipe list
- The sign-up CTA on recipe detail is a soft nudge, not a gate — users see the full recipe content without signing up
- "Popular" sort is the only sort option — keep it simple for public browsing

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `RecipeCard` (built in Phase 10): Reusable for tablet/web card grid, but mobile public browse uses a different list layout
- `PageContainer` (src/components/nav/PageContainer.tsx): Wraps screens with responsive padding
- `useBreakpoint()` (src/lib/hooks/useBreakpoint.ts): Drives layout switching
- `tokens.ts` (src/lib/tokens.ts): All design tokens
- `searchRecipes()` (src/features/recipes/search.ts): Has visibility filter, needs cursor pagination added
- `getRecipeThumbnailUrlMap()` (src/features/recipes/photos.ts): Batch thumbnail fetching
- `profiles` table with `display_name`: Comments already join this for author names — same pattern for recipe attribution
- `Component/AdBanner/Mobile` and `Component/AdBanner/Leaderboard` in cookbook.pen: Ad components designed, ready for Phase 13
- `Component/SearchBar` in cookbook.pen: Reusable search bar component

### Established Patterns
- Inline style objects (no Tailwind CSS in React Native)
- All dimension-sensitive styles via useBreakpoint() — never in StyleSheet.create
- Expo Router v4 file-based routing with _layout.tsx per route group
- FlatList on web: flexGrow:1, flexBasis:0 + key={numColumns}
- Supabase RLS enforces access control — `visibility = 'public'` already in SELECT policy

### Integration Points
- `app/(public)/_layout.tsx`: Stub Stack already exists — needs public nav header wrapper
- `app/(public)/index.tsx`: New — public browse screen
- `app/(public)/recipe/[id].tsx`: New — public recipe detail screen
- Root `app/_layout.tsx`: Already routes to (public)/, (auth)/, (tabs)/ groups
- Phase 13 will add AdMob to the ad slot placeholders on these screens

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 11-public-browsing*
*Context gathered: 2026-03-04*
