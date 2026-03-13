---
id: T02
parent: S03
milestone: M003
provides:
  - DraftEditor.tsx fully migrated to design tokens, responsive layout via useBreakpoint, no hardcoded hex colors, no StyleSheet.create
key_files:
  - src/features/scan/DraftEditor.tsx
  - src/lib/tokens.ts
key_decisions:
  - Added semantic error/warning color tokens (errorBg, errorBorder, errorTitle, errorText, warningBg, warningBorder, warningTitle, warningText) to tokens.ts instead of keeping hardcoded hex values in component — these are reused by DraftManager.tsx (T03)
  - Mapped original Tailwind grays to closest design tokens — #374151 (label color) mapped to textPrimary rather than introducing a new token, since the visual difference is negligible
  - Used fontFamily tokens (fontFamilyDisplay, fontFamilyBody, fontFamilyBodyMedium, fontFamilyBodyBold) to replace all fontWeight declarations — weight is encoded in the font family name
  - Header row switches from row to column layout on mobile via isMobile conditional for better narrow-screen usability
patterns_established:
  - Inline responsive styles computed from useBreakpoint() — contentPadding/cardPadding/metadataGap derived from breakpoint at top of component
  - Semantic state color tokens (error/warning) in tokens.ts for reuse across scan components
observability_surfaces:
  - None — purely visual changes
duration: 15min
verification_result: passed
completed_at: 2026-03-12
blocker_discovered: false
---

# T02: Migrate DraftEditor to design tokens and responsive layout

**Replaced all 48 hardcoded hex colors with design tokens, removed StyleSheet.create, and added responsive layout via useBreakpoint() in DraftEditor.tsx**

## What Happened

Migrated DraftEditor.tsx (~950 lines) from hardcoded Tailwind-gray hex colors and a static `StyleSheet.create` block to the project's design token system with responsive layout awareness:

1. **Color token migration**: Mapped all 48 hex color references to design tokens — `#3b82f6` → `accentBlue`, `#111827`/`#374151` → `textPrimary`, `#6b7280` → `textSecondary`, `#9ca3af` → `textTertiary`, `#d1d5db`/`#e5e7eb` → `borderDefault`, `#ef4444` → `accentCoral`, `#f3f4f6` → `bgCard`/`borderSubtle`, `#ffffff` → `white`, shadow via `shadowMd`.

2. **Error/warning tokens**: Added 8 new semantic state color tokens to `tokens.ts` (errorBg, errorBorder, errorTitle, errorText, warningBg, warningBorder, warningTitle, warningText) to replace hardcoded feedback card colors. These are also used by DraftManager.tsx.

3. **StyleSheet.create removal**: Deleted the entire ~200-line StyleSheet.create block and replaced all `styles.X` references with inline style objects using tokens.

4. **Responsive layout**: Added `useBreakpoint()` with `isMobile`/`isWeb` flags. Content padding adapts (16/24/32), card padding adapts (16/20/24), metadata grid gap widens on tablet/web, container maxWidth constrained to 800px on web, header row wraps to column on mobile.

5. **Font family tokens**: Replaced all raw `fontWeight` declarations with font family token constants (fontFamilyDisplay for headings, fontFamilyBodyBold for button text, fontFamilyBodyMedium for labels, fontFamilyBody for body text).

All editing logic (auto-save, undo history, ingredient/instruction CRUD, draft management handlers) was left completely untouched.

## Verification

- `rg '#[0-9a-fA-F]{6}' src/features/scan/DraftEditor.tsx` — zero results ✅
- `rg 'StyleSheet.create' src/features/scan/DraftEditor.tsx` — zero results ✅
- `rg 'useBreakpoint' src/features/scan/DraftEditor.tsx` — 2 results (import + usage) ✅
- `rg 'fontWeight:' src/features/scan/DraftEditor.tsx` — zero results (all encoded in font family tokens) ✅
- `npx tsc --noEmit` — exits 0 ✅
- `npx jest --ci` — 502 tests pass ✅

## Diagnostics

None — purely visual changes. Future agents can audit for hex color regressions with `rg '#[0-9a-fA-F]{6}' src/features/scan/DraftEditor.tsx`.

## Deviations

- Added 8 semantic state color tokens (error/warning) to `tokens.ts` — not in the original plan's estimated 1 file, but necessary to eliminate hex colors from DraftEditor.tsx since no token equivalents existed. These tokens will also be consumed by DraftManager.tsx in T03.

## Known Issues

None.

## Files Created/Modified

- `src/features/scan/DraftEditor.tsx` — Fully migrated to design tokens, responsive layout, no hardcoded colors, no StyleSheet.create
- `src/lib/tokens.ts` — Added 8 semantic state color tokens (errorBg, errorBorder, errorTitle, errorText, warningBg, warningBorder, warningTitle, warningText)
