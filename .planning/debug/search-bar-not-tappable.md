---
status: diagnosed
trigger: "Home search bar is not tappable — user cannot click into it at all"
created: 2026-03-04T00:00:00Z
updated: 2026-03-04T00:00:00Z
---

## Current Focus

hypothesis: Hidden TabList with position:absolute and no pointerEvents intercepts touch events over the search bar area
test: Compare _layout.tsx before and after fix commit 7f3647f
expecting: Pre-fix code lacks pointerEvents:"none" and width:0; post-fix adds both
next_action: DONE — root cause confirmed with git diff evidence

## Symptoms

expected: Tapping the search bar on the home screen navigates to /recipes
actual: The search bar is completely unresponsive to taps
errors: None reported (silent failure)
reproduction: Open home screen on iOS, tap the "Search recipes..." bar
started: Since the hidden TabList pattern was introduced in commit 6b16750 (feat 09-02)

## Eliminated

- hypothesis: Missing onPress handler on the search bar Pressable
  evidence: index.tsx line 136 has onPress={navigateToRecipes}, which calls router.push('/recipes')
  timestamp: 2026-03-04

- hypothesis: router import missing or broken
  evidence: `import { router } from 'expo-router'` present on line 10 of index.tsx
  timestamp: 2026-03-04

- hypothesis: PageContainer or ScrollView blocks touches
  evidence: PageContainer is a plain View with flex:1 and padding; ScrollView is standard with no pointerEvents override
  timestamp: 2026-03-04

- hypothesis: MobileTabBar overlaps the search bar area
  evidence: MobileTabBar renders at the bottom of the column flex layout; does not float over content
  timestamp: 2026-03-04

## Evidence

- timestamp: 2026-03-04
  checked: app/(tabs)/index.tsx — search bar implementation
  found: Pressable at lines 135-159 has onPress={navigateToRecipes}, correct router.push('/recipes'), correct imports. No pointerEvents prop. No z-index issues. Implementation is correct in isolation.
  implication: The search bar itself is implemented correctly. The blocker must be an external element intercepting touches.

- timestamp: 2026-03-04
  checked: app/(tabs)/_layout.tsx at commit 1ff7288 (pre-fix state)
  found: TabList rendered with style={{ height: 0, overflow: "hidden", position: "absolute" }}. Contains 4 TabTrigger children. No pointerEvents prop. No width constraint.
  implication: An absolutely-positioned View containing Pressable children (TabTriggers) sits at position 0,0 of the tab container. On iOS, overflow:"hidden" clips visual rendering but does NOT clip the touch/hit area of child Pressables.

- timestamp: 2026-03-04
  checked: git diff 1ff7288..7f3647f for _layout.tsx
  found: Fix commit 7f3647f added `width: 0` and `pointerEvents: "none"` to the TabList style. This confirms the root cause was recognized and addressed.
  implication: The root cause is definitively the missing pointerEvents:"none" on the absolutely-positioned TabList.

- timestamp: 2026-03-04
  checked: expo-router/build/ui/TabTrigger.js behavior
  found: When asChild is NOT set, TabTrigger renders a <Pressable> with its own layout. Inside a height:0 parent with position:absolute, these Pressables occupy the top-left region of the screen, directly overlapping the search bar area.
  implication: The TabTrigger Pressables silently intercept all touch events in the area they overlap, preventing the search bar's onPress from ever firing.

## Resolution

root_cause: >
  In app/(tabs)/_layout.tsx, the hidden TabList uses position:"absolute" with height:0 and
  overflow:"hidden" to visually hide itself. However, on iOS (React Native), overflow:"hidden"
  does NOT clip touch event handling — only visual rendering. The four TabTrigger children each
  render as Pressable elements that occupy real layout space at position (0,0) of the absolute
  container. This means they sit directly over the top portion of the screen content, including
  the home screen's search bar. Every tap in that zone is silently consumed by the hidden
  TabTrigger Pressables, making the search bar completely unresponsive.

fix: >
  Add pointerEvents="none" to the TabList style so the absolutely-positioned View and all its
  children are excluded from touch dispatch entirely. Also add width:0 as a belt-and-suspenders
  measure.

  NOTE: This fix was already applied in commit 7f3647f. The search bar should now be tappable.

verification: Fix already applied in commit 7f3647f; needs user re-test to confirm
files_changed:
  - app/(tabs)/_layout.tsx (already changed in 7f3647f)
