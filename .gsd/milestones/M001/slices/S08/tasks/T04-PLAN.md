# T04: 09-navigation-restructure 04

**Slice:** S08 — **Milestone:** M001

## Description

Close three UAT gaps from Phase 09 human verification: (1) mobile tab bar items unevenly spaced, (2) Scan icon permanently highlighted, (3) web sidebar Scan/Collections items non-functional with inconsistent widths.

Purpose: Make navigation chrome work correctly so Phase 09 can close and Phase 10 can begin.
Output: Two fixed component files that pass all 8 UAT tests.

## Must-Haves

- [ ] "All 5 mobile tab bar items are evenly spaced across the full screen width"
- [ ] "The Scan icon in the mobile tab bar does not appear highlighted/active when another tab is selected"
- [ ] "Clicking Scan Recipe in the web sidebar opens the scan modal"
- [ ] "Clicking Collections in the web sidebar navigates to the collections screen"
- [ ] "All web sidebar items (TabTrigger-wrapped and plain) render at the same width"

## Files

- `src/components/nav/MobileTabBar.tsx`
- `src/components/nav/WebSidebar.tsx`
