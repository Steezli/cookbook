---
id: T02
parent: S05
milestone: M002
provides:
  - Root ErrorBoundary with styled fallback and Try Again recovery
  - "+not-found.tsx" restyled with design tokens (no hardcoded style values)
  - 9 new ErrorBoundary tests
key_files:
  - src/components/ErrorBoundary.tsx
  - src/components/__tests__/ErrorBoundary.test.ts
  - app/_layout.tsx
  - app/+not-found.tsx
key_decisions:
  - ErrorBoundary tested at class/lifecycle level (no React rendering env) — consistent with project test pattern (node env, ts-jest, no DOM)
  - Used Link with style prop instead of Link asChild+Pressable for not-found button — asChild absorbs Pressable and drops its styles on web
patterns_established:
  - ErrorBoundary fallback UI pattern — centered layout with emoji, heading (fontFamilyDisplay), description (fontFamilyBody), accentWarm pill button
  - Design-token-only screen styling — all colors, fonts, radii, spacing from src/lib/tokens.ts
observability_surfaces:
  - "console.error('[ErrorBoundary]', error, componentStack)" on unhandled component errors — surfaces crash location and stack
  - ErrorBoundary fallback UI visibility indicates a screen component crashed
duration: 12min
verification_result: passed
completed_at: 2026-03-11
blocker_discovered: false
---

# T02: Add root ErrorBoundary and style +not-found with design tokens

**Added root-level ErrorBoundary with styled fallback + Try Again recovery, and restyled +not-found.tsx to use design tokens matching Pencil design language.**

## What Happened

Created `src/components/ErrorBoundary.tsx` as a React class component that catches unhandled JS errors in the component tree. The fallback UI shows an emoji, "Something went wrong" heading, description text, and an accentWarm pill-shaped "Try Again" button — all styled with design tokens from `src/lib/tokens.ts`. The button includes `accessibilityRole` and `accessibilityLabel`. `componentDidCatch` logs `[ErrorBoundary]` with the error and component stack to `console.error`.

Mounted ErrorBoundary in `app/_layout.tsx` wrapping the `<Stack>` navigator, inside SafeAreaProvider and SessionProvider so those still function during error recovery.

Restyled `app/+not-found.tsx` to use design tokens — replaced all hardcoded colors, fonts, sizes, and radii with imports from `src/lib/tokens.ts`. Added a cooking-themed emoji (🍳), descriptive copy, and an accentWarm pill-shaped "Go Home" link button matching the app's Pencil design language.

Wrote 9 tests in `src/components/__tests__/ErrorBoundary.test.ts` covering: initial state, children rendering, error catching with fallback, `componentDidCatch` logging, Try Again reset, and error/recovery cycling.

## Verification

- `npx jest src/components/__tests__/ErrorBoundary.test.ts` — 9/9 tests pass
- `npx jest --passWithNoTests` — 483 tests pass, 22 suites, zero failures
- `npx tsc --noEmit` — zero TypeScript errors
- Browser: navigated to `/nonexistent-route` → styled not-found page with emoji, design token fonts/colors, accentWarm pill button
- Browser assertions: "Page not found" text visible, "Go Home" text visible, `a[aria-label='Go home']` selector visible, zero console errors
- `grep -E "'#[0-9a-fA-F]" app/+not-found.tsx` — zero hardcoded color values

### Slice-level checks (T02 is intermediate task):
- ✅ All 483 tests pass (474+ baseline exceeded)
- ✅ `npx tsc --noEmit` clean
- ✅ `+not-found.tsx` uses design token colors/fonts (visual + assertion verified)
- ✅ ErrorBoundary mounted at root, wrapping Stack
- ⏳ TouchableOpacity migration in DraftEditor — different task scope (T03)
- ✅ `accessibilityLabel` count: 6 (up from 2-file baseline)

## Diagnostics

- **ErrorBoundary crash detection**: Check browser console for `[ErrorBoundary]` entries — includes full error + component stack trace pointing to the failing component
- **Fallback visibility**: If the ErrorBoundary fallback UI is visible ("Something went wrong" + "Try Again"), a screen component has crashed
- **React DevTools**: ErrorBoundary state `hasError: true` indicates active error catch
- **Not-found page**: Navigate to any invalid route to see the styled 404 page

## Deviations

- Used `Link` with direct style prop instead of `Link asChild` wrapping `Pressable` for the not-found button — the `asChild` pattern absorbs the Pressable and drops its background/radius styles on web, rendering an unstyled anchor. Direct `Link` with style prop renders correctly across platforms.
- Removed `fontSize3xl` import from +not-found.tsx (initially imported but not needed after settling on `fontSize2xl` for the heading).

## Known Issues

None.

## Files Created/Modified

- `src/components/ErrorBoundary.tsx` — new ErrorBoundary class component with styled fallback UI using design tokens
- `src/components/__tests__/ErrorBoundary.test.ts` — 9 tests covering ErrorBoundary lifecycle, error catching, logging, and recovery
- `app/_layout.tsx` — mounted ErrorBoundary wrapping Stack (inside SafeAreaProvider + SessionProvider)
- `app/+not-found.tsx` — restyled with design tokens, cooking-themed emoji, descriptive copy, accentWarm pill button
