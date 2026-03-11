# S10: Public Browsing

**Goal:** Create the data layer for public browsing: cursor-based pagination for public recipe search, author attribution via SECURITY DEFINER RPCs, and unit tests for both.
**Demo:** Create the data layer for public browsing: cursor-based pagination for public recipe search, author attribution via SECURITY DEFINER RPCs, and unit tests for both.

## Must-Haves


## Tasks

- [x] **T01: 11-public-browsing 01** `est:3min`
  - Create the data layer for public browsing: cursor-based pagination for public recipe search, author attribution via SECURITY DEFINER RPCs, and unit tests for both.

Purpose: Public screens need paginated recipe fetching (anon callers via existing RLS) and author display_name access (blocked by profiles RLS without RPC bypass). This is the foundation for both browse and detail screens.

Output: Migration SQL, `public.ts` module, extended `search.ts`, and unit tests.
- [x] **T02: 11-public-browsing 02** `est:3min`
  - Build the shared UI components for public screens: navigation header (3 breakpoints, 2 variants), search bar, and platform-branched ad slot placeholder.

Purpose: Both the public browse and detail screens need the navigation header. Building these as shared components avoids duplication and establishes the public chrome that distinguishes unauthenticated views from the authenticated app.

Output: PublicNavHeader (with browse and detail variants), PublicSearchBar, AdSlot (platform-branched placeholders), and PublicNavHeader unit tests.
- [x] **T03: 11-public-browsing 03** `est:3min`
  - Build the public recipe browse screen with search, filter chips, infinite scroll pagination, and breakpoint-responsive layout (mobile list rows, tablet 2-col grid, web 4-col grid).

Purpose: This is the primary entry point for unauthenticated users to discover public recipes. It drives the organic discovery funnel and will be the ad-supported surface in Phase 13.

Output: `app/(public)/index.tsx` — complete public browse screen.
- [x] **T04: 11-public-browsing 04** `est:15min`
  - Build the public recipe detail screen with read-only view, author attribution, ingredient truncation, sign-up CTA, and breakpoint-responsive layout (single column mobile/tablet, two-column web).

Purpose: This is where the organic discovery funnel converts — users read a recipe and see the "Want to save this recipe?" CTA. The read-only view must be complete enough to be useful (users can actually cook from it) while clearly showing they cannot save, rate, or comment without an account.

Output: `app/(public)/recipe/[id].tsx` — complete public recipe detail screen.

## Files Likely Touched

- `supabase/migrations/20260305000000_public_author_rpc.sql`
- `src/features/recipes/public.ts`
- `src/features/recipes/search.ts`
- `src/features/recipes/__tests__/searchPublicRecipes.test.ts`
- `src/features/recipes/__tests__/publicRecipes.test.ts`
- `src/components/public/PublicNavHeader.tsx`
- `src/components/public/PublicSearchBar.tsx`
- `src/components/public/__tests__/PublicNavHeader.test.ts`
- `src/components/public/AdSlot.native.tsx`
- `src/components/public/AdSlot.web.tsx`
- `app/(public)/index.tsx`
- `app/(public)/recipe/[id].tsx`
