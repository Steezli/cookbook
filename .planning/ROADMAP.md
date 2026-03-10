# Roadmap: Cookbook (Family Recipe Vault)

**Created:** 2026-02-02

## Milestones

- ✅ **v1.0 MVP** — Phases 1-4, 6-7 (shipped 2026-03-04)
- 🚧 **v1.1 Design & Responsive** — Phases 8-13 (in progress)

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1-4, 6-7) — SHIPPED 2026-03-04</summary>

- [x] Phase 1: Foundation (3 plans) — completed 2026-02-03
- [x] Phase 2: Recipe Core (7 plans) — completed 2026-02-04
- [x] Phase 3: Scan to Draft (7 plans) — completed 2026-02-06
- [x] Phase 4: Trust + Collaboration (6 plans) — completed 2026-02-07
- [x] Phase 6: Fix Scan Integration (7 plans) — completed 2026-03-02
- [x] Phase 7: Native Compatibility (3 plans) — completed 2026-03-04

See `.planning/milestones/v1.0-ROADMAP.md` for full details.

</details>

### 🚧 v1.1 Design & Responsive (In Progress)

**Milestone Goal:** Rebuild all screens to match cookbook.pen designs across mobile/tablet/web, complete missing screen designs, ship public recipe browsing, and add monetization hooks (ads on public screens).

- [ ] **Phase 8: Design Foundation** — Design tokens, breakpoint hook, font loading, and missing .pen screen designs
- [x] **Phase 9: Navigation Restructure** — Convert flat Stack to Tabs route group with adaptive nav (mobile tabs, tablet header, web sidebar); UAT gap closure in progress (completed 2026-03-04)
- [ ] **Phase 10: Core Screens** — Home dashboard, recipe list with photo thumbnails, recipe detail, and create/edit screens rebuilt to spec; UAT gap closure in progress
- [x] **Phase 11: Public Browsing** — Unauthenticated recipe browse and detail in a separate (public)/ route group (completed 2026-03-08)
- [x] **Phase 11.1: Audit Cleanup** — Token hygiene, font token gaps, stale comments, doc fixes from v1.1 milestone audit (completed 2026-03-08)
- [ ] **Phase 12: Remaining Screens** — Collections, family, scan/draft, auth, profile/settings, and invite screens rebuilt to spec; UAT gap closure in progress
- [ ] **Phase 13: Advertising** — AdMob banner integration on public screens, ATT permission prompt, platform-branched ad components

## Phase Details

### Phase 8: Design Foundation
**Goal**: The design system primitives exist and are usable by all subsequent phases — tokens, breakpoint detection, fonts, and every missing screen design.
**Depends on**: Phase 7 (v1.0 complete)
**Requirements**: DESIGN-01, DESIGN-02, DESIGN-03, DESIGN-04
**Success Criteria** (what must be TRUE):
  1. A `tokens.ts` file exists with all cookbook.pen `$` variables as TypeScript constants and is importable from any screen
  2. A `useBreakpoint()` hook returns `mobile`, `tablet`, or `web` correctly on all platforms (native devices by screen size, web by window resize)
  3. Bricolage Grotesque and DM Sans fonts load via `@expo-google-fonts` and render without fallback on first paint
  4. cookbook.pen contains designed layouts (all 3 breakpoints) for Sign Up, Forgot Password, Profile/Settings, Invite, and Draft Review screens
**Plans:** 3 plans

Plans:
- [ ] 08-01-PLAN.md — Design tokens and breakpoint hook (TDD)
- [ ] 08-02-PLAN.md — Font loading integration
- [ ] 08-03-PLAN.md — Missing screen designs in cookbook.pen

### Phase 9: Navigation Restructure
**Goal**: The app's root navigation is converted from a flat Stack to a Tabs route group with breakpoint-aware adaptive nav, and all existing screens remain accessible in their new file locations.
**Depends on**: Phase 8
**Requirements**: NAV-01, NAV-02, NAV-03, NAV-04, NAV-05
**Success Criteria** (what must be TRUE):
  1. Authenticated users land on the Home tab after login and can reach all five tab destinations on mobile (Home, Search, Scan, Favorites, Profile)
  2. On a web-width viewport, the bottom tab bar is replaced by a 260px fixed left sidebar matching the cookbook.pen spec
  3. On a tablet-width viewport, the tab bar is replaced by a header navigation matching the cookbook.pen spec
  4. A `PageContainer` component wraps every screen, applying consistent max-width and horizontal padding per breakpoint
  5. No existing screen is broken or unreachable after the route group restructure
