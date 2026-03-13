# S03: Scan UI Polish — Research

**Date:** 2026-03-12

## Summary

S03 owns two active requirements: **QA-02** (web scan redesign) and **QA-03** (multi-draft UX polish). It also supports QA-10 (cross-platform verification) by verifying the scan flow on iOS simulator.

The scan UI codebase after S01 consolidation is all in `src/features/scan/`. Six files compose the scan UI: `ScanUploadScreen` (app/scan/index.tsx), `DraftReviewScreen` (app/scan/draft/[id].tsx), `DraftListView`, `DraftReview`, `DraftEditor`, and `DraftManager`. The first three already use design tokens and breakpoint-responsive layouts. **DraftEditor and DraftManager are the biggest polish targets** — they use hardcoded Tailwind-gray colors via `StyleSheet.create`, don't respond to breakpoints at all, and DraftManager uses `TouchableOpacity` instead of `Pressable` (inconsistent with every other component in the app).

The web scan upload screen needs a native HTML drag-and-drop zone for web (`onDragOver`/`onDrop`), since `expo-image-picker` only opens a system file dialog — there's no way to drop files onto the page today. The overall layout is already responsive (column on mobile, row on tablet/web) and uses design tokens, but the upload zone itself feels like a mobile pattern ported to web.

The recommended approach is three tracks: (1) web-native scan upload with drag-and-drop, (2) DraftEditor + DraftManager token migration and breakpoint responsiveness, (3) iOS simulator verification of the full scan flow.

## Recommendation

**Track 1 — Scan Upload Web Polish (QA-02):** Add a web-native drag-and-drop file drop zone to the upload area using `Platform.OS === 'web'` conditional rendering. On web, the dashed-border upload zone should accept file drops via HTML5 drag-and-drop events (`onDragOver`, `onDragLeave`, `onDrop`) alongside the existing "Choose Photo" button. Add visual feedback (border color change, text change) during drag hover. Mobile retains the current camera + library buttons unchanged.

**Track 2 — Multi-Draft/Editor UI Polish (QA-03):** Migrate DraftEditor and DraftManager from hardcoded `StyleSheet.create` colors to design tokens (`@/lib/tokens`). Add breakpoint awareness (`useBreakpoint`) so the editor uses wider layouts on tablet/web — the 2-column metadata grid, wider max-width, and proper padding. Replace `TouchableOpacity` with `Pressable` in DraftManager. Ensure consistent font families (fontFamilyBody, fontFamilyDisplay) match the rest of the app.

**Track 3 — iOS Simulator Verification (QA-10 partial):** Run `npx expo start` and verify the scan flow in iOS simulator via mac-tools. Camera won't work in simulator, but library selection → upload → processing → draft review can be verified. Document what was verified vs. what needs real device testing.

## Don't Hand-Roll

| Problem | Existing Solution | Why Use It |
|---------|------------------|------------|
| Responsive breakpoints | `useBreakpoint()` from `@/lib/hooks/useBreakpoint` | Already used in DraftListView, DraftReview, ScanUploadScreen — DraftEditor and DraftManager need it too |
| Design tokens | `@/lib/tokens` (colors, fonts, radii, shadows) | App-wide consistency; DraftEditor/Manager currently hardcode Tailwind grays instead |
| File upload validation | `uploadScanPhotosWithValidation()` from `@/features/scan/scan-upload` | Already handles file type/size validation, quality estimation, job limit check |
| Draft progress tracking | `multi-draft-helpers.ts` (getDraftProgress, canSaveAll, getDraftDisplayStatus) | Pure functions already consumed by DraftListView — no need to duplicate logic |
| Page layout container | `PageContainer` from `@/components/nav/PageContainer` | Provides consistent padding and max-width by breakpoint |
| Confidence display | `getConfidenceColor()` / `getConfidenceLabel()` / `ConfidenceBadge` | Already in DraftReview and DraftListView — duplicated; could extract to shared, but not required for this slice |

## Existing Code and Patterns

- `app/scan/index.tsx` — Scan upload screen. Already responsive (mobile column / tablet+web row). Uses tokens. **Needs:** web drag-and-drop, visual refinement of upload zone padding/spacing on web, potentially larger preview thumbnails on web.
- `app/scan/draft/[id].tsx` — Draft routing screen. Already handles mode detection (loading → processing → single/multi). Uses tokens. Minimal polish needed.
- `src/features/scan/DraftListView.tsx` — Multi-draft list. **Already polished** — responsive sidebar/detail layout on tablet/web, progress bar, batch save, draft cards with badges. Uses tokens. Minimal changes needed.
- `src/features/scan/DraftReview.tsx` — Single draft review. **Already polished** — side-by-side layout, collapsible photo on mobile, confidence badges, field sections. Uses tokens. Minimal changes needed.
- `src/features/scan/DraftEditor.tsx` — Draft editor. **MAJOR TARGET.** 530 lines, hardcoded colors (`#3b82f6`, `#f3f4f6`, `#111827`), no breakpoint awareness, single-column at all sizes, `StyleSheet.create` at bottom. Needs token migration + responsive layout.
- `src/features/scan/DraftManager.tsx` — Draft management actions. **MAJOR TARGET.** 470 lines, hardcoded colors, uses `TouchableOpacity` (deprecated pattern in this codebase), no breakpoint awareness, Modal dialogs with hardcoded styling. Needs token migration + Pressable + token-based modal styles.
- `src/features/scan/RecentScans.tsx` — Recent scans list. Already uses tokens. No changes needed.
- `src/features/scan/scan-upload.ts` — Upload logic with validation. No UI changes needed.
- `src/features/scan/scan-photos.ts` — Photo URL generation and upload. Platform-branched for web vs native base64 reading. No changes needed.
- `src/lib/scan/scan-draft-service.ts` — Draft CRUD service. No UI changes needed.

