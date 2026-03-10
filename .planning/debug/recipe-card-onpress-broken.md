---
status: diagnosed
trigger: "RecipeCard onPress does nothing -- tapping recipe cards on the home screen has no effect"
created: 2026-03-04T23:30:00Z
updated: 2026-03-04T23:45:00Z
---

## Current Focus

hypothesis: recipes/ directory is missing a _layout.tsx with a Stack navigator, so router.push('/recipes/[id]') has no navigator to handle push navigation within the tab
test: Compare recipes/ (no _layout.tsx, broken navigation) vs family/ (has _layout.tsx with Stack, working navigation)
expecting: Presence of Stack layout in tab sub-directories is required for sub-route navigation
next_action: Report root cause

## Symptoms

expected: Tapping any recipe card navigates to the recipe detail screen for that recipe
actual: Recipe cards are visible on the home screen (Featured Recipes, Recent Recipes sections) but tapping any card does nothing -- no navigation occurs
errors: None reported (silent failure)
reproduction: Open app, see recipe cards on home screen, tap any card -- nothing happens (UAT Test 6)
started: Discovered during Phase 10 UAT

## Eliminated

- hypothesis: onPress prop not passed to RecipeCard from parent
  evidence: Home screen passes `onPress={() => navigateToRecipe(item.id)}` on both FlatList renderItem calls (lines 213 and 240 of app/(tabs)/index.tsx)
  timestamp: 2026-03-04T23:32:00Z

- hypothesis: RecipeCard missing Pressable/TouchableOpacity wrapper
  evidence: RecipeCard.tsx wraps ALL content in a `<Pressable onPress={onPress}>` (line 43-126)
  timestamp: 2026-03-04T23:33:00Z

- hypothesis: TabList touch interception blocking touches on iOS
  evidence: Commit 7f3647f already added pointerEvents:"none" + width:0 to TabList; this was a real contributing issue but was already fixed. However, even with this fix, the navigation itself would still fail due to missing Stack navigator.
  timestamp: 2026-03-04T23:36:00Z

- hypothesis: Route file [id].tsx doesn't exist
  evidence: app/(tabs)/recipes/[id].tsx exists (31,846 bytes), exports RecipeDetailScreen default component
  timestamp: 2026-03-04T23:34:00Z

- hypothesis: ScrollView/FlatList nested scroll conflict intercepting taps
  evidence: Nested ScrollView/FlatList can cause scroll conflicts but Pressable taps are still handled; the issue is navigation not working, not touches not registering
  timestamp: 2026-03-04T23:37:00Z

## Evidence

- timestamp: 2026-03-04T23:32:00Z
  checked: app/(tabs)/index.tsx (home screen)
  found: navigateToRecipe calls router.push(`/recipes/${id}` as any); RecipeCard receives onPress={() => navigateToRecipe(item.id)} in both Featured and Recent FlatLists
  implication: onPress is correctly wired from parent to RecipeCard

- timestamp: 2026-03-04T23:33:00Z
  checked: src/components/recipes/RecipeCard.tsx
  found: Component wraps all content in <Pressable onPress={onPress}> -- touch handling is correct
  implication: The press handler fires, but the navigation call doesn't produce visible results

- timestamp: 2026-03-04T23:35:00Z
  checked: app/(tabs)/_layout.tsx
  found: Uses expo-router/ui Tabs navigator with hidden TabList (4 TabTriggers: index, my-recipes, family, profile). TabSlot renders active tab content. No tab trigger registered for recipes/[id] route.
  implication: The Tabs navigator only knows about tab routes; sub-routes need their own nested navigator

- timestamp: 2026-03-04T23:38:00Z
  checked: app/(tabs)/family/_layout.tsx
  found: Family directory HAS a _layout.tsx that returns <Stack> navigator. Family tab has sub-routes (index.tsx, [id].tsx) and navigation works because Stack handles push.
  implication: Stack navigator inside tab directory is the established pattern for sub-route navigation

- timestamp: 2026-03-04T23:39:00Z
  checked: app/(tabs)/recipes/ directory
  found: Contains index.tsx, [id].tsx, create.tsx, [id]/cook.tsx, [id]/edit.tsx -- but NO _layout.tsx. No Stack navigator wraps these routes.
  implication: router.push('/recipes/some-id') has no navigator to push onto within the tab -- this is the root cause

- timestamp: 2026-03-04T23:40:00Z
  checked: app/(tabs)/collections/ directory
  found: Also has index.tsx, [id].tsx, create.tsx but NO _layout.tsx -- same structural issue
  implication: Collections sub-route navigation (router.push('/collections/[id]')) would have the same bug

- timestamp: 2026-03-04T23:41:00Z
  checked: Expo Router documentation on custom tabs
  found: Docs state "If one or more tabs have more than one screen associated with it, nesting a stack navigator inside of a tab is often the way to go"
  implication: Official guidance confirms that Stack navigator is needed inside tab directories with sub-routes

## Resolution

root_cause: The `app/(tabs)/recipes/` directory is missing a `_layout.tsx` file with a Stack navigator. When `router.push('/recipes/[id]')` is called from the home screen, the expo-router/ui Tabs navigator has no Stack to push the new route onto. The Tabs navigator only renders routes registered via TabTrigger in TabSlot. Non-tab routes like `/recipes/[id]`, `/recipes/create`, `/recipes/[id]/cook`, and `/recipes/[id]/edit` need a nested Stack navigator (just like `family/_layout.tsx` provides for the family tab). The same issue also affects `app/(tabs)/collections/` which is similarly missing a `_layout.tsx`.
fix: ""
verification: ""
files_changed: []
