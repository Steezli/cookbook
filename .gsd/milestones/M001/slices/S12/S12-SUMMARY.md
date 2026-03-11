---
id: S12
parent: M001
milestone: M001
provides:
  - Signup screen shows "Already have an account? Sign In" as inline text link (not bordered button)
  - Collection detail remove/delete confirmations work on web via window.confirm
  - Supabase Dashboard Site URL updated for production forgot-password email links
  - Collections list verified accessible on web after hard refresh
  - Migration fixing search_path for create_family_invite and accept_family_invite to include extensions schema
  - parseIngredient fallback in displayIngredient on recipe detail screen
  - parseIngredient fallback in displayIngredient on cook mode screen
  - "DraftReview.tsx with race-condition fix using job status subscription"
  - "Processing waiting state shown while edge function completes scan job"
  - Responsive auth screens (login, signup, forgot-password) at all 3 breakpoints
  - Social OAuth helper (Google, Apple native on iOS, Facebook)
  - Auth layout with headerShown:false
  - Responsive collection list screen with grid layout
  - Responsive collection detail screen with RecipeCard grid and batch thumbnails
  - Responsive create collection form
  - Responsive family list screen with FlatList grid
  - Responsive family detail with member management, role badges, share sheet invite
  - Responsive invite acceptance screen with dual-path (auth/unauth) handling
  - Responsive scan upload screen with camera + library options
  - Draft review with actual photo display and collapsible mobile behavior
  - Side-by-side tablet/web layout for draft review
  - Responsive profile/settings screen with avatar, name editing, unit toggle, sign out
  - Scan auth check reads local session cache instead of making server-side JWT validation call
  - Sign-out has exactly one navigation path (reactive Redirect in _layout.tsx)
  - Migration adding FK from family_memberships to profiles enabling PostgREST embed join
  - DELETE RLS policy on families table for admin members
  - Web-compatible confirm dialogs in family detail (window.confirm on web, Alert.alert on native)
  - Null-safe profiles normalization in member refresh query
  - Unit preference refreshes on every recipe detail focus (not just session init)
  - Cook mode displays ingredients with unit conversion via displayAmount
  - reset-request edge function deployed and functional
  - Forgot password screen shows success state after submission
  - Reset password screen with success state, same-password detection, design token styling
requires: []
affects: []
key_files: []
key_decisions:
  - "confirmAction/showAlert pattern extended to collections: all Alert.alert calls in collections/[id].tsx replaced with web-compatible helpers"
  - "Signup Sign In link styled as inline text (accentWarm) matching login screen pattern — bordered ghost button removed"
  - "Supabase Dashboard Site URL updated manually (no code change) so forgot password reset links point to production URL"
  - "Display-time parseIngredient fallback: legacy ingredients lacking amount/unit fields are parsed on the fly using parseIngredient so unit conversions apply without re-ingesting data"
  - "search_path = public, extensions: both RPCs now find pgcrypto functions (gen_random_bytes, digest) in Supabase extensions schema"
  - "12-12 Subscribe-then-retry for draft race condition: attempt getDraftByJobId on mount; if null subscribe to job realtime; re-query on completed status rather than using the subscription payload directly (payload does not contain the draft)"
  - "12-12 60-second safety timeout: unsubscribes and shows user-friendly error if edge function takes unusually long"
  - "12-12 jobStatus state separate from loading: 'checking'|'processing'|'completed' drives different loading UI copy without extra boolean flags"
  - "Social auth helper as single module with per-provider functions and shared redirect URI"
  - "Apple uses native signInWithIdToken on iOS, OAuth fallback on other platforms"
  - "Auth layout headerShown:false since screens manage own branding per cookbook.pen"
  - "Signup adds Full Name and Confirm Password fields per cookbook.pen spec"
  - "Collection detail uses batch getRecipeThumbnailUrlMap before render, matching Home screen pattern"
  - "Remove-from-collection uses confirm dialog via Alert.alert for safety"
  - "Share.share with expo-clipboard fallback for invite link sharing"
  - "Invite screen uses state machine (loading/valid/expired/accepted/error/success) instead of simple boolean flags"
  - "Confirmation alerts on all destructive actions (remove member, leave family, delete family)"
  - "headerShown:false on family Stack layout per Phase 10 pattern"
  - "Camera hidden on web via Platform.OS check since launchCameraAsync not supported"
  - "Animated.Value scroll interpolation for mobile collapsible photo (300px to 60px, useNativeDriver: false for height)"
  - "Photo URLs resolved via getJobPhotos + getScanPhotoUrl from existing scan-service/scan-photos modules"
  - "Side-by-side layout uses 40/60 flex split with border separator instead of position:fixed"
  - "Used accentCoral for destructive sign-out styling since no textDanger token exists"
  - "Avatar is initials-only (no upload) per plan — future enhancement"
  - "PageContainer form variant provides max-width centering on tablet/web"
  - "12-06 getSession() in scan-service: getSession() reads locally cached session and auto-refreshes expired access tokens; getUser() makes a server call that fails when the access token is expired but session exists locally"
  - "12-06 Single sign-out navigation path: reactive Redirect in (tabs)/_layout.tsx is the sole navigation path on sign-out; explicit router.replace after signOut causes two rapid navigations on iOS producing a visible flash"
  - "Double FK on family_memberships.user_id: existing FK to auth.users kept for integrity; new FK to public.profiles enables PostgREST profiles() embedded join"
  - "confirmAction helper at module level: centralises Platform.OS branching for all destructive confirm dialogs in family detail"
  - "NOTIFY pgrst reload schema in migration: ensures PostgREST discovers create_family_invite RPC without server restart"
  - "Unit preference loaded in useFocusEffect (not standalone useEffect) so profile changes propagate immediately without restart"
  - "Cook mode mirrors [id].tsx displayIngredient pattern for consistent unit display"
  - "Forgot password shows 'may take a few minutes' note to set user expectations on email delivery"
  - "Reset password rebuilt with success state, same-password detection, and proper design tokens"
