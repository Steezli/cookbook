# S08: Navigation Restructure

**Goal:** Install the lucide icon library, fix jest config for .
**Demo:** Install the lucide icon library, fix jest config for .

## Must-Haves


## Tasks

- [x] **T01: 09-navigation-restructure 01** `est:4min`
  - Install the lucide icon library, fix jest config for .tsx test files, create shared nav type contracts, and build the PageContainer component with TDD.

Purpose: Establishes the foundation that Plans 02 and 03 depend on — lucide icons for nav chrome, test infrastructure for .tsx components, type contracts for cross-plan consistency, and the PageContainer that wraps every screen.

Output: lucide-react-native installed, jest handles .tsx tests, nav types file, tested PageContainer component.
- [x] **T02: 09-navigation-restructure 02** `est:5min`
  - Move all existing screens into the (tabs)/ route group, update the root layout to a Stack with explicit route group screens, and create the (tabs)/_layout.tsx with headless Tabs from expo-router/ui including auth redirect.

Purpose: This is the structural backbone of the navigation restructure. Every existing screen must remain accessible in its new location, and the (scan) flow must present as a modal overlay from the root Stack.

Output: All screens relocated into (tabs)/, root layout declares route groups, tabs layout has auth redirect and headless Tabs with inline nav placeholders.
- [x] **T03: 09-navigation-restructure 03** `est:3min`
  - Build the four navigation chrome components (TabButton, MobileTabBar, SidebarItem, WebSidebar) matching the cookbook.pen spec, then wire them into the (tabs)/_layout.tsx replacing the placeholders from Plan 02.

Purpose: This delivers the visual navigation experience — the bottom tab bar on mobile/tablet (NAV-02, NAV-04) and the fixed sidebar on web (NAV-03). The scan modal interception and Collections non-tab navigation are handled here.

Output: Fully functional adaptive navigation chrome — mobile/tablet bottom tabs, web sidebar, scan modal trigger, all styled to cookbook.pen tokens.
- [x] **T04: 09-navigation-restructure 04** `est:2min`
  - Close three UAT gaps from Phase 09 human verification: (1) mobile tab bar items unevenly spaced, (2) Scan icon permanently highlighted, (3) web sidebar Scan/Collections items non-functional with inconsistent widths.

Purpose: Make navigation chrome work correctly so Phase 09 can close and Phase 10 can begin.
Output: Two fixed component files that pass all 8 UAT tests.

## Files Likely Touched

- `package.json`
- `package-lock.json`
- `jest.config.js`
- `src/components/nav/types.ts`
- `src/components/nav/PageContainer.tsx`
- `src/components/nav/__tests__/PageContainer.test.tsx`
- `app/_layout.tsx`
- `app/(tabs)/_layout.tsx`
- `app/(tabs)/index.tsx`
- `app/(tabs)/my-recipes.tsx`
- `app/(tabs)/scan.tsx`
- `app/(tabs)/profile.tsx`
- `app/(tabs)/collections/index.tsx`
- `app/(tabs)/collections/[id].tsx`
- `app/(tabs)/collections/create.tsx`
- `app/(tabs)/recipes/index.tsx`
- `app/(tabs)/recipes/[id].tsx`
- `app/(tabs)/recipes/[id]/edit.tsx`
- `app/(tabs)/recipes/create.tsx`
- `app/(tabs)/invite/[token].tsx`
- `app/(tabs)/family/_layout.tsx`
- `app/(tabs)/family/index.tsx`
- `app/(tabs)/family/[id].tsx`
- `app/(public)/_layout.tsx`
- `src/components/nav/TabButton.tsx`
- `src/components/nav/MobileTabBar.tsx`
- `src/components/nav/SidebarItem.tsx`
- `src/components/nav/WebSidebar.tsx`
- `app/(tabs)/_layout.tsx`
- `src/components/nav/MobileTabBar.tsx`
- `src/components/nav/WebSidebar.tsx`
