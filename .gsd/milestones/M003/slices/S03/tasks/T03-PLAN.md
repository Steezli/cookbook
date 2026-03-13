---
estimated_steps: 5
estimated_files: 1
---

# T03: Migrate DraftManager to design tokens, Pressable, and responsive modals

**Slice:** S03 — Scan UI Polish
**Milestone:** M003

## Description

DraftManager.tsx (633 lines) uses `TouchableOpacity` (deprecated pattern — every other component uses `Pressable`), hardcoded Tailwind-gray hex colors in a `StyleSheet.create` block, and non-responsive modal styling. This task replaces all `TouchableOpacity` with `Pressable`, migrates all hardcoded colors to design tokens, removes `StyleSheet.create`, adds `useBreakpoint()` for responsive modal widths and button grid layout, and uses font tokens for typography. All convert/discard/save logic stays completely untouched.

## Steps

1. Read `src/features/scan/DraftManager.tsx`. Map every `TouchableOpacity` usage to `Pressable` with `({ pressed }) => [baseStyle, { opacity: pressed ? 0.7 : 1 }]` pattern. Remove `TouchableOpacity` from the import statement, ensure `Pressable` is imported.
2. Map every hardcoded hex color to its token: `#3b82f6` → `accentBlue`, `#4b5563` → `textSecondary`, `#7c3aed` → need to check — may use `accentBlue` or keep as a one-off if no matching token. `#ef4444` → `accentCoral`, `#111827` → `textPrimary`, `#374151` → `textPrimary`, `#6b7280` → `textSecondary`, `#9ca3af` → `textTertiary`, `#ffffff` → `white`/`bgPage`, `#dcfce7`/`#166534` → `badgeGreenBg`/`accentGreen`, `#dbeafe`/`#1e40af` → approximate to existing badge tokens, `#f3e8ff`/`#6b21a8` → may need a local const if no token exists. Status badge colors that don't have exact token matches get local named constants with comments explaining they're draft-status-specific.
3. Delete the `StyleSheet.create` block. Replace all `styles.X` references with inline style objects using tokens. Add `useBreakpoint()` and compute responsive styles: modal maxWidth wider on web (560px) vs mobile (full width minus padding), button grid stacks 2x2 on mobile, 4-column row on web.
4. Replace all `fontWeight`/`fontSize` with font token equivalents. Use `fontFamilyDisplay` for headings, `fontFamilyBody`/`fontFamilyBodyMedium`/`fontFamilyBodyBold` for body text.
5. Verify: `rg 'TouchableOpacity' src/features/scan/DraftManager.tsx` returns zero. `rg '#[0-9a-fA-F]{6}' src/features/scan/DraftManager.tsx` returns zero. `npx tsc --noEmit` passes. `npx jest --ci` — all tests pass.

## Must-Haves

- [ ] Zero `TouchableOpacity` usage — all replaced with `Pressable`
- [ ] Zero hardcoded hex color values
- [ ] `StyleSheet.create` removed
- [ ] `useBreakpoint()` used for responsive modal and button grid layout
- [ ] Font families use token constants
- [ ] All convert/discard/save logic unchanged
- [ ] `npx tsc --noEmit` passes
- [ ] `npx jest --ci` — 502+ tests pass

## Verification

- `rg 'TouchableOpacity' src/features/scan/DraftManager.tsx` — zero results
- `rg '#[0-9a-fA-F]{6}' src/features/scan/DraftManager.tsx` — zero results
- `rg 'StyleSheet.create' src/features/scan/DraftManager.tsx` — zero results
- `rg 'useBreakpoint' src/features/scan/DraftManager.tsx` — at least one result
- `npx tsc --noEmit` — exits 0
- `npx jest --ci` — 502+ tests pass

## Observability Impact

- Signals added/changed: None — purely visual changes
- How a future agent inspects this: `rg 'TouchableOpacity' src/features/scan/` to audit for deprecated pattern regressions
- Failure state exposed: None

## Inputs

- `src/features/scan/DraftManager.tsx` — current file with TouchableOpacity, StyleSheet.create, hardcoded colors
- `src/lib/tokens.ts` — design token exports
- `src/lib/hooks/useBreakpoint.ts` — breakpoint hook
- T02 output — T02 touched only DraftEditor.tsx, no conflicts

## Expected Output

- `src/features/scan/DraftManager.tsx` — fully token-based, Pressable-only, responsive modals, no hardcoded colors, no StyleSheet.create