patterns_established:
  - "confirmAction pattern: any new screen with destructive confirmation dialogs should use the confirmAction/showAlert module-level helpers for web compatibility"
  - "Legacy ingredient display: check amount/unit === undefined, call parseIngredient, only convert if parsed result has non-null amount and unit and is not ambiguous"
  - "Subscribe-then-retry: try async query, if empty subscribe to realtime source-of-truth, re-query on completion event"
  - "Social auth helper pattern: per-provider exported function returning {data, error}"
  - "Auth screen responsive pattern: mobile=full-screen, tablet=centered card on bgCard, web=split hero+form"
  - "Collection grid follows same responsive numColumns pattern as Home screen recipe grid"
  - "Share sheet pattern: try Share.share, catch -> Clipboard.setStringAsync fallback"
  - "Invite state machine: explicit states for each invite lifecycle stage"
  - "Animated scroll collapse: scrollY.interpolate with clamp extrapolation for collapsible headers/images"
  - "Platform-branched upload: hide camera on web, show library-only with adjusted label"
  - "Inline edit pattern: text display with pencil icon toggles to TextInput with save/cancel"
  - "Segmented control: two Pressables with accentBlue active state for binary toggles"
  - "Service layer auth pattern: use getSession() not getUser() for auth checks in async service functions"
  - "confirmAction(title, message, onConfirm): reusable helper for Platform-aware confirm dialogs; apply same pattern to any new destructive actions"
  - "useFocusEffect for preference sync: any user preference that can change on profile should be re-fetched inside useFocusEffect, not only on session change"
observability_surfaces: []
drill_down_paths: []
duration: 30min
verification_result: passed
completed_at: 2026-03-10
blocker_discovered: false
---
# S12: Remaining Screens

**# Phase 12 Plan 10: Signup Link + Collections Web Alerts + Supabase Dashboard Config Summary**

## What Happened

# Phase 12 Plan 10: Signup Link + Collections Web Alerts + Supabase Dashboard Config Summary

**Replaced signup "Sign In Instead" bordered button with inline accentWarm text link; added web-compatible confirmAction/showAlert helpers to collections detail screen; user updated Supabase Dashboard Site URL for production reset emails**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-03-10T00:00:00Z
- **Completed:** 2026-03-10T00:20:00Z
- **Tasks:** 2 of 2 (all complete)
- **Files modified:** 2 (code) + Supabase Dashboard (manual)

## Accomplishments

- Replaced bordered ghost button on signup screen with inline "Already have an account? Sign In" text link using accentWarm color, matching the login screen's "Don't have an account? Sign Up" pattern
- Added `confirmAction` and `showAlert` module-level helpers to `collections/[id].tsx` with Platform.OS branch — window.confirm on web, Alert.alert on native
- Replaced all four `Alert.alert` call sites in collections detail: `handleRemoveRecipe`, `handleAddRecipe` catch, `handleDelete`, and `handleDelete` catch
- User updated Supabase Dashboard Site URL from localhost:3000 to production URL and configured redirect URLs with berven:// deep link scheme
- Collections list screen verified accessible on web in incognito (no code change needed — stale cache issue)

## Task Commits

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Signup text link + collection web-compatible alerts | cb89bfd | app/(auth)/signup.tsx, app/(tabs)/collections/[id].tsx |
| 2 | Update Supabase Dashboard Site URL | user action | Supabase Dashboard configuration |

## Files Created/Modified

- `app/(auth)/signup.tsx` - Replaced bordered "Sign In Instead" Pressable with inline text link (accentWarm, fontFamilyBodyBold, fontSize 14) inside a row View
- `app/(tabs)/collections/[id].tsx` - Added Platform import; added confirmAction/showAlert helpers; replaced all Alert.alert calls with web-compatible equivalents

