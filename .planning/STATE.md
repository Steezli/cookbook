---
gsd_state_version: 1.0
milestone: v1.1
milestone_name: Design & Responsive
status: executing
last_updated: "2026-03-04T07:11:01.104Z"
last_activity: 2026-03-04 — 09-03 nav chrome built (MobileTabBar, WebSidebar, TabButton, SidebarItem); awaiting human verification
progress:
  total_phases: 6
  completed_phases: 2
  total_plans: 6
  completed_plans: 6
  percent: 83
---

# Project State

**Initialized:** 2026-02-02

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-03)

**Core value:** Families can save and share treasured recipes (like Grandma's) without losing control over who gets to see them.
**Current focus:** Phase 9 — Navigation Restructure

## Current Position

Phase: 9 of 13 (Navigation Restructure)
Plan: 3 of 3 — code complete, awaiting human verification (Task 3 checkpoint)
Status: At checkpoint — human-verify adaptive navigation at all breakpoints
Last activity: 2026-03-04 — 09-03 nav chrome built (MobileTabBar, WebSidebar, TabButton, SidebarItem); awaiting human verification

Progress: [████████░░] 83%

## Pending TODOs

- **Email Verification UX** (AUTH enhancement)
  - Feature request: `.planning/features/email-verification-ux-improvements.md`
  - Impact: High (affects all new signups)
  - Effort: Low-Medium (~2-3 hours)
  - Queued for: v1.1 polish or post-v1.1

- **Multi-photo migration deployment**
  - Apply `supabase/migrations/20260206000000_add_multi_photo_support.sql` to remote Supabase
  - Required before multi-image upload works in production

## Accumulated Context

### From v1.0

- Privacy is the product. Treat access control as test-worthy, not "UI-only."
- Scanning is draft-first: users must be able to fix any extracted field quickly.
- Ads must never pollute family/private flows; public browsing is the only ad surface.
- **Deployment reminder:** Always apply database migrations to remote Supabase after local testing/verification.
- Tailwind CSS is NOT available in React Native — use inline style objects
- position:fixed does not work in React Native — use Modal component
- Expo Router for navigation, typed routes
- Supabase RLS enforces all access control server-side

### Phase 8 Decisions

- **08-01 Token naming:** Flat-with-category-prefix (accentBlue, bgCard, radiusMd) over nested objects — ergonomic for StyleSheet.create, no destructuring overhead
- **08-01 Breakpoint hook:** Pure getBreakpoint(width) extracted from hook for Jest node-environment testability; react-native mocked in test file
- **08-02 Font loading:** `useFonts` from `expo-font` directly (single call) rather than per-package hooks; loads BricolageGrotesque 400/600/700 + DMSans 400/500/700 at app root via `app/_layout.tsx`
- **Splash screen pattern:** `SplashScreen.preventAutoHideAsync()` at module level + `return null` guard + `hideAsync()` in `useEffect` — prevents FOUT; graceful degradation on font error

### Phase 9 Decisions

- **09-01 tsx test config:** ts-jest transform with `jsx: 'react'` override — tsconfig extends expo/tsconfig.base (jsx: react-native) which requires a native renderer; for node environment testing pure functions, jsx:react compiles to React.createElement without renderer
- **09-01 react-native mock:** `__mocks__/react-native.js` stub mapped via moduleNameMapper in jest.config.js — applies globally to all nav component tests without per-file jest.mock() calls
- **09-01 getContainerStyle exported:** Pure function extracted from PageContainer and exported for direct unit testing; no React renderer required, works in node jest environment
- **09-02 Hidden TabList pattern:** `height:0, overflow:hidden, position:absolute` registers all 5 tab routes with expo-router/ui without visible UI chrome — Plan 03 replaces inline placeholders with real MobileTabBar/WebSidebar
- **09-02 Route flattening:** `(family)/family/[id]` double-nesting flattened to `(tabs)/family/[id]`; (tabs) prefix stripped from URLs so `/family` resolves to the family tab; all internal links updated
- **09-03 Scan button as plain Pressable:** TabTrigger onPress behavior is ambiguous (override vs supplement tab-switch); plain Pressable calling router.push('/(scan)') is unambiguous per research recommendation
- **09-03 Collections as plain SidebarItem:** Not a registered tab route — TabTrigger without TabList entry would be undefined behavior; plain onPress + router.push('/collections') is correct
- **09-03 forwardRef pattern for nav components:** TabButton and SidebarItem use React.forwardRef<View, TabTriggerSlotProps & OwnProps> for expo-router/ui asChild compatibility; React.cloneElement passes {color, size} to lucide icon children

### For v1.1

- All dimension-sensitive styles must be computed inside components from `useBreakpoint()` — NOT cached in `StyleSheet.create`
- `AdSlot` must be platform-branched (`AdSlot.native.tsx` / `AdSlot.web.tsx`) from the start — AdMob SDK breaks web build if imported directly
- 5 missing screen designs (Sign Up, Forgot Password, Profile/Settings, Invite, Draft Review) must exist in cookbook.pen **before** Phase 12 implementation begins
- `useEntitlement()` for scan gating must read from Supabase `profiles.scan_entitlement` — not a hardcoded route redirect (scan gating is a hypothesis, must be bypassable)
- FlatList inside flex containers on web: use `flexGrow: 1, flexBasis: 0` instead of `flex: 1`; set `key={numColumns}` when numColumns changes

### Blockers / Watch Items

- **Phase 13 (Advertising):** Verify AdMob config plugin behavior on Expo SDK 52 early in the phase — reported issues on SDK 54 but lower risk here; validate before full integration
- ~~**Phase 8 blocker (design):** Tablet nav pattern (768px) is ambiguous in cookbook.pen~~ — **Resolved** in 08-03 (tablet nav now consistent across all screens)

## Workflow Preferences

See: .planning/config.json

## Planning Artifacts

- Project: .planning/PROJECT.md
- Research: .planning/research/
- Requirements: .planning/REQUIREMENTS.md
- Roadmap: .planning/ROADMAP.md
- Design: cookbook.pen
