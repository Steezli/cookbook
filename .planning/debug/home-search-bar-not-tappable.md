---
status: diagnosed
trigger: "Investigate why the home screen search bar is not tappable on iOS"
created: 2026-03-04T00:00:00Z
updated: 2026-03-04T00:00:00Z
---

## Current Focus

hypothesis: Hidden TabList with position:absolute intercepts touch events over the entire screen
test: Read TabList source to confirm it renders a View with no pointerEvents:none
expecting: Confirmed — TabList is a plain View, TabTrigger children are Pressables with no hitSlop or zero-area constraint
next_action: DONE — root cause confirmed

## Symptoms

expected: Tapping the search bar on the home screen navigates to /recipes
actual: The search bar is completely unresponsive to taps
errors: None reported (silent failure)
reproduction: Open home screen on iOS, tap the "Search recipes..." bar
started: Unknown — likely since the hidden TabList pattern was introduced

## Eliminated

- hypothesis: Missing onPress handler on the search bar Pressable
  evidence: onPress={navigateToRecipes} is present and router.push('/recipes') is correctly called
  timestamp: 2026-03-04

- hypothesis: router import missing or broken
  evidence: `import { router } from 'expo-router'` is present on line 10 of index.tsx
  timestamp: 2026-03-04

- hypothesis: PageContainer blocks touches via pointer events or z-index
  evidence: PageContainer is a plain View with flex:1 and padding — no position, no z-index, no pointerEvents
  timestamp: 2026-03-04

- hypothesis: MobileTabBar overlaps the search bar area
  evidence: MobileTabBar is a normal-flow View at the bottom of the column layout; it does not float over the screen
  timestamp: 2026-03-04

## Evidence

- timestamp: 2026-03-04
  checked: app/(tabs)/index.tsx — search bar implementation
  found: Pressable at lines 135-159 has onPress={navigateToRecipes}, correct router.push, correct imports. No pointerEvents prop. No z-index. Visually correct.
  implication: The search bar itself is implemented correctly. Blocker must be external to it.

- timestamp: 2026-03-04
  checked: app/(tabs)/_layout.tsx — tab layout
  found: TabList rendered with style={{ height: 0, overflow: "hidden", position: "absolute" }}. Contains 4 TabTrigger children (no asChild prop → each renders as a Pressable).
  implication: An absolutely-positioned View containing Pressables sits over the screen. On iOS, overflow:hidden does NOT clip touch/hit areas — the Pressables inside still receive touches even though they are visually hidden.

- timestamp: 2026-03-04
  checked: node_modules/expo-router/build/ui/TabList.js
  found: TabList renders a plain React Native View. No pointerEvents prop applied. The style passed in (height:0, overflow:hidden, position:absolute) does not prevent touch interception on iOS.
  implication: The TabList View is a full-width absolutely-positioned element with height:0 — but its Pressable children (TabTriggers) have their own layout and may extend beyond height:0 due to how RN calculates hit areas. Or the View itself intercepts touches at y=0 of the screen.

- timestamp: 2026-03-04
  checked: node_modules/expo-router/build/ui/TabTrigger.js
  found: When asChild is NOT set (the case in TabList), TabTrigger renders a <Pressable> with style={styles.tabTrigger} (flexDirection:row, justifyContent:space-between) and NO explicit height or pointerEvents. The Pressable inside a height:0 parent on iOS has its touch target at position 0,0 of the parent, which is absolute-positioned at the top of the screen — directly over the search bar.
  implication: CONFIRMED ROOT CAUSE. The TabList Pressables are stacked over the top portion of the screen, including the search bar area, intercepting all taps in that zone.

## Resolution

root_cause: >
  In app/(tabs)/_layout.tsx, the hidden TabList uses position:"absolute" with height:0 and overflow:"hidden" to hide it visually. However, on iOS, overflow:hidden does NOT clip touch event handling — the Pressable elements rendered by the four TabTrigger children still intercept touches in the region they occupy (the top of the screen). This silently swallows every tap in that area, including taps on the home screen search bar which sits at the top of the content area.

fix: >
  Add pointerEvents="none" to the TabList's style (or as a direct prop) so the absolutely-positioned View and all its children are excluded from touch dispatch entirely. React Native respects pointerEvents="none" on iOS for hit testing even when overflow:hidden does not clip touches.

  Change in app/(tabs)/_layout.tsx:

    <TabList
      style={{
        height: 0,
        overflow: "hidden",
        position: "absolute",
      }}
    >

  to:

    <TabList
      style={{
        height: 0,
        overflow: "hidden",
        position: "absolute",
        pointerEvents: "none",   // ADD THIS — prevents touch interception on iOS
      }}
    >

  Alternative (React Native canonical form): pass pointerEvents="none" as a prop directly on the TabList if it forwards to the underlying View, but since TabList accepts a style prop the style approach is reliable.

verification: Not yet applied — diagnosis only mode
files_changed: []