## Decisions Made

- Inline text link pattern for cross-auth-screen navigation adopted consistently: login -> signup (Sign Up), signup -> login (Sign In) — both now use same accentWarm text link style
- confirmAction/showAlert pattern from 12-08 extended to collections — now standard pattern for all screens with destructive dialogs
- Supabase Dashboard update is a manual gate (no CLI/API path) — documented as human-action checkpoint, not a code deviation

## Deviations from Plan

None — plan executed exactly as written.

## Authentication Gate

Task 2 was a `checkpoint:human-action` gate requiring manual Supabase Dashboard configuration. The user updated the Site URL and configured redirect URLs including the `berven://` deep link scheme. Forgot password reset emails now link to the production URL.

## Next Phase Readiness

- UAT Tests 2, 3, 6, and 7 are resolved
- Signup and login screens now have consistent cross-navigation text link patterns
- All collection detail destructive actions work on web
- Forgot password flow links to correct production URL

---
*Phase: 12-remaining-screens*
*Completed: 2026-03-10*

# Phase 12 Plan 11: RPC Search Path Fix + Legacy Ingredient Unit Conversion Summary

**SQL migration fixes pgcrypto search_path for family invite RPCs; parseIngredient fallback enables unit preference to affect legacy plain-text ingredients on recipe detail and cook mode.**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-10T23:04:55Z
- **Completed:** 2026-03-10T23:06:16Z
- **Tasks:** 2 of 2 complete
- **Files modified:** 3

## Accomplishments

- Created migration `20260310100000_fix_rpc_search_path.sql` with ALTER FUNCTION...SET search_path = public, extensions for both RPCs, fixing the "gen_random_bytes does not exist" failure (UAT Test 9 blocker)
- Added `parseIngredient` import and legacy fallback to `displayIngredient` in recipe detail screen — legacy ingredients (no structured amount/unit) now parse text at display time and convert based on unit preference (UAT Test 15 major)
- Applied same fallback to cook mode `displayIngredient` so unit preference works consistently in both views
- TypeScript compiles cleanly

## Task Commits

Each task was committed atomically:

1. **Task 1: Migration for RPC search_path + parseIngredient fallback** - `ec8d753` (fix)
2. **Task 2: Deploy search_path migration to remote Supabase** - (manual deployment confirmed by user)

## Files Created/Modified

- `supabase/migrations/20260310100000_fix_rpc_search_path.sql` - ALTER FUNCTION search_path fix + NOTIFY pgrst reload schema
- `app/(tabs)/recipes/[id].tsx` - Added parseIngredient import; displayIngredient legacy fallback
- `app/(tabs)/recipes/[id]/cook.tsx` - Added parseIngredient import; displayIngredient legacy fallback

## Decisions Made

- Display-time parseIngredient fallback: parse legacy ingredient text at display time (not re-ingest) so unit conversion applies without data migration. Only converts if parsed result has non-null amount + unit and is not ambiguous — otherwise falls through to raw text display.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## Deployment

Migration deployed to remote Supabase (confirmed by user). Family invite RPC and legacy ingredient unit conversion are now live.

## Next Phase Readiness

- Once migration is deployed, UAT Tests 9 (family invite blocker) and 15 (unit preference major) should pass on re-test
- No code changes needed beyond the migration deployment

---
*Phase: 12-remaining-screens*
*Completed: 2026-03-10*

# Phase 12 Plan 12: Scan Draft Race Condition Fix Summary

**DraftReview now waits for edge function job completion via Supabase Realtime subscription before showing 'Draft not found', eliminating the UAT Test 11 blocker**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-03-10T20:15:00Z
- **Completed:** 2026-03-10T20:23:00Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Eliminated "Draft not found" error when navigating to DraftReview immediately after scan upload
- DraftReview now subscribes to scan_jobs realtime channel and waits up to 60 seconds for job completion
- Processing UI shows "Processing your scan..." with "This usually takes 10-30 seconds" hint
- Draft auto-loads as soon as job status transitions to 'completed'
- Proper cleanup: channel unsubscribed and timeout cleared on unmount or successful load

## Task Commits

Each task was committed atomically:

1. **Task 1: Add job status subscription and processing state to DraftReview** - `cd7f91f` (fix)

## Files Created/Modified
- `src/features/scans/DraftReview.tsx` - Added subscribeToJob import, jobStatus state, subscribe-then-retry logic, processing UI

## Decisions Made
- Subscribe-then-retry pattern: attempt getDraftByJobId on mount; if null, subscribe to realtime job updates; re-query draft on job.status === 'completed' (subscription payload is a ScanJob row, not the draft — must re-query getDraftByJobId)
- 60-second safety timeout prevents infinite waiting if edge function is unresponsive
- jobStatus state ('checking' | 'processing' | 'completed') drives informative loading copy without adding boolean flags

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- UAT Test 11 is unblocked: scan upload navigates to DraftReview, shows processing state, then loads draft when ready
- UAT Tests 12 and 13 (draft review layouts — mobile collapsible photo, tablet side-by-side) are also unblocked
- Phase 12 UAT round 2 can proceed with all scan flow tests

