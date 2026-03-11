# T01: 11.1-audit-cleanup 01

**Slice:** S11 — **Milestone:** M001

## Description

Extract all hardcoded hex colors and raw font family strings into design tokens, then update every consumer file to import from tokens.ts.

Purpose: Eliminate tech debt flagged in v1.1 milestone audit -- all design values must flow through the token system established in Phase 8.
Output: Three new token exports (fontFamilyDisplayBold, noPhotoBg, noPhotoIcon) and seven consumer files updated to use them.

## Must-Haves

- [ ] "Zero hardcoded hex color values (#FFFFFF, #E8E0D8, #8B7355) in Phase 10/11 screen files"
- [ ] "A fontFamilyDisplayBold token exists in tokens.ts"
- [ ] "All raw BricolageGrotesque_700Bold strings replaced with fontFamilyDisplayBold import"
- [ ] "noPhotoBg and noPhotoIcon tokens exist and are used everywhere the placeholder colors appeared"

## Files

- `src/lib/tokens.ts`
- `app/(tabs)/index.tsx`
- `src/components/recipes/RecipeCard.tsx`
- `app/(public)/recipe/[id].tsx`
- `app/(public)/index.tsx`
- `app/(tabs)/recipes/[id].tsx`
- `src/components/public/PublicNavHeader.tsx`
