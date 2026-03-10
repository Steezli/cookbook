---
gsd_state_version: 1.0
milestone: v1.1
milestone_name: Design & Responsive
status: completed
last_updated: "2026-03-10T00:20:00.000Z"
last_activity: 2026-03-10 — 12-09 Task 1 complete (unit preference reactivity + cook mode conversion); Task 2 awaiting human action (deploy reset-request edge function)
progress:
  total_phases: 7
  completed_phases: 6
  total_plans: 30
  completed_plans: 30
  percent: 100
---

# Project State

**Initialized:** 2026-02-02

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-03)

**Core value:** Families can save and share treasured recipes (like Grandma's) without losing control over who gets to see them.
**Current focus:** Phase 12 — Remaining Screens

## Current Position

Phase: 12 (Remaining Screens)
Plan: 9 (gap closure) — 12-09 Task 1 complete; Task 2 is human-action checkpoint
Status: 12-09 Task 1 complete — unit preference reactivity fixed in recipe detail and cook mode; awaiting edge function deployment (Task 2)
Last activity: 2026-03-10 — 12-09 moved getUnitPreference into useFocusEffect; added displayIngredient to cook mode

Progress: [██████████] 100%

## Pending TODOs

- **Email Verification UX** (AUTH enhancement)
  - Feature request: `.planning/features/email-verification-ux-improvements.md`
  - Impact: High (affects all new signups)
  - Effort: Low-Medium (~2-3 hours)
  - Queued for: v1.1 polish or post-v1.1

- **Multi-photo migration deployment**
  - Apply `supabase/migrations/20260206000000_add_multi_photo_support.sql` to remote Supabase
  - Required before multi-image upload works in production

## Accumulated Context

### From v1.0

- Privacy is the product. Treat access control as test-worthy, not "UI-only."
- Scanning is draft-first: users must be able to fix any extracted field quickly.
- Ads must never pollute family/private flows; public browsing is the only ad surface.
- **Deployment reminder:** Always apply database migrations to remote Supabase after local testing/verification.
- Tailwind CSS is NOT available in React Native — use inline style objects
- position:fixed does not work in React Native — use Modal component
- Expo Router for navigation, typed routes
- Supabase RLS enforces all access control server-side

### Phase 8 Decisions

- **08-01 Token naming:** Flat-with-category-prefix (accentBlue, bgCard, radiusMd) over nested objects — ergonomic for StyleSheet.create, no destructuring overhead
- **08-01 Breakpoint hook:** Pure getBreakpoint(width) extracted from hook for Jest node-environment testability; react-native mocked in test file
- **08-02 Font loading:** `useFonts` from `expo-font` directly (single call) rather than per-package hooks; loads BricolageGrotesque 400/600/700 + DMSans 400/500/700 at app root via `app/_layout.tsx`
- **Splash screen pattern:** `SplashScreen.preventAutoHideAsync()` at module level + `return null` guard + `hideAsync()` in `useEffect` — prevents FOUT; graceful degradation on font error

### Phase 10 Decisions

- **10-00 Pure utility module pattern:** Extract pure logic into *Utils.ts files alongside their feature — no React imports, no side effects — so tests run in node jest environment without renderer. Plans 01 and 05 import from these modules rather than inlining the logic.
- **10-00 formatMetadataLine separator:** Uses ' . ' (space-dot-space) between time and servings parts, matching cookbook.pen spec.
- **10-00 getCookingProgress step-complete semantics:** (currentStepIndex + 1) / totalSteps — current step is treated as already completed, so step 0 of 5 = 20% (not 0%).
- **10-02 Sticky header above ScrollView:** React Native has no position:fixed; placing header View above ScrollView at same flex level achieves identical sticky-while-scrolling behavior correctly
- **10-02 noPhotoBg '#E8E0D8' local constant:** ~~Spec-prescribed placeholder color not in tokens.ts; defined as local constant rather than adding to shared tokens~~ **Superseded by 11.1-01:** noPhotoBg and noPhotoIcon now proper tokens in tokens.ts
- **10-01 RecipeCard no-photo state:** #E8E0D8 warm placeholder + UtensilsCrossed icon (size 32, #8B7355) per cookbook.pen spec
- **10-01 Home screen batch thumbnails:** All recipe IDs passed to getRecipeThumbnailUrlMap before render — not fetched per-card in renderItem
- **10-01 Home screen FlatList pattern:** Featured horizontal (220px fixed cards); recent vertical grid with numColumns + key={numColumns}; columnWrapperStyle only when numColumns > 1
- **10-05 Cooking mode is a dedicated route:** [id]/cook.tsx is a plain Expo Router route (not Modal or overlay) — exits via router.back() to recipe detail, clean navigation.
- **10-05 Full ingredient list on every step:** RecipeStep has no per-step ingredient assignment, so all ingredients shown on every step per CONTEXT.md discretion decision.
- **10-05 Percentage-based progress bar:** width as template literal `${percent}%` avoids Dimensions.get per project constraint (dimension-sensitive styles must come from useBreakpoint).
- **10-04 PendingPhoto type:** extends { uri, name, type } to match uploadRecipePhoto's existing file-object signature; onSubmit receives (input: CreateRecipeInput, newPhotos: PendingPhoto[]) so wrappers can upload photos after create/update with correct recipeId
- **10-04 parseIngredient at add-time:** Called immediately when ingredient is added (single-add or bulk), skipping the old confirm/dismiss UX — simpler flow, data still stored correctly
- **10-04 RecipeForm as shared component:** create.tsx reduced from 574 to 37 lines, edit.tsx from 687 to 92 lines; wrapper screens own submit side-effects, RecipeForm owns form state only
- **10-03 Filter toggle as pill chip:** Small pill-shaped toggle button opens collapsible filter panel; keeps header clean and avoids always-visible clutter
- **10-03 isFiltered flag for empty state:** "No recipes found" when any search/filter is active; "No recipes yet" + Create CTA only when user has no recipes and no filters applied
- **10-03 Stale-while-loading for filter queries:** Initial load shows ActivityIndicator; filter re-queries show stale data while fetching — prevents empty state flash on every keystroke
- **10-06 Stack layouts use headerShown:false:** recipe and collections screens manage their own custom header UI; showing expo-router's default header would produce a duplicate header — minimal Stack with no screen-specific options is all that is needed

### Phase 9 Decisions

- **09-01 tsx test config:** ts-jest transform with `jsx: 'react'` override — tsconfig extends expo/tsconfig.base (jsx: react-native) which requires a native renderer; for node environment testing pure functions, jsx:react compiles to React.createElement without renderer
- **09-01 react-native mock:** `__mocks__/react-native.js` stub mapped via moduleNameMapper in jest.config.js — applies globally to all nav component tests without per-file jest.mock() calls
- **09-01 getContainerStyle exported:** Pure function extracted from PageContainer and exported for direct unit testing; no React renderer required, works in node jest environment
- **09-02 Hidden TabList pattern:** `height:0, overflow:hidden, position:absolute` registers all 5 tab routes with expo-router/ui without visible UI chrome — Plan 03 replaces inline placeholders with real MobileTabBar/WebSidebar
- **09-02 Route flattening:** `(family)/family/[id]` double-nesting flattened to `(tabs)/family/[id]`; (tabs) prefix stripped from URLs so `/family` resolves to the family tab; all internal links updated
- **09-03 Scan button as plain Pressable:** TabTrigger onPress behavior is ambiguous (override vs supplement tab-switch); plain Pressable calling router.push('/(scan)') is unambiguous per research recommendation
- **09-03 Collections as plain SidebarItem:** Not a registered tab route — TabTrigger without TabList entry would be undefined behavior; plain onPress + router.push('/collections') is correct
- **09-03 forwardRef pattern for nav components:** TabButton and SidebarItem use React.forwardRef<View, TabTriggerSlotProps & OwnProps> for expo-router/ui asChild compatibility; React.cloneElement passes {color, size} to lucide icon children
- **09-04 router.navigate() for cross-navigator routing on web:** router.push() silently fails for scan (root stack modal) and collections (non-tab route in tabs group) on web; router.navigate() resolves from root navigator on all platforms
- **09-04 flex:1 on TabTrigger wrappers:** TabTrigger elements default to shrink-wrap width; must add flex:1 to achieve even 5-way horizontal split in MobileTabBar
- **09-04 textDisabled for inactive Scan icon:** accentWarm on Camera icon caused Scan to appear permanently active; textDisabled matches other inactive tab icons

### Phase 11 Decisions

- **11-01 SECURITY DEFINER RPCs for author attribution:** profiles table is protected by RLS; anon callers access display_name via RPCs that join recipes (visibility='public' guard) with profiles, running as definer
- **11-01 pageSize+1 hasMore detection:** Fetch one extra row to detect if more pages exist without a separate count query — avoids extra round-trip for pagination
- **11-01 Initials derivation in SQL:** split_part on space, upper first chars, fallback 'U' — keeps logic server-side, consistent for both single and batch RPCs
- **11-02 Pure helper extraction for header logic:** getChipsForBreakpoint and getHeaderLayout tested in node environment without React renderer, following Phase 10 *Utils.ts pattern
- **11-02 Platform-branched AdSlot with identical placeholders:** structural split done now so Phase 13 can replace native file with AdMob SDK without touching web file or import paths
- **11-03 AdSlot.d.ts for platform-branched TypeScript resolution:** tsc cannot resolve modules with only .native.tsx/.web.tsx extensions; added .d.ts declaration file alongside platform files
- **11-03 loadSeqRef stale-result guard:** Increment counter on every filter/search change, check before setting state after async operations to prevent race conditions
- **11-04 AdSlot sidebar variant (300x250):** Web right column too narrow for 728x90 leaderboard; added 300x250 sidebar variant matching standard IAB medium rectangle
- **11-04 Root auth-aware router:** app/index.tsx checks Supabase session and redirects to (tabs) or (public), fixing post-login redirect ambiguity

### Phase 12 Decisions

- **12-02 Collection detail batch thumbnails:** getRecipeThumbnailUrlMap called before render with all recipe IDs, matching Home screen pattern from Phase 10
- **12-02 Remove-from-collection confirm dialog:** Alert.alert confirmation before removing a recipe from a collection for safety
- **12-04 Camera hidden on web:** Platform.OS check hides camera option on web since launchCameraAsync not supported
- **12-04 Animated scroll collapse for mobile photo:** scrollY.interpolate [0,200] -> [300,60] with useNativeDriver:false for height animation
- **12-04 Side-by-side 40/60 flex split:** Tablet/web draft review uses flex width split with borderRight separator instead of position:fixed
- **12-03 Share.share with clipboard fallback:** Native share sheet for invite links; on dismiss/failure falls back to expo-clipboard setStringAsync; on clipboard failure shows Alert with link text
- **12-03 Invite state machine:** Explicit InviteState union type (loading|valid|expired|accepted|invalid|success|error) for clear state transitions instead of multiple boolean flags
- **12-03 Confirmation alerts for destructive family actions:** Remove member, leave family, delete family all use Alert.alert with Cancel + destructive button
- **12-01 Social auth helper pattern:** Single module with per-provider functions (signInWithGoogle/Apple/Facebook), Apple uses native signInWithIdToken on iOS with OAuth fallback on other platforms
- **12-01 Auth layout headerShown:false:** Screens manage own branding (logo, title) per cookbook.pen full-screen designs
- **12-01 Signup adds Full Name + Confirm Password:** Fields added per cookbook.pen spec; display_name passed in signUp options.data
- **12-08 Double FK on family_memberships.user_id:** existing FK to auth.users kept for integrity; new FK to public.profiles(user_id) enables PostgREST profiles() embedded join (standard Supabase pattern)
- **12-08 confirmAction helper pattern:** Module-level function with Platform.OS branch — window.confirm on web, Alert.alert on native — for all destructive action dialogs in family detail
- **12-08 NOTIFY pgrst reload schema in migration:** Ensures create_family_invite RPC is visible to PostgREST without server restart after migration runs
- **12-09 useFocusEffect for unit preference sync:** getUnitPreference() placed inside useFocusEffect callback alongside recipe data load — unit changes on profile take effect immediately on next recipe navigation without duplicate fetches

### For v1.1

- All dimension-sensitive styles must be computed inside components from `useBreakpoint()` — NOT cached in `StyleSheet.create`
- `AdSlot` must be platform-branched (`AdSlot.native.tsx` / `AdSlot.web.tsx`) from the start — AdMob SDK breaks web build if imported directly
- 5 missing screen designs (Sign Up, Forgot Password, Profile/Settings, Invite, Draft Review) must exist in cookbook.pen **before** Phase 12 implementation begins
- `useEntitlement()` for scan gating must read from Supabase `profiles.scan_entitlement` — not a hardcoded route redirect (scan gating is a hypothesis, must be bypassable)
- FlatList inside flex containers on web: use `flexGrow: 1, flexBasis: 0` instead of `flex: 1`; set `key={numColumns}` when numColumns changes

### Blockers / Watch Items

- **Phase 13 (Advertising):** Verify AdMob config plugin behavior on Expo SDK 52 early in the phase — reported issues on SDK 54 but lower risk here; validate before full integration
- ~~**Phase 8 blocker (design):** Tablet nav pattern (768px) is ambiguous in cookbook.pen~~ — **Resolved** in 08-03 (tablet nav now consistent across all screens)

## Workflow Preferences

See: .planning/config.json

## Planning Artifacts

- Project: .planning/PROJECT.md
- Research: .planning/research/
- Requirements: .planning/REQUIREMENTS.md
- Roadmap: .planning/ROADMAP.md
- Design: cookbook.pen
