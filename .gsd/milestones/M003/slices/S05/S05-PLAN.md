# S05: Full App Audit & Cross-Platform Verification

**Goal:** Every screen's error feedback works on web (Alert.alert replaced with cross-platform utility), remaining error handling gaps fixed, RecipeForm focus chaining completed, and all key flows verified on web + iOS simulator.
**Demo:** On web: trigger an error on any authenticated screen → user sees a visible alert/confirm dialog (not silently swallowed). RecipeForm title Enter key focuses description. On iOS simulator: app launches and key screens render without crashes.

## Must-Haves

- Shared cross-platform alert utility (`src/lib/alert.ts`) replacing all 41 raw `Alert.alert` calls across 17 files
- Home screen and recipes/index catch blocks surface error state instead of silently swallowing
- Cook mode error state shows user feedback when recipe load fails
- `collections/index.tsx` hardcoded error hex color replaced with token
- RecipeForm title → description focus chaining (QA-04 completion)
- Web verification of key flows (login, recipe browse, scan upload, collections, family, profile)
- iOS simulator verification of app launch and key screen rendering
- Final audit report documenting what was verified vs. what needs real device

## Proof Level

- This slice proves: integration (cross-platform error feedback works on web; error handling gaps fixed; flows exercised on both platforms)
- Real runtime required: yes (web dev server + iOS simulator)
- Human/UAT required: no (browser tools + mac-tools verification sufficient)

## Verification

- `rg 'Alert\.alert' app/ src/ --no-heading` returns zero matches (all replaced with cross-platform utility)
- `rg 'from.*@/lib/alert' app/ src/ -c` shows 17 files importing the shared utility
- `npx tsc --noEmit` exits 0
- `npx jest --ci` passes (499 tests baseline)
- `rg 'returnKeyType' src/components/recipes/RecipeForm.tsx` includes title field with `returnKeyType="next"`
- Web: dev server starts, login page loads, scan upload page renders
- iOS simulator: app launches without crash

## Observability / Diagnostics

- Runtime signals: `showAlert`/`confirmAction` provide visible user feedback on all platforms — no silent no-ops
- Inspection surfaces: `rg 'Alert\.alert'` detects any regressions; `rg 'from.*@/lib/alert'` confirms adoption
- Failure visibility: Error catch blocks now set state for UI display instead of silently swallowing
- Redaction constraints: none

## Integration Closure

- Upstream surfaces consumed: `showAlert`/`confirmAction` pattern from `app/(tabs)/family/[id].tsx` (S01 era), focus chaining pattern from `app/(auth)/login.tsx` (S02), design tokens from `src/lib/tokens.ts` (S03)
- New wiring introduced in this slice: `src/lib/alert.ts` shared utility imported by 17 files; error state additions in Home/recipes-index/cook-mode screens
- What remains before the milestone is truly usable end-to-end: nothing — this is the final slice of M003

## Tasks

- [x] **T01: Extract cross-platform alert utility and replace all Alert.alert calls** `est:45m`
  - Why: `Alert.alert` is a silent no-op on react-native-web 0.21 — 41 calls across 15 unguarded files swallow all error/confirmation feedback on web. This is the highest-impact fix in the slice.
  - Files: `src/lib/alert.ts` (new), all 17 files with `Alert.alert` calls, `app/(tabs)/family/[id].tsx`, `app/(tabs)/collections/[id].tsx`, `app/(auth)/reset-password.tsx` (remove inline copies)
  - Do: Extract `showAlert`/`confirmAction` from `family/[id].tsx` into `src/lib/alert.ts`. Replace all 41 raw `Alert.alert` calls with imports from the shared utility. Remove the inline duplicates from `family/[id].tsx`, `collections/[id].tsx`, and `reset-password.tsx`. Each call site: determine if it's a simple message (→ `showAlert`) or a confirmation with callback (→ `confirmAction`). Must check `Platform.OS === 'web'` in the utility, not at call sites.
  - Verify: `rg 'Alert\.alert' app/ src/` returns 0 matches; `npx tsc --noEmit` exits 0; `npx jest --ci` passes
  - Done when: zero raw `Alert.alert` calls remain in `app/` or `src/`, shared utility exists at `src/lib/alert.ts`, TypeScript compiles clean