---
*Phase: 12-remaining-screens*
*Completed: 2026-03-10*

# Phase 12 Plan 01: Auth Screens Summary

**Responsive auth screens (login, signup, forgot-password) with social OAuth (Google/Apple/Facebook) matching cookbook.pen at all 3 breakpoints**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-08T22:46:02Z
- **Completed:** 2026-03-08T22:50:14Z
- **Tasks:** 2
- **Files modified:** 8 (including package.json/lock)

## Accomplishments
- Social auth helper module with Google, Apple (native iOS + OAuth fallback), and Facebook
- All three auth screens rebuilt with responsive layouts matching cookbook.pen exactly
- Login/Signup include social login buttons with loading states
- Forgot Password has success state showing confirmation after email sent
- All screens use tokens, useBreakpoint, Pressable, inline styles per project conventions

## Task Commits

Each task was committed atomically:

1. **Task 1: Install social auth dependencies and create social-auth helper** - `d9bdb65` (feat)
2. **Task 2: Rebuild auth screens with responsive layouts and social login** - `6db5659` (feat)

## Files Created/Modified
- `src/features/auth/social-auth.ts` - Social OAuth helper with signInWithGoogle/Apple/Facebook + isAppleNativeAvailable
- `app/(auth)/login.tsx` - Responsive login with email/password + social login buttons
- `app/(auth)/signup.tsx` - Responsive signup with Full Name, email, password, confirm password + social login
- `app/(auth)/forgot-password.tsx` - Responsive forgot password with success state
- `app/(auth)/_layout.tsx` - headerShown:false for full-screen auth layouts
- `package.json` - Added expo-auth-session, expo-apple-authentication, expo-web-browser, expo-crypto

## Decisions Made
- Social auth as single helper module with per-provider functions returning Supabase {data, error} shape
- Apple authentication uses native signInWithIdToken on iOS for best UX, falls back to OAuth on other platforms
- Auth layout hides default header since all screens have their own branding per cookbook.pen
- Signup screen now includes Full Name and Confirm Password fields matching cookbook.pen (not in original code)
- Primary buttons use accentWarm + radiusPill; Secondary buttons use bgCard + borderDefault + radiusPill per pen components

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added confirm password validation**
- **Found during:** Task 2 (Signup screen)
- **Issue:** Original signup had no confirm password field; cookbook.pen shows it
- **Fix:** Added confirmPassword state, TextInput, and validation check before submit
- **Files modified:** app/(auth)/signup.tsx
- **Verification:** TypeScript passes, field renders correctly
- **Committed in:** 6db5659 (Task 2 commit)

**2. [Rule 2 - Missing Critical] Added Full Name field to signup**
- **Found during:** Task 2 (Signup screen)
- **Issue:** cookbook.pen shows Full Name field; original code only had email/password
- **Fix:** Added fullName state, TextInput, and pass display_name in signUp options.data
- **Files modified:** app/(auth)/signup.tsx
- **Verification:** TypeScript passes
- **Committed in:** 6db5659 (Task 2 commit)

**3. [Rule 1 - Bug] Auth layout header hiding**
- **Found during:** Task 2 (All screens)
- **Issue:** Auth layout showed "Account" header title, conflicting with full-screen pen designs
- **Fix:** Changed headerTitle to headerShown:false
- **Files modified:** app/(auth)/_layout.tsx
- **Committed in:** 6db5659 (Task 2 commit)

---

**Total deviations:** 3 auto-fixed (2 missing critical, 1 bug)
**Impact on plan:** All fixes necessary for cookbook.pen compliance and UX correctness. No scope creep.

## Issues Encountered
None

## User Setup Required

Social login requires OAuth provider configuration in Supabase dashboard:
- Enable Google OAuth provider and add client ID/secret (Supabase Dashboard -> Authentication -> Providers -> Google)
- Enable Apple OAuth provider and add service ID/key (Supabase Dashboard -> Authentication -> Providers -> Apple)
- Enable Facebook OAuth provider and add app ID/secret (Supabase Dashboard -> Authentication -> Providers -> Facebook)

Social login buttons will render and be tappable, but will fail with auth errors until providers are configured.

## Next Phase Readiness
- Auth screens complete, ready for remaining Phase 12 plans
- Social auth helper available for reuse if needed elsewhere
- No blockers for next plan

## Self-Check: PASSED

All files exist. All commits verified (d9bdb65, 6db5659).

---
*Phase: 12-remaining-screens*
*Completed: 2026-03-08*

# Phase 12 Plan 02: Collection Screens Summary

