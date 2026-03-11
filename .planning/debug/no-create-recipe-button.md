---
status: diagnosed
trigger: "there is no create recipe button anywhere within ios to get to a form"
created: 2026-03-04T00:00:00Z
updated: 2026-03-04T00:00:00Z
symptoms_prefilled: true
goal: find_root_cause_only
---

## Current Focus

hypothesis: The + Create button exists in app/(tabs)/recipes/index.tsx but the MobileTabBar routed users to a stub file (my-recipes.tsx) instead of the recipes route group. Fix already applied in commit 7f3647f.
test: Verified by reading current source code after fix commit
expecting: Confirmed -- root cause identified and fix already applied
next_action: return diagnosis

## Symptoms

expected: iOS users can tap a tab to reach the recipe list, which shows a "+ Create" button
actual: Tapping the BookOpen tab showed only "My Recipes" plain text (the stub), never the full RecipesListScreen with the + Create button or search/filter UI
errors: none -- the stub rendered without error
reproduction: open iOS app, tap the BookOpen (my-recipes) tab
started: navigation restructure (phase-09-navigation-restructure)

## Eliminated

- hypothesis: create.tsx route is missing or unregistered
  evidence: app/(tabs)/recipes/create.tsx exists and is a valid expo-router file screen. It is within the (tabs) route group, so expo-router registers it automatically at /recipes/create.
  timestamp: 2026-03-04

- hypothesis: the + Create button is missing from recipes/index.tsx
  evidence: lines 168-188 of recipes/index.tsx render a Pressable "+ Create" button guarded only by `session &&`. Any authenticated user sees it. A second "Create your first recipe" button appears in the empty state (lines 459-477).
  timestamp: 2026-03-04

- hypothesis: session is null (user not authenticated)
  evidence: _layout.tsx redirects unauthenticated users to login before rendering tabs, so any user who reaches the tabs is authenticated. The `session &&` guard will be satisfied.
  timestamp: 2026-03-04

## Evidence

- timestamp: 2026-03-04
  checked: app/(tabs)/_layout.tsx -- TabList registrations (BEFORE fix)
  found: TabList originally registered name="my-recipes" with href="/my-recipes", pointing to the stub file app/(tabs)/my-recipes.tsx.
  implication: The recipes route group was completely unreachable via tab navigation.

- timestamp: 2026-03-04
  checked: src/components/nav/MobileTabBar.tsx
  found: TabTrigger name="my-recipes" links to the "my-recipes" named tab. Before the fix, that resolved to app/(tabs)/my-recipes.tsx stub.
  implication: The BookOpen icon in the iOS tab bar navigated to the stub, not to recipes/index.tsx.

- timestamp: 2026-03-04
  checked: app/(tabs)/my-recipes.tsx (BEFORE fix -- file now deleted)
  found: It was an 8-line stub rendering only <Text>My Recipes</Text> with no + Create button, no search, no recipe list.
  implication: iOS users tapping the BookOpen tab saw only "My Recipes" text.

- timestamp: 2026-03-04
  checked: app/(tabs)/recipes/index.tsx -- button logic
  found: The + Create button (lines 168-188) renders correctly inside RecipesListScreen, conditioned on `session`. A second "Create your first recipe" button also appears in the empty state (lines 459-477). Both use router.push('/recipes/create').
  implication: The button code is correct. The problem was that iOS users never reached this screen.

- timestamp: 2026-03-04
  checked: commit 7f3647f -- fix already applied
  found: The fix deleted my-recipes.tsx stub and changed TabList href from "/my-recipes" to "/recipes". Current _layout.tsx line 39 reads: `<TabTrigger name="my-recipes" href={"/recipes" as any} />`.
  implication: The fix correctly routes the "my-recipes" tab to the recipes route group, which renders RecipesListScreen with the + Create button.

- timestamp: 2026-03-04
  checked: app/(tabs)/recipes/create.tsx -- navigation target
  found: CreateRecipeScreen exists, uses RecipeForm component, handles submission with createRecipe API call and photo upload. Uses Stack.Screen for navigation options.
  implication: The /recipes/create route is functional and ready to receive navigation from the + Create button.

## Resolution

root_cause: |
  The MobileTabBar's BookOpen tab used TabTrigger name="my-recipes", which resolved
  to app/(tabs)/my-recipes.tsx -- a stub file from Phase 9 that rendered only plain
  text "My Recipes". The actual recipe list screen (app/(tabs)/recipes/index.tsx),
  which contains the "+ Create" button, was in a separate route (/recipes) that was
  NOT linked from the tab bar.

  The create form screen (app/(tabs)/recipes/create.tsx) existed and was functional,
  but was unreachable because:
  1. The tab bar never navigated to the recipes route group
  2. The + Create button (which calls router.push('/recipes/create')) was inside the
     unreachable RecipesListScreen
  3. The only other path (Home empty state "Create your first recipe") was conditional
     on having zero recipes

  This is the SAME root cause as tests 4 and 5 (empty recipe list / missing filters).

  FIX ALREADY APPLIED in commit 7f3647f:
  - Deleted app/(tabs)/my-recipes.tsx stub
  - Changed TabList href from "/my-recipes" to "/recipes"
  - Now TabTrigger name="my-recipes" correctly routes to app/(tabs)/recipes/index.tsx

fix: "Applied in commit 7f3647f -- deleted stub, re-routed tab to /recipes"
verification: "Needs user verification on device"
files_changed:
  - app/(tabs)/_layout.tsx (TabList href changed)
  - app/(tabs)/my-recipes.tsx (deleted)
