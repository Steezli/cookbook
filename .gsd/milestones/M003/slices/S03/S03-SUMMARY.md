---
id: S03
parent: M003
milestone: M003
provides:
  - Web-native HTML5 drag-and-drop file zone on scan upload screen with visual hover feedback
  - DraftEditor fully migrated to design tokens, useBreakpoint responsive layout, zero hardcoded colors
  - DraftManager migrated to Pressable, design tokens, responsive modals, zero hardcoded colors
  - Visual verification at 3 web breakpoints (390px, 768px, 1440px) and iOS simulator launch confirmed
requires:
  - slice: S01
    provides: Consolidated src/features/scan/ directory with clean import paths
affects:
  - S05
key_files:
  - app/scan/index.tsx
  - src/features/scan/DraftEditor.tsx
  - src/features/scan/DraftManager.tsx
  - src/lib/tokens.ts
key_decisions:
  - Raw HTML <div> for web drag-and-drop — react-native-web 0.21 doesn't forward drag events on <View>
  - StyleSheet.create fully removed from DraftEditor/DraftManager — inline token-based + breakpoint-computed styles
  - Semantic state color tokens (error/warning) and draft-status badge tokens added to tokens.ts as shared exports
  - Dragenter counter pattern (dragCounterRef) prevents hover flicker from nested element enter/leave events
patterns_established:
  - Web-only raw HTML element wrapping pattern for unsupported react-native-web events
  - Inline responsive styles computed from useBreakpoint() — padding/gap/maxWidth derived from breakpoint
  - Pressable with ({ pressed }) => style function for all interactive elements
  - Modal responsive sizing — maxWidth 560px on tablet/web, 100% on mobile
observability_surfaces:
  - None — purely visual polish, no new runtime behavior or state
drill_down_paths:
  - .gsd/milestones/M003/slices/S03/tasks/T01-SUMMARY.md
  - .gsd/milestones/M003/slices/S03/tasks/T02-SUMMARY.md
  - .gsd/milestones/M003/slices/S03/tasks/T03-SUMMARY.md
  - .gsd/milestones/M003/slices/S03/tasks/T04-SUMMARY.md
duration: 4 tasks across 1 session
verification_result: passed
completed_at: 2026-03-12
---

# S03: Scan UI Polish

**Web scan upload with HTML5 drag-and-drop, DraftEditor and DraftManager fully migrated to design tokens with responsive breakpoint layouts, verified at 3 web breakpoints and iOS simulator**

## What Happened

Four tasks made the scan UI web-native and visually consistent with the app's design system:

**T01 — Web drag-and-drop upload zone.** Wrapped the scan upload area in a web-only raw `<div>` (conditional on `Platform.OS === 'web'`) with HTML5 drag event handlers. During drag hover, the border turns blue, background gets a light tint, and text changes to "Drop photos here" / "Release to add photos". Dropped files are filtered to image types (JPEG/PNG/WebP) and converted to ImagePickerAsset-compatible objects. Native/mobile path renders unchanged.

**T02 — DraftEditor token migration.** Replaced all 48 hardcoded hex colors with design tokens, removed the ~200-line StyleSheet.create block, and added `useBreakpoint()` for responsive layout. Content padding (16/24/32), card padding (16/20/24), and metadata grid gap adapt to breakpoint. Header row switches from row to column layout on mobile. Added 8 semantic error/warning color tokens to `tokens.ts` for reuse across scan components.

**T03 — DraftManager migration.** Replaced all 7 TouchableOpacity instances with Pressable using `({ pressed }) => style` pattern. Migrated all 27 hardcoded hex colors to tokens, removed the 180-line StyleSheet.create block. Added responsive modal sizing (maxWidth 560px on tablet/web, 100% on mobile) and button grid layout (4-column row on web, 2x2 wrap on mobile). Added 7 draft-status badge color tokens to `tokens.ts`.

**T04 — Verification.** Confirmed scan upload renders correctly at 1440px, 768px, and 390px with drag-and-drop zone visible on web. Drag hover behavior verified via JS event dispatch. DraftEditor and DraftManager verified via code-level inspection (token usage, responsive patterns, font tokens) since they require authenticated sessions and real scan data to render. iOS simulator confirmed app launches without crashes via Expo Go.

## Verification