## Constraints

- **No runtime behavior changes.** This slice is purely visual polish. All existing upload → process → draft review → save logic stays exactly as-is.
- **Design tokens are the styling authority.** All scan UI must use `@/lib/tokens` — no hardcoded hex colors, font sizes, or radii.
- **Breakpoint thresholds are fixed:** mobile < 640px, tablet 640–1279px, web ≥ 1280px. Use `useBreakpoint()`.
- **`StyleSheet.create` cannot cache responsive styles.** Per project STATE.md constraint, all dimension-sensitive styles must be computed inside components from `useBreakpoint()`, not cached in StyleSheet.create.
- **cookbook.pen is design authority.** Draft Review designs exist at all 3 breakpoints (390px, 768px, 1440px). No separate Scan Upload design exists — follow the general design language.
- **502 tests must continue passing.** No test changes expected (this is visual-only work), but verify after changes.
- **`npx tsc --noEmit` must pass.** Token imports need proper typing.
- **Web drag-and-drop requires Platform.OS branching.** HTML5 drag events aren't available in React Native — must use `Platform.OS === 'web'` conditional rendering or web-only style props.
- **DraftEditor's auto-save, undo history, and DraftManager's convert/discard logic must not change.** Polish the presentation only.

## Common Pitfalls

- **StyleSheet.create + useBreakpoint conflict.** DraftEditor currently puts everything in `StyleSheet.create` at module level. When migrating to tokens + breakpoints, responsive values (padding, maxWidth, gap) must move inline or into computed objects. Fixed styles (borderRadius from tokens, fontFamily) can stay in a StyleSheet.
- **Drag-and-drop events on React Native Views.** React Native's `<View>` doesn't support `onDragOver`/`onDrop` props even on web. The drag-and-drop zone on web needs a raw `<div>` wrapper or a web-specific `View` with `domProps` (if using react-native-web ≥ 0.19). Verify the approach works with the project's react-native-web version.
- **expo-image-picker on web.** `launchImageLibraryAsync()` works on web (opens file dialog) but `launchCameraAsync()` may or may not work depending on browser support. The camera button is already hidden on web — keep it that way.
- **TouchableOpacity → Pressable migration in DraftManager.** `Pressable` uses `({ pressed }) => style` pattern, not `onPressIn`/`onPressOut`. The style function signature differs from `TouchableOpacity`'s `activeOpacity`.
- **Modal backdrop on web.** React Native `Modal` renders differently on web — ensure the overlay background and centering work properly at all breakpoints after token migration.

## Open Risks

- **Web drag-and-drop implementation path.** React Native Web may not support `onDragOver`/`onDrop` props on `View`. If not, we'll need a `Platform.select` wrapper using a raw `<div>` on web. This needs to be verified during T01 implementation. Fallback: keep the button-only upload and focus polish efforts elsewhere.
- **DraftEditor is 530 lines with interleaved logic and styling.** The token migration could be tedious and error-prone. Mitigation: do it methodically — replace color constants first, then font families, then add breakpoint-responsive layout as a separate pass.
- **iOS simulator scan flow depends on Supabase edge function and storage.** If the local dev environment isn't configured with proper Supabase credentials, the upload → process flow won't work in simulator. This is an environment issue, not a code issue.
- **No dedicated Scan Upload artboard in cookbook.pen.** The upload screen redesign must follow the general design language from other screens (Draft Review, Create Recipe) rather than a pixel-perfect reference. This introduces some subjectivity.

## Skills Discovered

| Technology | Skill | Status |
|------------|-------|--------|
| Expo / React Native | `expo/skills@building-native-ui` (17.1K installs) | available — `npx skills add expo/skills@building-native-ui` |
| Supabase | `supabase/agent-skills@supabase-postgres-best-practices` (32.8K installs) | available but not needed for UI-only work |
| Frontend Design | `frontend-design` | installed (in available_skills) — use for visual polish guidance |

The `expo/skills@building-native-ui` skill could be useful for ensuring RN-web compatibility patterns are correct, especially around drag-and-drop on web. The `frontend-design` skill is already installed and should be loaded for the visual polish tasks.

## Sources

- Scan UI components explored directly via file reads (all 6 components + supporting files)
- Design tokens verified via `src/lib/tokens.ts` exports
- Breakpoint hook verified via `src/lib/hooks/useBreakpoint.ts`
- cookbook.pen inspected via mac-tools screenshots — Draft Review designs confirmed at 3 breakpoints (390px, 768px, 1440px)
- Baseline verified: 502 tests passing, `npx tsc --noEmit` clean (from S01 summary)
- expo-image-picker v17.0.10 (from package.json)
- No existing drag-and-drop patterns found in codebase (`rg` search for drop/dragover/ondrop returned zero results in src/)
