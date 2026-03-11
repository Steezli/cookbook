# T08: 10-core-screens 07

**Slice:** S09 — **Milestone:** M001

## Description

Fix safe area inset handling on recipe detail and cooking mode screens so sticky headers render below the iOS status bar / Dynamic Island.

Purpose: UAT tests 6, 8, 9, 10, and 14 are blocked or failed because the recipe detail sticky header renders behind the iOS status bar. The Start Cooking button is untappable, which cascades to block all cooking mode testing. Both screens in the recipes Stack use raw Views with no safe area padding while the Stack layout has headerShown:false.

Output: Both screens import useSafeAreaInsets and apply paddingTop:insets.top to their top-level header Views, matching the established codebase pattern (PageContainer, profile screen).

## Must-Haves

- [ ] "Recipe detail sticky header renders fully below the iOS status bar / Dynamic Island"
- [ ] "Start Cooking button in the sticky header is visible and tappable"
- [ ] "Cooking mode top bar (X button, recipe title) renders fully below the iOS status bar / Dynamic Island"
- [ ] "All screens in the recipes Stack respect safe area boundaries"

## Files

- `app/(tabs)/recipes/[id].tsx`
- `app/(tabs)/recipes/[id]/cook.tsx`