**Plans:** 4/4 plans complete

Plans:
- [x] 09-01-PLAN.md — PageContainer, nav types, lucide install, jest config
- [x] 09-02-PLAN.md — Route group restructure and tabs layout
- [x] 09-03-PLAN.md — Nav chrome components (tab bar, sidebar) and wiring
- [ ] 09-04-PLAN.md — UAT gap closure: tab bar spacing, scan icon color, sidebar routing

### Phase 10: Core Screens
**Goal**: Home, recipe list, recipe detail, create/edit screens, and cooking mode walkthrough match cookbook.pen at all three breakpoints.
**Depends on**: Phase 9
**Requirements**: SCREEN-01, SCREEN-02, SCREEN-03, SCREEN-04, SCREEN-04a
**Success Criteria** (what must be TRUE):
  1. The home screen displays a greeting, search entry point, featured recipes, and recent recipes per cookbook.pen spec
  2. The recipe list displays photo thumbnails and adapts to a 1-column (mobile), 2-column (tablet), and 3-column (web) grid
  3. The recipe detail screen renders correctly at all three breakpoints with ratings, comments, and cookbook.pen layout
  4. Create and edit recipe forms render correctly at all three breakpoints with consistent field layout and max-width on web
  5. Cooking mode displays one step at a time with per-step ingredients, progress bar, and previous/next navigation
**Plans:** 8 plans

Plans:
- [ ] 10-00-PLAN.md — Wave 0: TDD test stubs + utility modules for RecipeCard and Cooking Mode
- [ ] 10-01-PLAN.md — RecipeCard component + Home screen rebuild
- [x] 10-02-PLAN.md — Recipe detail screen rebuild
- [ ] 10-03-PLAN.md — Recipe list with responsive grid
- [ ] 10-04-PLAN.md — Create/Edit forms with shared RecipeForm component
- [ ] 10-05-PLAN.md — Cooking Mode walkthrough screen
- [ ] 10-06-PLAN.md — UAT gap closure: Stack navigators for recipes and collections tabs
- [ ] 10-07-PLAN.md — UAT gap closure: safe area insets on recipe detail and cooking mode

### Phase 11: Public Browsing
**Goal**: Unauthenticated users can browse and read public recipes without logging in, and every public recipe shows who added it.
**Depends on**: Phase 9
**Requirements**: PUB-01, PUB-02, PUB-03, PUB-04
**Success Criteria** (what must be TRUE):
  1. A user who has never logged in can open the app and browse public recipes using a search bar and filter chips
  2. Tapping a public recipe shows a read-only detail view with the recipe author's display name (not raw email)
  3. The public browsing surface has its own navigation header (logo, Sign In, and Get Started CTA) — no authenticated chrome appears
  4. The recipe list loads the next page of results when the user scrolls to the bottom (cursor-based pagination)
**Plans:** 4/4 plans complete

Plans:
- [ ] 11-01-PLAN.md — Data layer: author RPCs, searchPublicRecipes with cursor pagination
- [ ] 11-02-PLAN.md — Shared components: PublicNavHeader, PublicSearchBar, AdSlot placeholder
- [ ] 11-03-PLAN.md — Public browse screen with search, filters, infinite scroll
- [ ] 11-04-PLAN.md — Public recipe detail screen with author attribution and sign-up CTA

### Phase 11.1: Audit Cleanup
**Goal**: All tech debt and documentation gaps from the v1.1 milestone audit are resolved — no hardcoded colors bypass tokens, no raw font strings bypass the token system, stale comments and type assertions are cleaned up, and REQUIREMENTS.md reflects verified reality.
**Depends on**: Phase 11
**Requirements**: None (tech debt closure, no new requirements)
**Gap Closure**: Closes tech debt from v1.1-MILESTONE-AUDIT.md
**Success Criteria** (what must be TRUE):
  1. Zero hardcoded hex color values in Phase 10/11 screen files — all use token imports
  2. A `fontFamilyDisplayBold` token exists in `tokens.ts` and all raw `'BricolageGrotesque_700Bold'` strings are replaced with it
  3. Stale comment in `(tabs)/_layout.tsx` is corrected
  4. The `as any` type assertion in `(public)/index.tsx` is removed (typed route exists)
  5. `MobileTabBar` and `WebSidebar` use the same router method for scan navigation
  6. REQUIREMENTS.md DESIGN-04 checkbox shows `[x]`, SCREEN-04a row exists in traceability table
