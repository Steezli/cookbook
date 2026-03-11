---
estimated_steps: 5
estimated_files: 5
---

# T02: Add root ErrorBoundary and style +not-found with design tokens

**Slice:** S05 — UX Polish
**Milestone:** M002

## Description

No React error boundary exists anywhere in the app — unhandled JS errors in any screen component crash the entire app with no recovery path. This task adds a root-level ErrorBoundary with a styled fallback UI, and restyled `+not-found.tsx` to use the design token system (it's the only screen using hardcoded style values). Both the ErrorBoundary fallback and the not-found page should match the app's Pencil design language.

## Steps

1. Open `cookbook.pen` in Pencil and inspect the design system for: color palette (backgrounds, text colors, accent colors), typography (font families, sizes), spacing patterns, and any error/empty state designs. Screenshot relevant screens for reference. Use these patterns to inform the ErrorBoundary fallback and not-found page styling.

2. Create `src/components/ErrorBoundary.tsx` — a React class component (functional components can't use `componentDidCatch`). It should:
   - Render children normally when no error
   - Catch errors via `componentDidCatch(error, errorInfo)` and log `console.error('[ErrorBoundary]', error, errorInfo.componentStack)`
   - Render a styled fallback using design tokens from `src/lib/tokens.ts` matching the Pencil design language: centered content, app logo or icon, "Something went wrong" heading, error description text, and a "Try Again" Pressable button that calls `this.setState({ hasError: false })`
   - Include `accessibilityRole` and `accessibilityLabel` on the Try Again button

3. Write `src/components/__tests__/ErrorBoundary.test.ts` with tests:
   - Renders children when no error is thrown
   - Catches error and renders fallback UI with "Something went wrong" text
   - "Try Again" resets error state and re-renders children
   - Logs error via console.error with '[ErrorBoundary]' prefix

4. Mount ErrorBoundary in `app/_layout.tsx` — wrap it around the `<Stack>` (inside SafeAreaProvider and SessionProvider so those still work during error recovery). Restyle `app/+not-found.tsx` with design tokens: import colors (`bgPage`, `textPrimary`, `textSecondary`, `accentBlue`), fonts (`fontFamilyDisplay`, `fontFamilyBody`), and spacing from `src/lib/tokens.ts`. Match the visual style of other screens.

5. Run `npx jest src/components/__tests__/ErrorBoundary.test.ts` then `npx jest --passWithNoTests` for full suite. Run `npx tsc --noEmit`. Start dev server and verify: navigate to invalid route → see styled not-found page using design tokens.

## Must-Haves

- [ ] ErrorBoundary class component in `src/components/ErrorBoundary.tsx`
- [ ] Fallback UI styled with design tokens matching Pencil design language
- [ ] componentDidCatch logs `[ErrorBoundary]` with error and component stack
- [ ] "Try Again" button resets error state
- [ ] ErrorBoundary mounted in root layout wrapping the Stack
- [ ] `+not-found.tsx` restyled with design tokens (no hardcoded values)
- [ ] Tests for ErrorBoundary passing
- [ ] Zero TypeScript errors

## Verification

- `npx jest src/components/__tests__/ErrorBoundary.test.ts` — all tests pass
- `npx jest --passWithNoTests` — full suite passes, no regressions
- `npx tsc --noEmit` — zero errors
- Browser: navigate to `/nonexistent-route` → styled not-found page with design tokens
- `rg 'hardcoded' app/+not-found.tsx` — zero matches (all styles use tokens)

## Observability Impact

- Signals added/changed: `console.error('[ErrorBoundary]', error, componentStack)` on unhandled errors — surfaces crash details for debugging
- How a future agent inspects this: ErrorBoundary fallback UI visibility means a screen component crashed. Console error includes the component stack trace pointing to the failing component. Browser DevTools React tab shows ErrorBoundary state.
- Failure state exposed: Previously invisible crashes now show a styled fallback with "Try Again" recovery, and the error + stack are logged to console.

## Inputs

- `src/lib/tokens.ts` — design tokens for colors, fonts, spacing, radii, shadows
- `app/_layout.tsx` — root layout to mount ErrorBoundary in (from T01, now includes consent sequencing)
- `app/+not-found.tsx` — currently uses plain StyleSheet with hardcoded values
- `cookbook.pen` — Pencil design file for visual reference (inspect via mac-tools)

## Expected Output

- `src/components/ErrorBoundary.tsx` — new ErrorBoundary class component with styled fallback
- `src/components/__tests__/ErrorBoundary.test.ts` — test suite for ErrorBoundary behavior
- `app/_layout.tsx` — ErrorBoundary wrapping Stack navigator
- `app/+not-found.tsx` — restyled with design tokens, matching app aesthetic
