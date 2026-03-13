---
estimated_steps: 5
estimated_files: 1
---

# T02: Migrate DraftEditor to design tokens and responsive layout

**Slice:** S03 — Scan UI Polish
**Milestone:** M003

## Description

DraftEditor.tsx (950 lines) has 40+ hardcoded Tailwind-gray hex colors in a `StyleSheet.create` block, no breakpoint awareness, and renders identically at all screen sizes. This task replaces every hardcoded color with the corresponding design token from `@/lib/tokens`, removes the `StyleSheet.create` block (since responsive styles can't be cached at module scope), adds `useBreakpoint()` for responsive layout (wider padding, constrained max-width, adapted metadata grid on tablet/web), and uses font family tokens for typography. All editing logic (auto-save, undo history, ingredient/instruction CRUD) stays completely untouched — only the style layer changes.

## Steps

1. Read `src/features/scan/DraftEditor.tsx` and create a mapping of every hardcoded hex color to its token equivalent: `#3b82f6` → `accentBlue`, `#f3f4f6` → `bgCard`/`borderSubtle`, `#111827` → `textPrimary`, `#374151` → approximate to `textPrimary`, `#6b7280` → `textSecondary`, `#9ca3af` → `textTertiary`, `#d1d5db` → `borderDefault`, `#e5e7eb` → `borderDefault`, `#ef4444` → `accentCoral`, `#ffffff` → `white`/`bgPage`, `#000` → shadow token. Map all fontSize/fontWeight to token equivalents.
2. Add `import { useBreakpoint } from '@/lib/hooks/useBreakpoint'` and all needed token imports. Add `const { breakpoint } = useBreakpoint()` and `const isMobile = breakpoint === 'mobile'` at the top of the component.
3. Delete the entire `const styles = StyleSheet.create({ ... })` block. Replace every `styles.X` reference with an inline style object using tokens. For styles that don't vary by breakpoint (borderRadius, fontFamily), define as plain const objects above the component or inline. For responsive styles (padding, maxWidth, gap, grid widths), compute inline from breakpoint.
4. Add responsive behavior: `contentContainer` padding 16 on mobile, 24 on tablet, 32 on web. Container maxWidth on web (800px). Metadata grid: 2-column at all sizes but with wider gap on tablet/web. Card maxWidth constrained on web. Header row wraps to column on mobile.
5. Verify: `rg '#[0-9a-fA-F]{6}' src/features/scan/DraftEditor.tsx` returns zero results. `rg 'StyleSheet.create' src/features/scan/DraftEditor.tsx` returns zero results. `npx tsc --noEmit` passes. `npx jest --ci` — all 502+ tests pass.

## Must-Haves

- [ ] Zero hardcoded hex color values in DraftEditor.tsx
- [ ] `StyleSheet.create` removed — all styles inline or computed from tokens + breakpoint
- [ ] `useBreakpoint()` used for responsive layout decisions
- [ ] Font families use token constants (fontFamilyDisplay, fontFamilyBody, fontFamilyBodyMedium, fontFamilyBodyBold)
- [ ] Shadow styles use shadow tokens (shadowSm, shadowMd)
- [ ] All auto-save, undo history, and editing logic unchanged
- [ ] `npx tsc --noEmit` passes
- [ ] `npx jest --ci` — 502+ tests pass

## Verification

- `rg '#[0-9a-fA-F]{6}' src/features/scan/DraftEditor.tsx` — zero results
- `rg 'StyleSheet.create' src/features/scan/DraftEditor.tsx` — zero results
- `rg 'useBreakpoint' src/features/scan/DraftEditor.tsx` — at least one result
- `npx tsc --noEmit` — exits 0
- `npx jest --ci` — 502+ tests pass

## Observability Impact

- Signals added/changed: None — purely visual changes
- How a future agent inspects this: `rg '#[0-9a-fA-F]{6}'` to audit for hex color regressions
- Failure state exposed: None

## Inputs

- `src/features/scan/DraftEditor.tsx` — current file with StyleSheet.create and hardcoded colors
- `src/lib/tokens.ts` — design token exports (colors, fonts, radii, shadows)
- `src/lib/hooks/useBreakpoint.ts` — breakpoint hook returning 'mobile' | 'tablet' | 'web'
- T01 output — T01 touched only `app/scan/index.tsx`, no conflicts

## Expected Output

- `src/features/scan/DraftEditor.tsx` — fully token-based, responsive layout, no hardcoded colors, no StyleSheet.create