**Plans:** 2/2 plans complete

Plans:
- [ ] 11.1-01-PLAN.md — Token extraction: add fontFamilyDisplayBold, noPhotoBg, noPhotoIcon and update all consumer files
- [ ] 11.1-02-PLAN.md — Small fixes: stale comment, type assertion removal, scan nav unification

### Phase 12: Remaining Screens
**Goal**: All screens not covered in Phase 10 (collections, family, scan/draft, auth, profile/settings, invite) match cookbook.pen at all three breakpoints, including scan photo display in draft review.
**Depends on**: Phase 10
**Requirements**: SCREEN-05, SCREEN-06, SCREEN-07, SCREEN-08, SCREEN-09, SCREEN-10
**Success Criteria** (what must be TRUE):
  1. The collections list and detail screens render correctly at all three breakpoints matching cookbook.pen
  2. The family management screens render correctly at all three breakpoints matching cookbook.pen
  3. The scan upload and draft review screens render correctly at all three breakpoints, and the draft review screen displays the uploaded photo alongside the extracted draft
  4. Auth screens (Login, Sign Up, Forgot Password) render correctly at all three breakpoints matching cookbook.pen
  5. Profile/Settings and Invite screens are implemented (these are net-new screens) and match cookbook.pen at all three breakpoints
**Plans:** 9 plans (5 complete + 4 UAT gap closure)

Plans:
- [x] 12-01-PLAN.md — Auth screens rebuild with social OAuth (Google, Apple, Facebook)
- [x] 12-02-PLAN.md — Collections screens rebuild (list, detail, create)
- [x] 12-03-PLAN.md — Family management and invite screens rebuild
- [x] 12-04-PLAN.md — Scan upload and draft review with photo display
- [x] 12-05-PLAN.md — Profile/Settings screen rebuild
- [ ] 12-06-PLAN.md — UAT gap closure: scan auth fix + sign-out flash
- [ ] 12-07-PLAN.md — UAT gap closure: collections routing + signup button visibility
- [ ] 12-08-PLAN.md — UAT gap closure: family detail FK, RLS, web confirm dialogs
- [ ] 12-09-PLAN.md — UAT gap closure: forgot password deploy + unit preference reactivity

### Phase 13: Advertising
**Goal**: Ad banners appear on public browsing screens only, the AdMob SDK is isolated from the web build, and iOS users are prompted for ad tracking permission.
**Depends on**: Phase 11
**Requirements**: ADS-01, ADS-02, ADS-03
**Success Criteria** (what must be TRUE):
  1. An ad banner renders on the public recipe list and detail screens on iOS and Android (320x50 mobile, 728x90 tablet)
  2. No ad component appears on any authenticated screen — logged-in users never see ads
  3. All platform builds succeed (`expo export --platform web`, iOS, Android) without errors from AdMob SDK isolation
  4. On iOS, the ATT permission prompt appears before the first ad request and the app handles both allow and deny gracefully
**Plans**: TBD

## Progress

| Phase | Milestone | Plans | Status | Completed |
|-------|-----------|-------|--------|-----------|
| 1. Foundation | v1.0 | 3/3 | Complete | 2026-02-03 |
| 2. Recipe Core | v1.0 | 7/7 | Complete | 2026-02-04 |
| 3. Scan to Draft | v1.0 | 7/7 | Complete | 2026-02-06 |
| 4. Trust + Collaboration | v1.0 | 6/6 | Complete | 2026-02-07 |
| 6. Fix Scan Integration | v1.0 | 7/7 | Complete | 2026-03-02 |
| 7. Native Compatibility | v1.0 | 3/3 | Complete | 2026-03-04 |
| 8. Design Foundation | v1.1 | 2/3 | In Progress | - |
| 9. Navigation Restructure | v1.1 | 4/4 | Complete | 2026-03-04 |
| 10. Core Screens | v1.1 | 7/8 | UAT gap closure | - |
| 11. Public Browsing | v1.1 | 4/4 | Complete | 2026-03-08 |
| 11.1 Audit Cleanup | v1.1 | 2/2 | Complete | 2026-03-08 |
| 12. Remaining Screens | v1.1 | 5/9 | UAT gap closure | - |
| 13. Advertising | v1.1 | 0/TBD | Not started | - |
