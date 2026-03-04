# Phase 8: Design Foundation - Context

**Gathered:** 2026-03-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Design system primitives that all subsequent phases depend on: design tokens extracted from cookbook.pen, a responsive breakpoint hook, font loading, and 5 missing screen designs created in cookbook.pen (Sign Up, Forgot Password, Profile/Settings, Invite, Draft Review — all 3 breakpoints each).

</domain>

<decisions>
## Implementation Decisions

### Token scope
- Extract all 24 existing cookbook.pen `$` variables into `tokens.ts` as TypeScript constants
- Add a font size scale (named sizes mapped from actual .pen usage: xs, sm, base, lg, xl, 2xl, 3xl)
- Add shadow tokens (sm, md, lg) for consistent card/modal elevation
- No spacing scale — spacing stays ad-hoc per .pen design values
- Token structure (flat vs nested): Claude's discretion

### Missing screen designs (cookbook.pen)
- **Sign Up & Forgot Password**: Follow the same layout pattern as the existing Login screen (mobile = full-screen form, tablet = centered card on gray bg, web = split hero + form). Different fields/copy, same structure.
- **Profile/Settings**: Single scrollable page with avatar, display name, email, unit preference (metric/imperial), and logout button. Not sectioned.
- **Invite**: Link sharing as primary interaction (generate/copy invite link), with optional email entry below.
- **Draft Review**: Collapsible photo on mobile — photo shown initially, collapses to thumbnail as user scrolls into extracted fields. Tablet/web: side-by-side (photo left, fields right).

### Breakpoint thresholds
- Mobile: <640px
- Tablet: 640–1279px
- Web: 1280+
- Native detection via `useWindowDimensions` — iPad split-screen and multitasking adapt correctly
- Hook returns `{ breakpoint: 'mobile' | 'tablet' | 'web', width: number }`

### Claude's Discretion
- Token file structure (flat namespace vs nested by category)
- Font size scale exact values (derive from .pen screen analysis)
- Shadow token values
- Font loading implementation (splash hold, error fallback)
- Exact .pen design details for new screens (spacing, copy, icons) within the decided layout patterns

</decisions>

<specifics>
## Specific Ideas

- Auth screens (Sign Up, Forgot Password) should be visually cohesive with the existing Login screen — same layout bones, different content
- Draft Review collapsible photo: photo starts visible, collapses to a thumbnail as user scrolls into the form fields — keeps the scan reference accessible without eating mobile screen space
- Profile/Settings is intentionally simple — single page, no nested navigation

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- No existing tokens/theme/styles directories — this is fully greenfield
- No `@expo-google-fonts` installed yet — needs adding
- cookbook.pen already defines 24 design variables (colors, fonts, radii) and 8 reusable components

### Established Patterns
- Inline style objects (no Tailwind CSS on React Native)
- Expo Router for navigation (`expo-router` v4)
- `react-native-web` for web platform support
- Feature-based directory structure (`src/features/`, `src/lib/`)

### Integration Points
- `tokens.ts` will be imported by every screen in Phases 9–13
- `useBreakpoint()` will be used by navigation (Phase 9) and all screen rebuilds (Phases 10–12)
- Fonts must load in root `_layout.tsx` before any screen renders
- New .pen screen designs feed directly into Phase 12 (Remaining Screens) implementation

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 08-home-navigation-photo-polish*
*Context gathered: 2026-03-03*
