---
status: diagnosed
trigger: "mobile tab bar items not evenly spaced - Home/Recipes crammed, gap, Scan, gap, Favorites/Profile crammed"
created: 2026-03-04T00:00:00Z
updated: 2026-03-04T00:00:00Z
---

## Current Focus

hypothesis: TabTrigger wrapping with asChild breaks flex:1 on TabButton children
test: read component source and trace flex layout chain
expecting: TabTrigger wrapper does not pass through or honor flex:1 from TabButton
next_action: report findings

## Symptoms

expected: All 5 tab bar items evenly spaced across screen width
actual: Home and Recipes crammed together on left, large gap, Scan in middle-ish, large gap, Favorites and Profile crammed on right
errors: none (visual layout issue)
reproduction: open app on mobile, observe bottom tab bar
started: since MobileTabBar was implemented

## Eliminated

(none)

## Evidence

- timestamp: 2026-03-04
  checked: MobileTabBar.tsx container styles
  found: Container uses flexDirection:"row" and justifyContent:"space-between" with paddingHorizontal:12
  implication: space-between distributes space between items based on their intrinsic widths, not equally

- timestamp: 2026-03-04
  checked: TabButton.tsx styles
  found: TabButton Pressable has flex:1, alignItems:"center", justifyContent:"center"
  implication: TabButton itself wants to expand equally — but only if the parent allows it

- timestamp: 2026-03-04
  checked: How TabTrigger asChild works with flex layout
  found: TabTrigger with asChild clones the child and forwards props, but TabTrigger itself is still rendered as an intermediate wrapper element. The flex:1 on TabButton's Pressable makes the Pressable expand within TabTrigger, but TabTrigger itself has NO flex:1 style. So TabTrigger shrinks to content size.
  implication: This is the root cause. The 4 TabTrigger wrappers have no flex style, so they shrink-wrap their content. The Scan Pressable (not wrapped in TabTrigger) has flex:1 directly as a child of the row container, so it gets all the remaining space.

- timestamp: 2026-03-04
  checked: Scan button (plain Pressable) in MobileTabBar
  found: Scan Pressable IS a direct child of the row container with flex:1. It correctly expands.
  implication: Confirms asymmetry — Scan gets flex:1 behavior, the 4 TabTrigger-wrapped buttons do not

## Resolution

root_cause: |
  The 4 TabTrigger components are intermediate wrapper elements between the row container and the TabButton Pressables.
  TabButton's Pressable has flex:1, but that only makes it fill its PARENT (the TabTrigger), not the grandparent (the row container).
  The TabTrigger elements themselves have no flex:1 style, so they shrink to their intrinsic content width (~24px icon each).
  Meanwhile, the Scan Pressable is a DIRECT child of the row with flex:1, so it greedily takes all remaining space.
  Combined with justifyContent:"space-between", the shrunken TabTriggers cluster at edges with the expanded Scan Pressable dominating the middle.

fix: (not applied — diagnosis only)
verification: (not applied — diagnosis only)
files_changed: []