**Responsive collection screens (list, detail, create) with token-based styling, RecipeCard grid on detail, and batch thumbnail fetching**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-08T22:46:25Z
- **Completed:** 2026-03-08T22:48:59Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Collection list screen with responsive grid (1/2/3 columns), PageContainer, token-based styling
- Collection detail screen with RecipeCard grid and batch thumbnail fetching via getRecipeThumbnailUrlMap
- Create collection form with responsive layout (full-width mobile, max 600px tablet/web)
- All existing CRUD functionality preserved (add/remove recipes, delete collection, search-to-add)

## Task Commits

Each task was committed atomically:

1. **Task 1: Rebuild collection list and create screens** - `403ca33` (feat)
2. **Task 2: Rebuild collection detail with RecipeCard grid** - `468af00` (feat)

## Files Created/Modified
- `app/(tabs)/collections/index.tsx` - Responsive collection list with grid, empty state, loading
- `app/(tabs)/collections/[id].tsx` - Collection detail with RecipeCard grid, batch thumbnails, add/remove
- `app/(tabs)/collections/create.tsx` - Responsive create form with token-based inputs

## Decisions Made
- Collection detail fetches thumbnails via getRecipeThumbnailUrlMap in batch before render, consistent with Home screen pattern from Phase 10
- Remove-from-collection wrapped in Alert.alert confirm dialog for safety (plan mentioned confirm dialog)
- Newly added recipes also get their thumbnail fetched immediately after add

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Collection screens complete and responsive at all breakpoints
- Ready for remaining Phase 12 plans (family, auth, profile, etc.)

---
*Phase: 12-remaining-screens*
*Completed: 2026-03-08*

# Phase 12 Plan 03: Family & Invite Screens Summary

**Responsive family list/detail with avatar initials, role badges, native share sheet invite, and dual-path invite acceptance screen**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-08T22:46:35Z
- **Completed:** 2026-03-08T22:50:28Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Family list rebuilt with PageContainer, FlatList grid (2-column on tablet/web), collapsible create form, empty state CTA
- Family detail rebuilt with avatar initials circles, role badges (admin green pill, member gray pill), Share.share for invite links with clipboard fallback, confirmation alerts for remove/leave/delete
- Invite screen rebuilt with centered card on tablet/web, dual-path handling (authenticated = direct join, unauthenticated = signup/login with token preserved in next param), state machine for invite lifecycle

## Task Commits

Each task was committed atomically:

1. **Task 1: Rebuild family list and family detail screens** - `bb02dfa` (feat)
2. **Task 2: Rebuild invite acceptance screen** - `c4d6667` (feat)

## Files Created/Modified
- `app/(tabs)/family/index.tsx` - Responsive family list with FlatList grid, create form, empty state
- `app/(tabs)/family/[id].tsx` - Family detail with members, roles, invite share sheet, admin controls
- `app/(tabs)/family/_layout.tsx` - headerShown:false per Phase 10 pattern
- `app/(tabs)/invite/[token].tsx` - Invite acceptance with centered card, dual-path auth handling

