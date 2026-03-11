---
status: diagnosed
trigger: "there is no create recipe button anywhere within ios to get to a form"
created: 2026-03-04T00:00:00Z
updated: 2026-03-04T00:00:00Z
symptoms_prefilled: true
goal: find_root_cause_only
---

## Current Focus

hypothesis: The + Create button is inside app/(tabs)/recipes/index.tsx, but the tab bar links to "my-recipes" (a stub screen), not to the /recipes route group — so iOS users never reach the screen that has the button.
test: confirmed by reading _layout.tsx TabList, MobileTabBar, and my-recipes.tsx
expecting: confirmed — this is the same root cause as the empty recipe list (test 4)
next_action: return diagnosis

## Symptoms

expected: iOS users can tap a tab to reach the recipe list, which shows a "+ Create" button
actual: Tapping the BookOpen tab shows only "My Recipes" plain text (the stub), never the full RecipesListScreen with the + Create button or search/filter UI
errors: none — the stub renders without error
reproduction: open iOS app, tap the BookOpen (my-recipes) tab
started: navigation restructure (phase-09-navigation-restructure branch)

## Eliminated

- hypothesis: create.tsx route is missing or unregistered
  evidence: app/(tabs)/recipes/create.tsx exists and is a valid expo-router file screen. It is within the (tabs) route group, so expo-router registers it automatically at /recipes/create.
  timestamp: 2026-03-04

- hypothesis: the + Create button is missing from recipes/index.tsx
  evidence: lines 168–188 of recipes/index.tsx render a Pressable "+ Create" button guarded only by `session &&`. Any authenticated user sees it.
  timestamp: 2026-03-04

- hypothesis: session is null (user not authenticated)
  evidence: _layout.tsx redirects unauthenticated users to login before rendering tabs, so any user who reaches the tabs is authenticated. The `session &&` guard will be satisfied.
  timestamp: 2026-03-04

## Evidence

- timestamp: 2026-03-04
  checked: app/(tabs)/_layout.tsx — TabList registrations
  found: TabList registers four tabs: index (/), my-recipes (/my-recipes), family (/family), profile (/profile). There is NO entry for /recipes or the recipes route group.
  implication: The recipes route group (app/(tabs)/recipes/) is not registered as a tab in TabList.

- timestamp: 2026-03-04
  checked: src/components/nav/MobileTabBar.tsx
  found: TabTrigger name="my-recipes" links to the "my-recipes" named tab. That tab resolves to app/(tabs)/my-recipes.tsx.
  implication: The BookOpen icon in the iOS tab bar navigates to the stub my-recipes.tsx, not to recipes/index.tsx.

- timestamp: 2026-03-04
  checked: app/(tabs)/my-recipes.tsx
  found: It is a 8-line stub rendering only <Text>My Recipes</Text> with no + Create button, no search, no recipe list.
  implication: iOS users tapping the BookOpen tab see only "My Recipes" text — the entire RecipesListScreen (app/(tabs)/recipes/index.tsx) is unreachable via the tab bar.

- timestamp: 2026-03-04
  checked: app/(tabs)/recipes/index.tsx — button logic
  found: The + Create button (lines 168–188) renders correctly inside RecipesListScreen, conditioned on `session`. A second "Create your first recipe" button also appears in the empty state (lines 459–477).
  implication: The button code is correct. The problem is that iOS users never reach this screen because the tab bar doesn't link to it.

- timestamp: 2026-03-04
  checked: app/(tabs)/index.tsx (Home screen)
  found: Home screen has navigateToCreate() = router.push('/recipes/create') used in the empty state. Also has navigateToRecipes() = router.push('/recipes') used by search bar and "See all" links.
  implication: There is an indirect path to create from Home only if the user has no recipes (empty state shows "Create your first recipe"). If user has recipes, no create path from Home either.

## Resolution

root_cause: |
  The MobileTabBar's BookOpen tab uses TabTrigger name="my-recipes", which links to
  app/(tabs)/my-recipes.tsx — a stub file that renders only plain text "My Recipes".
  The actual recipe list screen (app/(tabs)/recipes/index.tsx), which contains the
  "+ Create" button, is in a separate route group (app/(tabs)/recipes/) that is NOT
  registered in the TabList and NOT linked from MobileTabBar.

  There are two orphaned screens:
  1. app/(tabs)/recipes/index.tsx — full recipe list with + Create button (unreachable via tab bar)
  2. app/(tabs)/recipes/create.tsx — create form (technically reachable at /recipes/create
     if navigated to programmatically, but no iOS entry point reaches it)

  This is the SAME root cause as test 4 (empty recipe list). The fix for test 4
  (routing the my-recipes tab to the recipes route group) will simultaneously restore
  the + Create button.

fix: ""
verification: ""
files_changed: []
