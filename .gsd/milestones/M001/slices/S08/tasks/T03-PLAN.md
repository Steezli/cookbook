# T03: 09-navigation-restructure 03

**Slice:** S08 — **Milestone:** M001

## Description

Build the four navigation chrome components (TabButton, MobileTabBar, SidebarItem, WebSidebar) matching the cookbook.pen spec, then wire them into the (tabs)/_layout.tsx replacing the placeholders from Plan 02.

Purpose: This delivers the visual navigation experience — the bottom tab bar on mobile/tablet (NAV-02, NAV-04) and the fixed sidebar on web (NAV-03). The scan modal interception and Collections non-tab navigation are handled here.

Output: Fully functional adaptive navigation chrome — mobile/tablet bottom tabs, web sidebar, scan modal trigger, all styled to cookbook.pen tokens.

## Must-Haves

- [ ] "On mobile, a bottom tab bar shows 5 tabs: Home, My Recipes, Scan, Family, Profile with correct lucide icons"
- [ ] "Active tab icon uses accentWarm (#E8784E), inactive uses textDisabled (#D1D5DB)"
- [ ] "Tab bar height is 84px plus safe area bottom inset, with white background and top border"
- [ ] "On web, a 260px left sidebar shows: Home, My Recipes, Collections, Scan Recipe, Family, Settings"
- [ ] "Active sidebar item has accentWarm background with white text and 12px border radius"
- [ ] "On tablet, the bottom tab bar renders (same as mobile) with no sidebar"
- [ ] "Tapping the Scan tab/sidebar item opens the scan modal, not a tab screen"
- [ ] "Collections in sidebar navigates to /collections (not a tab switch)"

## Files

- `src/components/nav/TabButton.tsx`
- `src/components/nav/MobileTabBar.tsx`
- `src/components/nav/SidebarItem.tsx`
- `src/components/nav/WebSidebar.tsx`
- `app/(tabs)/_layout.tsx`