## Decisions Made
- **Share.share with clipboard fallback:** Share.share opens native share sheet; on failure (dismissed/unsupported), falls back to expo-clipboard setStringAsync; on clipboard failure, shows Alert with link text
- **Invite state machine:** Used explicit InviteState union type (loading|valid|expired|accepted|invalid|success|error) for clear state transitions instead of multiple boolean flags
- **Confirmation alerts for destructive actions:** Remove member, leave family, and delete family all use Alert.alert with Cancel/destructive buttons per platform conventions
- **headerShown:false on family layout:** Screens manage their own headers via PageContainer, matching Phase 10 pattern

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added confirmation alerts for destructive actions**
- **Found during:** Task 1 (Family detail rebuild)
- **Issue:** Original code had no confirmation for remove member, leave, or delete family - accidental taps could cause data loss
- **Fix:** Added Alert.alert with Cancel + destructive button for all three actions
- **Files modified:** app/(tabs)/family/[id].tsx
- **Verification:** TypeScript passes, destructive actions wrapped in confirmation
- **Committed in:** bb02dfa (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** Essential for preventing accidental destructive actions. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Family management screens complete with responsive layouts
- Invite flow handles both auth states correctly
- Share sheet pattern established for reuse in other sharing features

---
*Phase: 12-remaining-screens*
*Completed: 2026-03-08*

# Phase 12 Plan 04: Scan Upload and Draft Review Summary

**Responsive scan upload with camera/library options and draft review with actual photo display, collapsible on mobile and side-by-side on tablet/web**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-08T22:46:13Z
- **Completed:** 2026-03-08T22:49:45Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Rebuilt scan upload screen with full responsive treatment, design tokens, and camera/library upload options (camera hidden on web)
- Draft review now displays actual scan photos fetched via getJobPhotos instead of placeholder text
- Mobile draft review collapses photo from 300px to 60px thumbnail on scroll using Animated.Value interpolation
- Tablet/web draft review uses side-by-side layout with 40% photo panel and 60% fields panel

## Task Commits

Each task was committed atomically:

1. **Task 1: Rebuild scan upload screen** - `e7154f9` (feat)
2. **Task 2: Rebuild draft review with actual photo display and collapsible behavior** - `f8dfe7f` (feat)

## Files Created/Modified
- `app/scan/index.tsx` - Responsive scan upload with camera + library options, photo preview, upload progress
- `app/scan/draft/[id].tsx` - Route screen wrapped in PageContainer, toggles between DraftReview and DraftEditor
- `src/features/scans/DraftReview.tsx` - Draft review with actual photo display, collapsible mobile layout, side-by-side tablet/web layout

## Decisions Made
- Camera hidden on web via `Platform.OS === 'web'` check since `launchCameraAsync` is not supported on web (per research pitfall 7)
- Used `Animated.Value` with scroll interpolation (inputRange [0,200], outputRange [300,60]) for mobile collapsible photo; `useNativeDriver: false` required since height animation cannot use native driver
- Photo URLs resolved via existing `getJobPhotos(jobId)` from scan-service and `getScanPhotoUrl(storagePath)` from scan-photos, with fallback handling for already-resolved URLs
- Side-by-side layout uses flex 40/60 width split with borderRight separator, not position:fixed (which doesn't work in React Native)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Scan upload and draft review screens complete at all breakpoints
- Ready for remaining Phase 12 screens (plans 05)

---
*Phase: 12-remaining-screens*
*Completed: 2026-03-08*

# Phase 12 Plan 05: Profile/Settings Screen Summary

**Responsive profile screen with avatar initials, inline display name editing, unit preference toggle, and sign-out via Supabase**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-08T22:46:10Z
- **Completed:** 2026-03-08T22:48:01Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Full rebuild of profile.tsx from 242-line hardcoded screen to 527-line token-based responsive implementation
- Avatar section with initials derived from display name (first + last initial)
- Inline display name editing with save/cancel and Supabase persistence
- Unit preference segmented control (imperial/metric) with optimistic updates
- Sign out button with destructive styling redirecting to auth

## Task Commits

Each task was committed atomically:

1. **Task 1: Rebuild Profile/Settings screen** - `5875d68` (feat)

## Files Created/Modified
- `app/(tabs)/profile.tsx` - Complete responsive profile/settings screen with avatar, name editing, unit toggle, sign out

## Decisions Made
- Used `accentCoral` for sign-out button text since no `textDanger` token exists in tokens.ts — coral conveys destructive action
- Avatar is initials-only per plan guidance; no upload capability (profiles table may lack avatar_url column)
- Used `PageContainer` with `form` variant (maxWidth 600) instead of custom centering logic
- Profile data fetched via `supabase.from('profiles')` directly, reusing existing `getUnitPreference` API for unit pref
- `user_id` column used for profile queries (matching existing session.tsx ensureProfile pattern)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Profile screen complete with all planned functionality
- Avatar image upload can be added as future enhancement when profiles table supports avatar_url

---
*Phase: 12-remaining-screens*
*Completed: 2026-03-08*

# Phase 12 Plan 06: Auth/Session Fix Summary

**Scan upload auth fixed by reading local session cache (getSession) instead of server-side JWT validation (getUser), and iOS sign-out flash eliminated by removing duplicate explicit navigation alongside the existing reactive Redirect.**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-03-10T00:00:00Z
- **Completed:** 2026-03-10T00:10:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Replaced all 4 `getUser()` calls in scan-service.ts with `getSession()`, fixing "Not authenticated" errors when access tokens expire mid-session
- Removed `router.replace("/(auth)/login")` from `profile.tsx` handleSignOut — reactive Redirect in `_layout.tsx` already handles this, double navigation caused iOS flash
- Removed `router.replace("/")` from `logout.tsx` finally block for the same reason, and removed now-unused `router` imports from both files

## Task Commits

Each task was committed atomically:

1. **Task 1: Replace getUser() with getSession() in scan-service.ts** - `6ecdaab` (fix)
2. **Task 2: Fix sign-out double navigation flash on iOS** - `9e1555f` (fix)

## Files Created/Modified

- `src/features/scan/scan-service.ts` - All 4 getUser() calls replaced with getSession() pattern; user variable extracted from session.user for backward-compatible function bodies
- `app/(tabs)/profile.tsx` - Removed explicit router.replace to auth/login after signOut; removed now-unused router import
- `app/(auth)/logout.tsx` - Removed router.replace('/') from finally block; removed now-unused router import

## Decisions Made

- `getSession()` reads the locally cached session and auto-refreshes expired access tokens via the Supabase SDK; `getUser()` makes a network call that fails when the access token is expired even if a valid session exists locally
- The reactive `<Redirect href="/(auth)/login" />` in `(tabs)/_layout.tsx` is the correct single navigation path after sign-out; any additional explicit `router.replace` calls race with it and cause double navigation on iOS native, producing a visible flash

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Removed unused `router` import from profile.tsx and logout.tsx**
- **Found during:** Task 2 (Fix sign-out double navigation)
- **Issue:** After removing the explicit router.replace calls, the `router` import became unused — TypeScript would flag it and it's dead code
- **Fix:** Removed `import { router } from "expo-router"` from both files
- **Files modified:** app/(tabs)/profile.tsx, app/(auth)/logout.tsx
- **Verification:** TypeScript compiles cleanly with `npx tsc --noEmit`
- **Committed in:** 9e1555f (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical — unused import cleanup)
**Impact on plan:** Minor cleanup required by the planned change. No scope creep.

## Issues Encountered

None — both fixes applied cleanly.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Scan upload "Not authenticated" blocker resolved — scan-to-draft flow should work even after 1+ hour sessions
- iOS sign-out double flash resolved — clean single transition to login screen
- UAT gaps SCREEN-07 and SCREEN-09 closed
- Ready to proceed with remaining UAT gap closure plans (07, 08, 09)

---
*Phase: 12-remaining-screens*
*Completed: 2026-03-10*

# Phase 12 Plan 07: Collections Routing and Signup Visibility Summary

Collections routing wired via TabTrigger pattern on all platforms and signup prompt moved immediately below Sign In button using accentWarm text link.

## What Was Built

- **Collections tab route registered** in hidden TabList in `_layout.tsx` (added 5th entry: `name="collections" href="/collections"`)
- **WebSidebar Collections item** converted from plain `SidebarItem` with `router.navigate` to `TabTrigger asChild` pattern — enables proper active state
- **My Recipes screen** gains a "My Collections" Pressable row (Folder icon + ChevronRight) that navigates to collections on mobile — preserves 5-tab layout per cookbook.pen spec
- **Login screen** gains "Don't have an account? Sign Up" text link immediately after the Sign In button with `accentWarm` colored "Sign Up" text — old ghost Create Account button removed from page bottom

## Commits

| Hash | Message |
|------|---------|
| f87a758 | feat(12-07): wire collections into navigation on all platforms |
| c5571d1 | feat(12-07): improve signup visibility on login screen |

## Deviations from Plan

None - plan executed exactly as written.

## Success Criteria Verification

- [x] Collections screen reachable from web sidebar via TabTrigger (name="collections" asChild)
- [x] Collections screen reachable on mobile via My Recipes screen link (router.navigate('/collections'))
- [x] Mobile tab bar remains at 5 tabs — MobileTabBar.tsx unchanged
- [x] Signup prompt clearly visible on login screen — "Don't have an account? Sign Up" immediately after Sign In
- [x] All files compile without TypeScript errors (npx tsc --noEmit: no output)

# Phase 12 Plan 08: Family Detail Fix Summary

**PostgREST profiles join unblocked via second FK on family_memberships, DELETE RLS added on families, and all Alert.alert calls replaced with web-safe window.confirm/window.alert helpers in family detail**

## Performance

- **Duration:** ~1h
- **Completed:** 2026-03-10
- **Tasks:** 3 of 3 complete
- **Files modified:** 3

## Accomplishments

- Migration file created and deployed that adds FK to profiles, DELETE RLS policy on families, and schema cache reload NOTIFY
- All destructive confirmation dialogs in family detail now use `confirmAction` helper (window.confirm on web, Alert.alert on native)
- All remaining `Alert.alert` calls replaced with `showAlert` helper for full web compatibility
- Member profiles normalization made explicitly null-safe with empty-string fallbacks
- TypeScript compiles cleanly with no errors

## Task Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | a594aa6 | feat(12-08): add migration to fix family_memberships FK and families DELETE policy |
| 2 | 914ff6d | fix(12-08): web-compatible confirm dialogs and null-safe member profiles in family detail |
| 2 (extra fix) | 2a40647 | fix(12): web-compatible alerts in family detail, forgot password UX, reset password polish |
| 3 | (human) | Migration deployed to remote Supabase by user |

## Files Created/Modified

- `supabase/migrations/20260310000000_fix_family_memberships.sql` — Adds FK family_memberships->profiles, DELETE RLS on families, NOTIFY pgrst schema reload
- `app/(tabs)/family/[id].tsx` — confirmAction helper, showAlert helper, Platform import, null-safe member normalization; all Alert.alert calls replaced

## Decisions Made

- Used double FK pattern on `user_id`: existing FK to `auth.users` kept (referential integrity), new FK to `public.profiles` added (PostgREST embedding). Standard pattern for Supabase apps.
- `confirmAction` extracted as module-level helper rather than inline per call site — avoids code duplication across four confirmation dialogs.
- `NOTIFY pgrst, 'reload schema'` included in migration — ensures `create_family_invite` RPC is visible to PostgREST immediately after migration, no server restart needed.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing coverage] Replaced all remaining Alert.alert calls beyond confirmAction**
- **Found during:** Post-task 2 review
- **Issue:** commit 914ff6d applied `confirmAction` to the main confirm dialogs but additional `Alert.alert` call-sites remained in `family/[id].tsx`
- **Fix:** Introduced `showAlert` helper replacing ALL remaining `Alert.alert` uses in `family/[id].tsx` for complete web compatibility
- **Files modified:** `app/(tabs)/family/[id].tsx`, `app/(auth)/forgot-password.tsx`, `app/(auth)/reset-password.tsx`
- **Commit:** 2a40647

## Success Criteria

- [x] Family detail loads members with display names (after migration applied)
- [x] Leave/remove/delete confirmations work on web (window.confirm) and native (Alert.alert)
- [x] Admin can delete a family (DELETE RLS policy exists)
- [x] create_family_invite RPC is accessible (PostgREST schema cache reloaded via NOTIFY)

## Self-Check: PASSED

All files verified on disk. All task commits confirmed in git history.

---
*Phase: 12-remaining-screens*
*Completed: 2026-03-10*

# Phase 12 Plan 09: Unit Preference Reactivity + Forgot Password Summary

**Unit preference reloads on every recipe focus via useFocusEffect; cook mode renders ingredients with displayAmount conversion; reset-request edge function deployed; forgot password and reset password screens polished with success states**

## Performance

- **Duration:** ~30 min
- **Started:** 2026-03-10T00:00:00Z
- **Completed:** 2026-03-10T00:30:00Z
- **Tasks:** 2 of 2 (all complete)
- **Files modified:** 4

## Accomplishments

- Moved `getUnitPreference()` call into `useFocusEffect` in recipe detail screen — unit changes on profile now take effect immediately on next recipe navigation
- Removed stale `useEffect([session])` that only loaded unit preference once per session
- Added `displayAmount`, `getUnitPreference`, `unitPreference` state, and `displayIngredient` helper to cook.tsx
- Cook mode ingredient list now renders converted amounts instead of raw `ing.text`
- User deployed `reset-request` Supabase edge function — forgot password flow now submits successfully
- Updated `forgot-password.tsx` with "may take a few minutes" note in success state for email delivery expectations
- Rewrote `reset-password.tsx` with success state, same-password detection, and proper design token usage

## Task Commits

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Unit preference reactivity + cook mode conversion | f87a758 | app/(tabs)/recipes/[id].tsx, app/(tabs)/recipes/[id]/cook.tsx |
| 2 | Deploy reset-request edge function | user action | supabase edge function deployed |
| - | Forgot password UX + reset password polish | 2a40647 | app/(auth)/forgot-password.tsx, app/(auth)/reset-password.tsx |

## Files Created/Modified

- `app/(tabs)/recipes/[id].tsx` - getUnitPreference() moved into useFocusEffect; standalone useEffect removed
- `app/(tabs)/recipes/[id]/cook.tsx` - Added displayAmount import, unitPreference state, displayIngredient helper, replaced {ing.text} with {displayIngredient(ing)}
- `app/(auth)/forgot-password.tsx` - Added "may take a few minutes" delivery note to success state
- `app/(auth)/reset-password.tsx` - Rewrote with success state UI, same-password detection, proper design tokens

## Decisions Made

- Unit preference reloaded in useFocusEffect alongside recipe data — single callback, no duplicate network calls
- Cook mode uses identical displayIngredient logic as recipe detail for consistency
- Forgot password success state sets user expectations about email delivery timing
- Reset password rebuilt from scratch with complete success state rather than patching existing code

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Forgot password success state missing and reset password screen lacking polish**
- **Found during:** Task 2 (post edge function deployment)
- **Issue:** forgot-password.tsx lacked a "may take a few minutes" note; reset-password.tsx had no success state, no same-password detection, and used raw color values instead of design tokens
- **Fix:** Added delivery timing note to forgot-password success state; rewrote reset-password.tsx with success state, same-password detection, and design token styling
- **Files modified:** app/(auth)/forgot-password.tsx, app/(auth)/reset-password.tsx
- **Commit:** 2a40647

## Authentication Gate

Task 2 was a `checkpoint:human-action` gate requiring manual deployment of the Supabase edge function. The user deployed `reset-request` via `npx supabase functions deploy reset-request`. The forgot password flow now works end-to-end.

## Next Phase Readiness

- Unit conversion is reactive across recipe detail and cook mode
- Forgot password flow works after edge function deployment
- Reset password flow has complete success state and validation
- All 7 UAT gaps from the diagnostic are resolved
- Phase 12 is complete — ready for Phase 13 (Advertising) or v1.0 release prep

---
*Phase: 12-remaining-screens*
*Completed: 2026-03-10*
