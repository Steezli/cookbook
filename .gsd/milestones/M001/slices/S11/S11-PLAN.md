# S11: Audit Cleanup

**Goal:** Extract all hardcoded hex colors and raw font family strings into design tokens, then update every consumer file to import from tokens.
**Demo:** Extract all hardcoded hex colors and raw font family strings into design tokens, then update every consumer file to import from tokens.

## Must-Haves


## Tasks

- [x] **T01: 11.1-audit-cleanup 01** `est:2min`
  - Extract all hardcoded hex colors and raw font family strings into design tokens, then update every consumer file to import from tokens.ts.

Purpose: Eliminate tech debt flagged in v1.1 milestone audit -- all design values must flow through the token system established in Phase 8.
Output: Three new token exports (fontFamilyDisplayBold, noPhotoBg, noPhotoIcon) and seven consumer files updated to use them.
- [x] **T02: 11.1-audit-cleanup 02** `est:1min`
  - Fix three small tech debt items from the v1.1 audit: correct a stale comment, remove an unnecessary type assertion, and unify scan navigation methods.

Purpose: Close remaining audit items that are independent of the token extraction work.
Output: Three files with targeted single-line fixes.

## Files Likely Touched

- `src/lib/tokens.ts`
- `app/(tabs)/index.tsx`
- `src/components/recipes/RecipeCard.tsx`
- `app/(public)/recipe/[id].tsx`
- `app/(public)/index.tsx`
- `app/(tabs)/recipes/[id].tsx`
- `src/components/public/PublicNavHeader.tsx`
- `app/(tabs)/_layout.tsx`
- `app/(public)/index.tsx`
- `src/components/nav/MobileTabBar.tsx`
