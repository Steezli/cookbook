# S03: Scan UI Polish

**Goal:** Web scan upload and multi-draft review UI looks web-native and polished at all breakpoints, using design tokens and responsive layouts throughout. iOS scan flow verified in simulator.
**Demo:** Open the scan upload page on web — drag-and-drop a file onto the upload zone, see it appear in the preview. Open the draft editor on a tablet or web-width browser — see wider layouts, proper spacing, and design-token colors instead of hardcoded Tailwind grays. All scan components render consistently with the rest of the app.

## Must-Haves

- Web scan upload has HTML5 drag-and-drop file drop zone with visual feedback (border/text change on drag hover)
- DraftEditor uses design tokens from `@/lib/tokens` — zero hardcoded hex colors
- DraftEditor uses `useBreakpoint()` for responsive layout (wider metadata grid, more padding on tablet/web)
- DraftManager uses design tokens — zero hardcoded hex colors
- DraftManager uses `Pressable` instead of `TouchableOpacity`
- DraftManager modals use token-based styling
- All 502+ tests pass, `npx tsc --noEmit` clean

## Proof Level

- This slice proves: integration (visual polish verified in running browser across breakpoints)
- Real runtime required: yes — browser verification at mobile/tablet/web widths
- Human/UAT required: no — agent can verify visual consistency via browser tools

## Verification

- `npx tsc --noEmit` — exits 0, all imports resolve
- `npx jest --ci` — 502+ tests pass (no regressions)
- `rg '#[0-9a-fA-F]{6}' src/features/scan/DraftEditor.tsx` — zero results (no hardcoded hex colors)
- `rg '#[0-9a-fA-F]{6}' src/features/scan/DraftManager.tsx` — zero results (no hardcoded hex colors)
- `rg 'TouchableOpacity' src/features/scan/DraftManager.tsx` — zero results (migrated to Pressable)
- `rg 'StyleSheet.create' src/features/scan/DraftEditor.tsx` — zero results (moved to inline responsive styles)
- `rg 'StyleSheet.create' src/features/scan/DraftManager.tsx` — zero results (moved to inline responsive styles)
- `rg 'useBreakpoint' src/features/scan/DraftEditor.tsx` — at least one result (breakpoint-aware)
- Browser verification: scan upload page at web width shows drag-and-drop zone, drag hover changes border style

## Observability / Diagnostics

- Runtime signals: none — purely visual polish, no new runtime behavior or state
- Inspection surfaces: browser DevTools for visual inspection; `rg` for token compliance auditing
- Failure visibility: TypeScript compiler catches import errors; `rg` for hex color auditing catches token regressions
- Redaction constraints: none

## Integration Closure

- Upstream surfaces consumed: `src/features/scan/` (consolidated in S01), `src/lib/tokens`, `src/lib/hooks/useBreakpoint`
- New wiring introduced in this slice: web-only drag-and-drop event handling on scan upload screen; design tokens integrated into DraftEditor and DraftManager
- What remains before the milestone is truly usable end-to-end: S04 (logging cleanup), S05 (full app audit + cross-platform verification)

## Tasks

- [x] **T01: Add web drag-and-drop to scan upload screen** `est:45m`
  - Why: QA-02 requires the web scan experience to feel native — currently there's no way to drop files onto the page, only a button that opens a system file dialog
  - Files: `app/scan/index.tsx`
  - Do: Add Platform.OS === 'web' conditional rendering for a drag-and-drop zone using a raw `<div>` wrapper (react-native-web 0.21 doesn't support drag events on View). Wire onDragOver/onDragLeave/onDrop events. Convert dropped Files to ImagePickerAsset-compatible objects. Add visual feedback: border color change + text change during drag hover. Keep mobile path unchanged. Verify with browser at web and mobile widths.
  - Verify: `npx tsc --noEmit` passes; browser test — drag a file over the upload zone, see visual feedback; drop a file, see it appear in the selected photos preview
  - Done when: web scan upload page accepts file drops with visual hover feedback, mobile path unchanged, tsc clean

- [x] **T02: Migrate DraftEditor to design tokens and responsive layout** `est:45m`
  - Why: QA-03 requires polished multi-draft UX — DraftEditor has 40+ hardcoded hex colors, no breakpoint awareness, and a static single-column layout at all screen sizes
  - Files: `src/features/scan/DraftEditor.tsx`
  - Do: Remove the entire `StyleSheet.create` block. Replace all hardcoded colors with token imports (textPrimary, textSecondary, bgCard, accentBlue, borderDefault, etc.). Add `useBreakpoint()` hook. Compute responsive styles inline: wider contentContainer padding on tablet/web, 2-column metadata grid that adapts width, wider maxWidth for the editor container. Replace hardcoded fontWeight strings with fontFamily tokens. Keep all auto-save, undo history, and editing logic completely untouched.
  - Verify: `rg '#[0-9a-fA-F]{6}' src/features/scan/DraftEditor.tsx` returns zero; `rg 'StyleSheet.create' src/features/scan/DraftEditor.tsx` returns zero; `rg 'useBreakpoint' src/features/scan/DraftEditor.tsx` returns match; `npx tsc --noEmit` passes; `npx jest --ci` — 502+ tests pass
  - Done when: DraftEditor has zero hardcoded hex colors, uses tokens + useBreakpoint for responsive layout, all tests pass

- [x] **T03: Migrate DraftManager to design tokens, Pressable, and responsive modals** `est:45m`
  - Why: QA-03 requires polished multi-draft UX — DraftManager uses TouchableOpacity (deprecated pattern), hardcoded colors, and non-responsive modal styling
  - Files: `src/features/scan/DraftManager.tsx`
  - Do: Replace all `TouchableOpacity` with `Pressable` using `({ pressed }) => style` pattern. Remove the `StyleSheet.create` block. Replace all hardcoded colors with token imports. Add `useBreakpoint()` for responsive modal width and button grid layout. Replace hardcoded fontWeight/fontSize with font tokens. Keep all convert/discard/save logic completely untouched.
  - Verify: `rg 'TouchableOpacity' src/features/scan/DraftManager.tsx` returns zero; `rg '#[0-9a-fA-F]{6}' src/features/scan/DraftManager.tsx` returns zero; `rg 'StyleSheet.create' src/features/scan/DraftManager.tsx` returns zero; `npx tsc --noEmit` passes; `npx jest --ci` — 502+ tests pass
  - Done when: DraftManager uses Pressable, design tokens, responsive modals — zero hardcoded colors, zero TouchableOpacity, all tests pass

- [x] **T04: Browser verification at all breakpoints and iOS simulator check** `est:30m`
  - Why: QA-02 and QA-03 require verification across breakpoints; QA-10 needs iOS scan flow verified in simulator
  - Files: none (verification-only task)
  - Do: Start dev server. Verify scan upload page at mobile (390px), tablet (768px), and web (1440px) widths in browser — check drag-and-drop zone renders on web, buttons render correctly, layout is responsive. Navigate to a draft editor screen and verify token-based styling renders correctly at each breakpoint. Verify DraftManager modals look correct. On iOS simulator, verify scan flow launches and renders (camera won't work but library selection UI should appear). Document what was verified vs. what needs real device.
  - Verify: Browser assertions pass at all 3 breakpoints; iOS simulator renders scan screen without crashes
  - Done when: Visual verification complete at 3 breakpoints on web, iOS simulator scan flow confirmed functional, any visual issues found are fixed inline

## Files Likely Touched

- `app/scan/index.tsx`
- `src/features/scan/DraftEditor.tsx`
- `src/features/scan/DraftManager.tsx`
