# T01: 08-home-navigation-photo-polish 01

**Slice:** S07 — **Milestone:** M001

## Description

Create the design token system and responsive breakpoint hook that every subsequent phase will import.

Purpose: Phases 9-13 all depend on consistent design tokens and breakpoint detection. These primitives must exist first.
Output: `src/lib/tokens.ts` with all cookbook.pen design variables as TypeScript constants, and `src/lib/hooks/useBreakpoint.ts` returning the current breakpoint. Both fully tested.

## Must-Haves

- [ ] "Any screen can import design tokens from @/lib/tokens and use them in styles"
- [ ] "useBreakpoint() returns 'mobile' for widths under 640px"
- [ ] "useBreakpoint() returns 'tablet' for widths 640-1279px"
- [ ] "useBreakpoint() returns 'web' for widths 1280px and above"
- [ ] "All 24 cookbook.pen $ variables are represented as TypeScript constants"
- [ ] "Font size scale (xs through 3xl) and shadow tokens (sm, md, lg) exist"

## Files

- `src/lib/tokens.ts`
- `src/lib/__tests__/tokens.test.ts`
- `src/lib/hooks/useBreakpoint.ts`
- `src/lib/hooks/__tests__/useBreakpoint.test.ts`
