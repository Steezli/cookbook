# Phase 12: Remaining Screens - Context

**Gathered:** 2026-03-08
**Status:** Ready for planning

<domain>
## Phase Boundary

All screens not covered in Phase 10 — collections (list + detail + create), family management, scan upload, draft review, auth screens (login, signup, forgot password), profile/settings, and invite — rebuilt to match cookbook.pen at all three breakpoints (mobile/tablet/web). Includes scan photo display in draft review and social login integration.

</domain>

<decisions>
## Implementation Decisions

### Collections
- Follow cookbook.pen exactly for collection list view layout and styling
- Collection detail screen uses RecipeCard grid — if existing RecipeCard doesn't match .pen, update RecipeCard to match first, then reuse everywhere
- Create collection flow follows cookbook.pen exactly (modal or full screen — whatever .pen shows)
- Adding recipes to collections: follow cookbook.pen or Claude's discretion on the UX flow

### Scan & Draft Review
- Scan flow presentation (modal vs full screen) follows cookbook.pen exactly
- Draft review follows Phase 8 decision + cookbook.pen: collapsible photo on mobile (starts visible, collapses to thumbnail on scroll), side-by-side photo + fields on tablet/web
- Multi-photo scans: follow cookbook.pen or Claude's discretion for gallery/carousel UX
- Scan upload supports both camera capture and photo library selection

### Auth Screens
- Follow cookbook.pen exactly for all styling, layout, and hero content
- Layout pattern from Phase 8: full-screen form on mobile, centered card on tablet, split hero + form on web
- Social login buttons included: Google, Apple, and Facebook
- Social auth via Supabase OAuth integration

### Family Management
- Follow cookbook.pen exactly for family member list, roles, invite flow, and admin controls
- Keep existing functionality: member list, roles, invite, remove member, transfer ownership

### Profile/Settings
- Follow cookbook.pen exactly for all fields and sections
- Phase 8 decided: single scrollable page with avatar, display name, email, unit preference, logout
- Net-new screen implementation matching .pen spec at all 3 breakpoints

### Invite
- Family-scoped invites: each invite link tied to a specific family
- Dual-path invite handling: existing users join family directly; new users redirect to signup with token preserved, then auto-join family on account creation
- Native share sheet (expo-sharing / Share API) for sending invite links, with copy-to-clipboard as fallback
- Follow cookbook.pen for visual design; Phase 8 decided: link sharing primary, optional email entry below

### Claude's Discretion
- Exact empty state designs across all Phase 12 screens
- Loading skeleton patterns
- Error state handling
- Multi-photo gallery implementation approach for draft review
- Collection "add recipe" UX flow direction (from recipe detail vs from collection detail)
- Social auth SDK integration details (native vs web OAuth flows)
- Invite token preservation through signup flow implementation details

</decisions>

<specifics>
## Specific Ideas

- cookbook.pen is the absolute source of truth for all visual decisions — every screen follows .pen exactly
- If existing components (like RecipeCard) don't match what cookbook.pen shows, update the component to match .pen first, then reuse it
- Invite flow should handle both existing and new users gracefully — existing user opens link and joins; new user goes through signup with the invite token preserved so they auto-join the family after account creation
- Social login (Google, Apple, Facebook) on all auth screens — reduces signup friction for a family-oriented app

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `RecipeCard` (src/components/recipes/RecipeCard.tsx): Responsive recipe card — verify against .pen, update if needed
- `PageContainer` (src/components/nav/PageContainer.tsx): Responsive padding/max-width per breakpoint
- `useBreakpoint()` (src/lib/hooks/useBreakpoint.ts): Returns mobile/tablet/web + width
- `tokens.ts` (src/lib/tokens.ts): All design tokens (colors, fonts, radii, shadows, font sizes)
- `DraftReview` + `DraftEditor` (src/features/scans/): Existing draft review components — need .pen styling + photo display
- Collection APIs (src/features/collections/): Existing CRUD for collections
- Family APIs (src/features/family/): Existing family management logic
- Auth session (src/features/auth/session.ts): Session provider, Supabase auth
- Invite token handler (app/(tabs)/invite/[token].tsx): Existing token-based invite acceptance

### Established Patterns
- Inline style objects (no Tailwind CSS in React Native)
- All dimension-sensitive styles via useBreakpoint() — never in StyleSheet.create
- Expo Router v4 file-based routing with _layout.tsx per route group
- FlatList on web: flexGrow:1, flexBasis:0 + key={numColumns}
- Pure utility module pattern (*Utils.ts) for testable logic extraction
- Stack layouts with headerShown:false when screens manage their own headers

### Integration Points
- Collections: app/(tabs)/collections/ — index.tsx (132 lines), [id].tsx (394 lines), create.tsx, _layout.tsx
- Family: app/(tabs)/family/ — index.tsx (168 lines), [id].tsx (400 lines), _layout.tsx
- Scan: app/scan/ — index.tsx, draft/[id].tsx, _layout.tsx
- Auth: app/(auth)/ — login.tsx (101 lines), signup.tsx (112 lines), forgot-password.tsx (103 lines)
- Profile: app/(tabs)/profile.tsx (242 lines) — hardcoded styles, needs full rebuild
- Invite: app/(tabs)/invite/[token].tsx (112 lines)
- MobileTabBar + WebSidebar already handle breakpoint-aware navigation chrome

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 12-remaining-screens*
*Context gathered: 2026-03-08*
