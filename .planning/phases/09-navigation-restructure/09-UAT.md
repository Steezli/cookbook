---
status: diagnosed
phase: 09-navigation-restructure
source: [09-01-SUMMARY.md, 09-02-SUMMARY.md, 09-03-SUMMARY.md]
started: 2026-03-04T18:44:00Z
updated: 2026-03-04T18:56:00Z
---

## Current Test
<!-- OVERWRITE each test - shows where we are -->

[testing complete]

## Tests

### 1. Mobile Tab Bar Visible
expected: On a mobile device (or narrow viewport), a bottom tab bar appears with 5 tabs: Home, Recipes, Scan, Favorites, Profile. Each tab shows an icon.
result: issue
reported: "pass but the layout is janky af, home and recipes are crammed together then a ton of space before scan a ton more space then favorites and profile are crammed together. These items should be equal distance apart"
severity: minor

### 2. Tab Navigation Works
expected: Tapping each tab in the mobile tab bar navigates to the corresponding screen (Home shows home content, Recipes shows recipe list, Favorites shows favorites, Profile shows profile/settings).
result: issue
reported: "pass but the scan button is always highlighted like whichever tab I am actually on"
severity: minor

### 3. Scan Opens as Modal
expected: Tapping the Scan tab/button opens a modal overlay (slides up over current screen) rather than switching to a regular tab screen.
result: pass

### 4. Web Sidebar Visible
expected: On a wide viewport (web breakpoint), a 260px left sidebar appears instead of the bottom tab bar. It shows a "Cookbook" logo with a book icon at the top, followed by navigation items (Home, My Recipes, Collections, Scan, Favorites, Settings).
result: pass

### 5. Sidebar Navigation Works
expected: Clicking sidebar items navigates to the correct screen. The active/current item is highlighted with an accent background and white text.
result: issue
reported: "scan recipe and collections do nothing and have weird narrower designs than the other items in the list. The white text is also gross af but should be another later problem when focusing in pencil designs"
severity: major

### 6. Tablet Shows Tab Bar (Not Sidebar)
expected: On a tablet-width viewport, the bottom tab bar is shown (same as mobile), NOT the sidebar. The sidebar only appears at the web/desktop breakpoint.
result: pass

### 7. Screen Content Padding
expected: Screen content has appropriate padding that adapts to breakpoint — tighter on mobile, more generous on tablet and web. Content doesn't touch screen edges.
result: pass

### 8. Auth Redirect
expected: If not logged in, navigating to any tab screen redirects to the auth/login screen instead of showing the tab content.
result: pass

## Summary

total: 8
passed: 5
issues: 3
pending: 0
skipped: 0

## Gaps

- truth: "Tab bar items are evenly spaced across the bottom bar"
  status: failed
  reason: "User reported: pass but the layout is janky af, home and recipes are crammed together then a ton of space before scan a ton more space then favorites and profile are crammed together. These items should be equal distance apart"
  severity: minor
  test: 1
  root_cause: "TabTrigger wrappers have no flex style, so they shrink to icon content (~24px). Scan Pressable has flex:1 as a direct row child and absorbs remaining space. justifyContent:'space-between' distributes based on item width, not equally."
  artifacts:
    - path: "src/components/nav/MobileTabBar.tsx"
      issue: "TabTrigger elements missing flex:1; container uses space-between instead of equal distribution"
    - path: "src/components/nav/TabButton.tsx"
      issue: "flex:1 on Pressable only fills parent TabTrigger, not grandparent row"
  missing:
    - "Add style={{ flex: 1 }} to each TabTrigger in MobileTabBar"
    - "Remove or change justifyContent from space-between since flex:1 on all 5 children divides space equally"
  debug_session: ".planning/debug/mobile-tab-bar-uneven-spacing.md"
- truth: "Only the currently active tab is highlighted; scan button should not appear focused when another tab is active"
  status: failed
  reason: "User reported: pass but the scan button is always highlighted like whichever tab I am actually on"
  severity: minor
  test: 2
  root_cause: "MobileTabBar.tsx line 47 hardcodes color={accentWarm} on the Camera icon. accentWarm is the 'active tab' color in TabButton, so Scan always looks focused. It's a plain Pressable with no isFocused prop."
  artifacts:
    - path: "src/components/nav/MobileTabBar.tsx"
      issue: "Line 47: Camera icon hardcodes accentWarm color unconditionally"
    - path: "src/components/nav/TabButton.tsx"
      issue: "Shows correct pattern: isFocused ? accentWarm : textDisabled"
  missing:
    - "Change Scan icon to textDisabled color, or differentiate via container shape/background instead of using the same accentWarm as active tabs"
  debug_session: ".planning/debug/scan-btn-always-highlighted.md"
- truth: "Clicking Scan, Recipes (My Recipes), and Collections in the web sidebar navigates to the correct screen; all sidebar items have consistent width/styling"
  status: failed
  reason: "User reported: scan recipe and collections do nothing and have weird narrower designs than the other items in the list. The white text is also gross af but should be another later problem when focusing in pencil designs"
  severity: major
  test: 5
  root_cause: "router.push('/scan') targets nonexistent route (no scan route file exists anywhere). router.push('/collections') may not resolve correctly for grouped route. My Recipes TabTrigger may conflict with app/(tabs)/recipes/ directory. Width difference: non-TabTrigger items lack Slot wrapper flex behavior."
  artifacts:
    - path: "src/components/nav/WebSidebar.tsx"
      issue: "Lines 68,75: router.push targets nonexistent or incorrect routes; plain SidebarItems render narrower than TabTrigger-wrapped items"
    - path: "src/components/nav/MobileTabBar.tsx"
      issue: "Line 44: same broken router.push('/scan')"
  missing:
    - "Create actual scan route or use correct navigation mechanism"
    - "Fix collections route path or register as tab"
    - "Add alignSelf:'stretch' to non-TabTrigger sidebar items for consistent width"
  debug_session: ".planning/debug/sidebar-items-broken.md"