- `npx tsc --noEmit` — exits 0 ✅
- `npx jest --ci` — 22 suites, 502 tests pass ✅
- `rg '#[0-9a-fA-F]{6}' src/features/scan/DraftEditor.tsx` — zero results ✅
- `rg '#[0-9a-fA-F]{6}' src/features/scan/DraftManager.tsx` — zero results ✅
- `rg 'TouchableOpacity' src/features/scan/DraftManager.tsx` — zero results ✅
- `rg 'StyleSheet.create' src/features/scan/DraftEditor.tsx` — zero results ✅
- `rg 'StyleSheet.create' src/features/scan/DraftManager.tsx` — zero results ✅
- `rg 'useBreakpoint' src/features/scan/DraftEditor.tsx` — 2 results ✅
- `rg 'useBreakpoint' src/features/scan/DraftManager.tsx` — 2 results ✅
- Browser: scan upload at 1440px/768px/390px — drag-and-drop zone renders, hover feedback works ✅
- iOS simulator: app launches without crashes ✅

## Requirements Advanced

- QA-02 — Web scan upload now has a drag-and-drop zone with visual hover feedback, verified at 3 breakpoints. Upload zone uses web-appropriate patterns (HTML5 drag events, dashed border zone) instead of a mobile-ported button.
- QA-03 — DraftEditor and DraftManager fully migrated to design tokens with responsive breakpoint-aware layouts. TouchableOpacity replaced with Pressable. Modal sizing is responsive. Visual hierarchy improved via font tokens and consistent spacing.
- QA-10 — Scan upload page verified at 3 web breakpoints. iOS simulator confirmed app launches and connects to Metro bundler without crashes.

## Requirements Validated

- QA-02 — Web scan upload has a native drag-and-drop zone with visual hover feedback, verified at mobile/tablet/web breakpoints. Upload zone accepts JPEG/PNG/WebP drops. Proof: browser verification at 390px, 768px, 1440px with drag hover assertions passing.
- QA-03 — DraftEditor and DraftManager use design tokens (zero hardcoded hex colors), responsive layout via useBreakpoint, Pressable instead of TouchableOpacity, responsive modal sizing. Proof: `rg` verification of zero hex colors, zero TouchableOpacity, zero StyleSheet.create; useBreakpoint present in both files; 502 tests pass.

## New Requirements Surfaced

- none

## Requirements Invalidated or Re-scoped

- none

## Deviations

- DraftEditor and DraftManager could not be visually rendered in the browser during T04 because they require authenticated sessions and real scan draft data. Verification was done via code-level inspection of token usage, responsive breakpoint patterns, and structural analysis instead of live visual rendering.
- Added 15 new token exports to `tokens.ts` (8 error/warning state tokens in T02, 7 draft-status badge tokens in T03) — not in the original plan's file scope but necessary to achieve zero hardcoded hex colors.
- iOS simulator dialog ("Open in Expo Go?") blocked deeper navigation testing — app launch and no-crash state confirmed from status bar and Metro connection.

## Known Limitations

- DraftEditor and DraftManager visual rendering not verified in a live browser with real data — requires authenticated session and scan drafts. S05 full app audit should include this verification.
- iOS scan flow beyond app launch could not be verified due to simulator system dialog blocking.

## Follow-ups

- S05 should verify DraftEditor and DraftManager visually with real scan data in an authenticated browser session.
- S05 should verify iOS scan flow beyond app launch (library selection UI, draft review).

## Files Created/Modified

- `app/scan/index.tsx` — Web-only `<div>` drag-and-drop wrapper with isDragging state, drag event handlers, file type filtering, visual hover feedback
- `src/features/scan/DraftEditor.tsx` — Full token migration, StyleSheet.create removed, useBreakpoint responsive layout, font tokens
- `src/features/scan/DraftManager.tsx` — TouchableOpacity→Pressable, full token migration, StyleSheet.create removed, useBreakpoint responsive modals/buttons
- `src/lib/tokens.ts` — Added 15 new token exports (8 error/warning state + 7 draft-status badge colors + accentPurple)

## Forward Intelligence

### What the next slice should know
- `tokens.ts` now has 15 new semantic color tokens (error/warning/status badge) — future scan or feedback components should use these rather than introducing more hex colors.
- All scan UI components (DraftEditor, DraftManager, scan upload) are now token-based and breakpoint-responsive. Any future changes should maintain this pattern.

### What's fragile
- Web drag-and-drop uses a raw `<div>` wrapper — if react-native-web adds drag event support in a future version, the conditional could be simplified. The raw div is contained to a single `Platform.OS === 'web'` branch.
- The 15 new tokens in tokens.ts were added organically (per-component needs). If more components need similar status/feedback colors, consider whether the token set should be reorganized.

### Authoritative diagnostics
- `rg '#[0-9a-fA-F]{6}' src/features/scan/` — audit for hex color regressions in scan components
- `rg 'TouchableOpacity' src/features/scan/` — audit for deprecated interaction pattern regressions
- `rg 'StyleSheet.create' src/features/scan/` — audit for static style regressions in scan components

### What assumptions changed
- Assumed DraftEditor/DraftManager could be visually verified in browser — they require auth + real scan data, so T04 used code-level verification instead. S05 should include authenticated visual verification.
