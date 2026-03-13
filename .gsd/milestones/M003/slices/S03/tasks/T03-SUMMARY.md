---
id: T03
parent: S03
milestone: M003
provides:
  - DraftManager.tsx fully migrated to design tokens, Pressable, responsive modals, font tokens, no hardcoded hex colors, no StyleSheet.create
key_files:
  - src/features/scan/DraftManager.tsx
  - src/lib/tokens.ts
key_decisions:
  - Added draft-status badge color tokens (statusReadyBg/Text, statusReviewBg/Text, statusEnhancedBg/Text) and accentPurple to tokens.ts rather than keeping as local constants in DraftManager — ensures zero hardcoded hex colors in component file per verification requirement
  - Used opacity multiplication pattern for disabled+pressed state (opacity: (pressed ? 0.7 : 1) * (disabled ? 0.5 : 1)) rather than separate disabled style — avoids needing a separate style object for the combined state
  - Button grid uses flex:1 on non-mobile (4-column row) and percentage minWidth on mobile (2x2 wrap) via useBreakpoint
patterns_established:
  - Pressable with ({ pressed }) => style function pattern for all interactive elements (consistent with rest of app)
  - Modal responsive sizing: modalMaxWidth 560px on tablet/web, 100% on mobile; modalPadding 28 on tablet/web, 20 on mobile
observability_surfaces:
  - None — purely visual changes
duration: 1 context window
verification_result: passed
completed_at: 2026-03-12
blocker_discovered: false
---

# T03: Migrate DraftManager to design tokens, Pressable, and responsive modals

**Replaced all TouchableOpacity with Pressable, migrated all hardcoded hex colors to design tokens, removed StyleSheet.create, and added responsive modal/button layout via useBreakpoint() in DraftManager.tsx**

## What Happened

Migrated DraftManager.tsx from the deprecated TouchableOpacity + StyleSheet.create + hardcoded hex color pattern to the project-standard Pressable + inline token-based styles + useBreakpoint() pattern.

Key changes:
- **TouchableOpacity → Pressable**: All 7 TouchableOpacity instances replaced with Pressable using `({ pressed }) => [{ opacity: pressed ? 0.7 : 1, ...baseStyles }]` pattern
- **Hex colors → tokens**: All 27 hardcoded hex color values replaced with token imports. Colors without exact token matches (draft-status badge colors, accentPurple) were added to tokens.ts as new exports rather than local constants.
- **StyleSheet.create → inline**: Entire 180-line StyleSheet.create block removed. All styles are now inline objects using token values.
- **Font tokens**: All fontWeight/fontSize replaced with fontFamily token constants (fontFamilyDisplay for headings, fontFamilyBody/Medium/Bold for body, fontSizeXs/Sm/Base/Lg for sizes).
- **Responsive layout**: useBreakpoint() drives modal maxWidth (560px on web/tablet, 100% on mobile), modal padding (28 vs 20), and button grid layout (4-column row on web, 2x2 wrap on mobile).

## Verification

All verification checks passed:
- `rg 'TouchableOpacity' src/features/scan/DraftManager.tsx` — zero results ✓
- `rg '#[0-9a-fA-F]{6}' src/features/scan/DraftManager.tsx` — zero results ✓
- `rg 'StyleSheet.create' src/features/scan/DraftManager.tsx` — zero results ✓
- `rg 'useBreakpoint' src/features/scan/DraftManager.tsx` — 2 results ✓
- `npx tsc --noEmit` — exits 0, no errors ✓
- `npx jest --ci` — 502 tests pass ✓

Slice-level checks also pass:
- DraftEditor.tsx — zero hex colors, zero StyleSheet.create, useBreakpoint present ✓
- DraftManager.tsx — zero hex colors, zero TouchableOpacity, zero StyleSheet.create ✓

## Diagnostics

None — purely visual changes. Future agents can audit for hex color regressions with `rg '#[0-9a-fA-F]{6}' src/features/scan/DraftManager.tsx`.

## Deviations

- Draft-status badge colors and accentPurple were added to tokens.ts rather than kept as local named constants in DraftManager.tsx. The plan suggested local constants, but the verification requirement of zero hex colors in DraftManager.tsx took precedence. These are semantic tokens that could be reused by other status-display components.

## Known Issues

None.

## Files Created/Modified

- `src/features/scan/DraftManager.tsx` — Full migration: TouchableOpacity→Pressable, hardcoded colors→tokens, StyleSheet.create→inline, added useBreakpoint for responsive modals/buttons, font tokens for typography
- `src/lib/tokens.ts` — Added 7 new token exports: accentPurple, statusReadyBg, statusReadyText, statusReviewBg, statusReviewText, statusEnhancedBg, statusEnhancedText
