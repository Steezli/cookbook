# S07: Home Navigation Photo Polish

**Goal:** Create the design token system and responsive breakpoint hook that every subsequent phase will import.
**Demo:** Create the design token system and responsive breakpoint hook that every subsequent phase will import.

## Must-Haves


## Tasks

- [x] **T01: 08-home-navigation-photo-polish 01** `est:3min`
  - Create the design token system and responsive breakpoint hook that every subsequent phase will import.

Purpose: Phases 9-13 all depend on consistent design tokens and breakpoint detection. These primitives must exist first.
Output: `src/lib/tokens.ts` with all cookbook.pen design variables as TypeScript constants, and `src/lib/hooks/useBreakpoint.ts` returning the current breakpoint. Both fully tested.
- [x] **T02: 08-home-navigation-photo-polish 02** `est:2min`
  - Install Google Fonts packages and integrate font loading into the root layout so all screens render with Bricolage Grotesque and DM Sans.

Purpose: Every screen in Phases 9-13 uses these fonts. Loading must happen once at the root before any screen renders.
Output: Updated `app/_layout.tsx` with font loading and splash screen hold. New font packages in `package.json`.
- [x] **T03: 08-home-navigation-photo-polish 03** `est:manual`
  - Create the 5 missing screen designs in cookbook.pen so Phase 12 has complete design specs to implement against.

Purpose: Phase 12 (Remaining Screens) cannot rebuild auth, profile, invite, or draft review screens without designs at all 3 breakpoints. These designs must exist before Phase 12 begins.
Output: cookbook.pen updated with Sign Up, Forgot Password, Profile/Settings, Invite, and Draft Review screen designs at mobile (390px), tablet (768px), and web (1440px) breakpoints.

## Files Likely Touched

- `src/lib/tokens.ts`
- `src/lib/__tests__/tokens.test.ts`
- `src/lib/hooks/useBreakpoint.ts`
- `src/lib/hooks/__tests__/useBreakpoint.test.ts`
- `app/_layout.tsx`
- `package.json`
- `cookbook.pen`
