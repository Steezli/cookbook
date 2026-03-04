# Phase 9: Navigation Restructure - Context

**Gathered:** 2026-03-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Convert the app's flat Stack navigation to a Tabs route group with breakpoint-aware adaptive navigation (mobile bottom tabs, tablet bottom tabs + header, web fixed sidebar). Create a PageContainer component for consistent layout. All existing screens must remain accessible after the restructure.

</domain>

<decisions>
## Implementation Decisions

### Navigation destinations
- Same logical destinations across all breakpoints, rendered differently per form factor
- **Unified destinations:** Home, My Recipes, Collections, Scan Recipe, Family, Profile/Settings
- Search lives in the top bar/header on all breakpoints — NOT a tab or sidebar item
- Favorites is NOT a separate destination — it's a toggle within My Recipes
- Collections is a sidebar item on web but NOT a mobile tab (reachable from Home or My Recipes on mobile)

### Mobile tab bar (5 tabs)
- **Home | My Recipes | Scan | Family | Profile**
- Icons from cookbook.pen: home, book-open, camera, heart, user
- Active color: $accent-warm, inactive: $text-disabled
- Tab bar height: 84px, padding [12, 32, 28, 32], white bg, top border 1px $border-subtle

### Web sidebar (260px, always visible)
- **Home | My Recipes | Collections | Scan Recipe | Family | Settings**
- Icons from cookbook.pen: layout-grid, book-open, folder, camera, heart/users, settings
- Sidebar: 260px width, $bg-card fill, padding [32, 24], gap 32, right border 1px $border-subtle
- Active item: $accent-warm bg with white text, cornerRadius 12, padding [10, 14]
- Always visible — no collapse/toggle

### Tablet navigation
- Uses bottom tab bar (same as mobile — from cookbook.pen spec)
- Header bar at top with screen title + action buttons (no sidebar)

### My Recipes screen
- Filtered to current user's own recipes (not a global browse)
- Includes toggles for: Favorites, and Family filter (user can be in multiple families)

### Profile vs Settings
- Same screen, different label per breakpoint
- Mobile tab label: "Profile"
- Web sidebar label: "Settings"
- Screen content: avatar, display name, email, unit preference, logout (from Phase 8 design)

### Scan tab behavior
- Opens as **modal overlay** on all breakpoints (not a regular tab destination)
- Visually distinguished in the tab bar as the primary action
- After saving a scanned recipe, user navigates to the **draft review** screen

### Route group structure
- `(tabs)/` — authenticated main app (Home, My Recipes, Collections, Scan, Family, Profile)
- `(auth)/` — login, signup, forgot-password (unauthenticated)
- `(public)/` — public recipe browsing (Phase 11, stub only in Phase 9)

### PageContainer
- Wraps every screen with consistent max-width and horizontal padding per breakpoint
- Values derived from cookbook.pen:
  - Mobile: 20px horizontal padding, full width
  - Tablet: 32px horizontal padding, full width
  - Web: 40px padding inside main content area (fills remaining width after 260px sidebar)
  - Form screens: max-width 600px centered (from cookbook.pen dwForm)
  - Content-heavy screens: max-width 960px centered (from cookbook.pen contentRow)

### Claude's Discretion
- Exact Expo Router file structure for the (tabs)/ route group
- Tab bar animation and transition behavior
- How to handle the Scan modal integration with Expo Router
- Search bar placement details in the header
- How Collections is accessed on mobile (from Home quick actions, or nested in My Recipes)
- Sidebar logo/branding area implementation details

</decisions>

<specifics>
## Specific Ideas

- Mobile tab bar icons match the cookbook.pen TabBar component exactly (5 lucide icons at 24x24)
- Web sidebar matches the cookbook.pen sidebar exactly (logo area + nav items + optional ad banner at bottom)
- Tablet uses the same bottom tab bar as mobile but with a richer header area per screen
- The scan modal should feel like an overlay action, not a navigation destination — tapping Scan opens the camera/upload flow over the current screen

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `useBreakpoint()` hook (`src/lib/hooks/useBreakpoint.ts`): Returns `{ breakpoint: 'mobile' | 'tablet' | 'web', width }` — ready to drive nav switching
- `tokens.ts` (`src/lib/tokens.ts`): All design tokens including colors ($accent-warm, $bg-card, $border-subtle, etc.), radii, fonts
- `Component/TabBar` in cookbook.pen: Reusable component with 5 icon tabs at 84px height
- Existing `(scan)/` route group: Has index.tsx and draft/[id].tsx — scan flow already partially structured
- Existing `(auth)/` route group: login, signup, logout, reset-password, forgot-password
- Existing `(family)/` route group: family index and family/[id]

### Established Patterns
- Expo Router v4 file-based routing with `_layout.tsx` files per route group
- Inline style objects (no Tailwind CSS in React Native)
- All dimension-sensitive styles computed inside components from `useBreakpoint()` — NOT cached in StyleSheet.create
- `SessionProvider` wraps all routes at root level
- Font loading in root `_layout.tsx` with SplashScreen hold pattern

### Integration Points
- Root `app/_layout.tsx` must change from `<Stack>` to conditional navigation (tabs vs sidebar based on breakpoint)
- Existing route files under `app/` need to move into `(tabs)/` route group
- `(scan)/` routes become modal presentation within the tab navigator
- `useBreakpoint()` drives which nav chrome renders (TabBar, Header, or Sidebar)
- Tokens from `tokens.ts` used for all nav component styling

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 09-navigation-restructure*
*Context gathered: 2026-03-03*
