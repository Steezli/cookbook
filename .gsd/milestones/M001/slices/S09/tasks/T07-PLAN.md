# T07: 10-core-screens 06

**Slice:** S09 — **Milestone:** M001

## Description

Add missing Stack navigator layouts to recipes/ and collections/ tab directories to fix silent navigation failures.

Purpose: UAT tests 6 and 11 (and cascading skips 7-10, 12-13) all trace to the same root cause — `app/(tabs)/recipes/` and `app/(tabs)/collections/` have no `_layout.tsx` with a Stack navigator. Without a Stack, `router.push()` calls to sub-routes (detail, create, edit, cook) silently fail because there is no navigator to push onto within the Tabs group. The working pattern already exists in `app/(tabs)/family/_layout.tsx`.

Output: Two new `_layout.tsx` files that enable all sub-route navigation within the recipes and collections tabs.

## Must-Haves

- [ ] "Tapping a RecipeCard on the home screen navigates to the recipe detail screen"
- [ ] "Tapping + Create on the recipe list navigates to the create recipe form"
- [ ] "Tapping Start Cooking on recipe detail navigates to cooking mode"
- [ ] "Tapping Edit on recipe detail navigates to the edit form"
- [ ] "router.push to any /recipes/* sub-route resolves correctly within the tabs navigator"
- [ ] "router.push to any /collections/* sub-route resolves correctly within the tabs navigator"

## Files

- `app/(tabs)/recipes/_layout.tsx`
- `app/(tabs)/collections/_layout.tsx`