- [x] **T02: Fix error handling gaps, RecipeForm focus chaining, and hardcoded colors** `est:30m`
  - Why: Completes QA-09 (error handling audit) and QA-04 (RecipeForm focus chaining). Home screen and recipes/index silently swallow load errors; cook mode has no differentiated error state; collections/index has a hardcoded error color.
  - Files: `app/(tabs)/index.tsx`, `app/(tabs)/recipes/index.tsx`, `app/(tabs)/recipes/[id]/cook.tsx`, `app/(tabs)/collections/index.tsx`, `src/components/recipes/RecipeForm.tsx`
  - Do: (1) Home screen: add `error` state, set it in catch, show error text in UI. (2) recipes/index: add `error` state, set in catch, show feedback. (3) cook mode: add explicit error state and error UI instead of falling through to "not found" for all failures. (4) collections/index: replace `#d32f2f` with `errorText` token import. (5) RecipeForm: add `useRef` for description TextInput, wire title with `returnKeyType="next"` + `onSubmitEditing` to focus description ref. Description is multiline — no `onSubmitEditing` per S02 pattern.
  - Verify: `npx tsc --noEmit` exits 0; `npx jest --ci` passes; `rg 'returnKeyType' src/components/recipes/RecipeForm.tsx` shows title with "next"; `rg '#d32f2f' app/` returns 0
  - Done when: all 5 files updated, error states visible in code, RecipeForm title chains to description, no hardcoded error color in collections/index

- [x] **T03: Cross-platform verification on web and iOS simulator** `est:45m`
  - Why: Completes QA-08 (button/interaction audit), QA-10 (cross-platform verification). All prior tasks produced code changes — this task exercises them at runtime and produces the final audit report.
  - Files: `.gsd/milestones/M003/slices/S05/AUDIT-REPORT.md` (new)
  - Do: (1) Start dev server via `bg_shell`. (2) Web: navigate key flows with browser tools — login page renders, scan upload page renders with drag zone, collections page renders, profile page renders. Verify error alert mechanism works by checking `src/lib/alert.ts` is properly loaded. (3) iOS simulator: launch via `open -a Simulator` + Expo, verify app launches and connects to Metro. (4) Write audit report documenting: screens verified on web, screens verified on iOS, what needs real device testing (camera, real OAuth, push notifications), final state of all success criteria.
  - Verify: Audit report exists at `.gsd/milestones/M003/slices/S05/AUDIT-REPORT.md`; web dev server started and key pages loaded without errors; iOS simulator app launched
  - Done when: audit report written with screen-by-screen results, web flows exercised, iOS simulator launch confirmed

## Files Likely Touched

- `src/lib/alert.ts` (new — shared cross-platform alert utility)
- `app/(auth)/login.tsx`
- `app/(auth)/signup.tsx`
- `app/(auth)/forgot-password.tsx`
- `app/(auth)/reset-password.tsx`
- `app/(auth)/logout.tsx`
- `app/(tabs)/index.tsx`
- `app/(tabs)/recipes/index.tsx`
- `app/(tabs)/recipes/[id].tsx`
- `app/(tabs)/recipes/[id]/edit.tsx`
- `app/(tabs)/recipes/[id]/cook.tsx`
- `app/(tabs)/recipes/create.tsx`
- `app/(tabs)/collections/index.tsx`
- `app/(tabs)/collections/[id].tsx`
- `app/(tabs)/collections/create.tsx`
- `app/(tabs)/family/index.tsx`
- `app/(tabs)/family/[id].tsx`
- `app/(tabs)/profile.tsx`
- `app/scan/index.tsx`
- `src/components/recipes/RecipeForm.tsx`
- `src/features/comments/CommentInput.tsx`
- `src/features/comments/CommentThread.tsx`
- `.gsd/milestones/M003/slices/S05/AUDIT-REPORT.md`
