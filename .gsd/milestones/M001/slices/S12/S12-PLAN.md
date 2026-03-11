# S12: Remaining Screens

**Goal:** Rebuild auth screens (Login, Sign Up, Forgot Password) to match cookbook.
**Demo:** Rebuild auth screens (Login, Sign Up, Forgot Password) to match cookbook.

## Must-Haves


## Tasks

- [x] **T01: 12-remaining-screens 01** `est:4min`
  - Rebuild auth screens (Login, Sign Up, Forgot Password) to match cookbook.pen at all 3 breakpoints and add social OAuth login (Google, Apple, Facebook).

Purpose: Auth screens are the first impression for new users. Responsive layout + social login reduces signup friction for family-oriented app.
Output: Three responsive auth screens with social login buttons and a shared social-auth helper module.
- [x] **T02: 12-remaining-screens 02** `est:3min`
  - Rebuild collection screens (list, detail, create) to match cookbook.pen at all 3 breakpoints with responsive grids and token-based styling.

Purpose: Collections organize recipes into user-created groups. The screens need responsive layouts matching the design system.
Output: Three responsive collection screens using tokens, useBreakpoint, and RecipeCard grid on detail.
- [x] **T03: 12-remaining-screens 03** `est:4min`
  - Rebuild family management screens and invite screen to match cookbook.pen at all 3 breakpoints. Add native share sheet for invite links.

Purpose: Family management is core to the app's trust proposition. Invite flow must handle both existing and new users smoothly.
Output: Responsive family list, family detail with member management, and invite screen with share sheet.
- [x] **T04: 12-remaining-screens 04** `est:3min`
  - Rebuild scan upload and draft review screens to match cookbook.pen at all 3 breakpoints, with actual scan photo display and collapsible photo behavior on mobile.

Purpose: The scan-to-draft flow is a core product differentiator. The draft review must show the original photo alongside extracted fields for user verification.
Output: Responsive scan upload screen and draft review with real photo display (collapsible on mobile, side-by-side on tablet/web).
- [x] **T05: 12-remaining-screens 05** `est:2min`
  - Rebuild the Profile/Settings screen as a net-new responsive implementation matching cookbook.pen at all 3 breakpoints.

Purpose: Profile/Settings is a net-new screen (Phase 8 designed it in cookbook.pen). Current version (242 lines) has hardcoded styles and minimal functionality.
Output: Single scrollable settings page with avatar, display name editing, email display, unit preference, and logout.
- [x] **T06: 12-remaining-screens 06** `est:10min`
  - Fix two auth/session-related UAT failures: (1) scan upload "Not authenticated" blocker caused by getUser() server calls failing on expired tokens, and (2) iOS sign-out double render flash caused by competing navigation paths.

Purpose: Unblock scan-to-draft flow (blocker) and fix sign-out UX (cosmetic)
Output: Working scan auth + clean sign-out transition
- [x] **T07: 12-remaining-screens 07**
  - Fix collections routing (unreachable on all platforms) and signup button visibility. Collections screens exist but were never wired into navigation. Signup button blends into background.

Purpose: Make collections accessible (unblocks Tests 4, 5, 6) and improve auth UX (Test 2)
Output: Working collections navigation + visible signup prompt
- [x] **T08: 12-remaining-screens 08** `est:~1h`
  - Fix family detail page failures: iOS "Not Found" error (caused by PostgREST failing to resolve profiles join), web leave button silently failing (Alert.alert unreliable on React Native Web), missing DELETE RLS policy on families table, and create_family_invite RPC 404.

Purpose: Unblock family management (blocker, Tests 8 and 9)
Output: Working family detail with member list, leave/delete actions, and invite creation
- [x] **T09: 12-remaining-screens 09** `est:30min`
  - Fix forgot password flow (blocker -- edge function deployment) and unit preference reactivity (minor -- stale preference on recipe detail, missing conversion in cook mode).

Purpose: Unblock password reset (Test 3) and fix unit preference across recipe displays (Test 14)
Output: Working forgot password + reactive unit conversion
- [x] **T10: 12-remaining-screens 10** `est:20min`
  - Fix three UAT gaps: replace signup "Sign In Instead" bordered button with inline text link (Test 2), add web-compatible confirm dialogs to collection detail (Test 6), and configure Supabase Dashboard Site URL (Test 3). Also re-verify collections list on web after hard refresh (Test 7 — no code change needed).

Purpose: Close 4 UAT gaps (Tests 2, 3, 6, 7) with minimal targeted changes.
Output: Updated signup.tsx, collections/[id].tsx, and Supabase dashboard configuration.
- [x] **T11: 12-remaining-screens 11** `est:2min`
  - Fix two UAT blockers/majors: family invite RPC failure (Test 9, gen_random_bytes not found due to search_path missing extensions schema) and unit preference having no effect on legacy ingredients (Test 15, displayIngredient skips ingredients without structured amount/unit).

Purpose: Unblock family invite creation and make unit conversion work for all recipe data, including legacy recipes stored as plain text.
Output: Migration file for search_path fix, updated displayIngredient in both recipe detail and cook mode.
- [x] **T12: 12-remaining-screens 12** `est:8min`
  - Fix the scan draft race condition (UAT Test 11 — blocker). DraftReview currently queries the draft once on mount, but the draft row is created asynchronously by the edge function pipeline after the scan job is uploaded. Add a processing/waiting state that uses the existing subscribeToJob() function to wait for job completion before querying the draft.

Purpose: Eliminate "Draft not found" error that blocks all scan-to-draft flow (also unblocks Tests 12 and 13 which are skipped due to this).
Output: Updated DraftReview.tsx with job status subscription and waiting UI.

## Files Likely Touched

- `app/(auth)/login.tsx`
- `app/(auth)/signup.tsx`
- `app/(auth)/forgot-password.tsx`
- `src/features/auth/social-auth.ts`
- `app/(tabs)/collections/index.tsx`
- `app/(tabs)/collections/[id].tsx`
- `app/(tabs)/collections/create.tsx`
- `app/(tabs)/family/index.tsx`
- `app/(tabs)/family/[id].tsx`
- `app/(tabs)/invite/[token].tsx`
- `app/scan/index.tsx`
- `app/scan/draft/[id].tsx`
- `src/features/scans/DraftReview.tsx`
- `app/(tabs)/profile.tsx`
- `src/features/scan/scan-service.ts`
- `app/(tabs)/profile.tsx`
- `app/(auth)/logout.tsx`
- `app/(tabs)/_layout.tsx`
- `src/components/nav/WebSidebar.tsx`
- `app/(tabs)/recipes/index.tsx`
- `app/(auth)/login.tsx`
- `supabase/migrations/20260310000000_fix_family_memberships.sql`
- `app/(tabs)/family/[id].tsx`
- `app/(auth)/forgot-password.tsx`
- `app/(tabs)/recipes/[id].tsx`
- `app/(tabs)/recipes/[id]/cook.tsx`
- `app/(auth)/signup.tsx`
- `app/(tabs)/collections/[id].tsx`
- `supabase/migrations/20260310100000_fix_rpc_search_path.sql`
- `app/(tabs)/recipes/[id].tsx`
- `app/(tabs)/recipes/[id]/cook.tsx`
- `src/features/scans/DraftReview.tsx`
