# S03: Scan UI Polish — UAT

**Milestone:** M003
**Written:** 2026-03-12

## UAT Type

- UAT mode: mixed (artifact-driven + live-runtime)
- Why this mode is sufficient: Token migration and code pattern compliance verified via `rg` audits (artifact-driven). Drag-and-drop behavior verified via browser at 3 breakpoints (live-runtime). DraftEditor/DraftManager visual rendering deferred to S05 because they require authenticated sessions with real scan data.

## Preconditions

- Dev server running (`npx expo start --web`)
- Browser available for scan upload page verification
- iOS simulator booted with Expo Go installed (for launch verification only)

## Smoke Test

Open the scan upload page at http://localhost:8081/scan in a desktop-width browser. Verify a dashed-border upload zone with "Upload Recipe Photos" heading and "Choose Photo" button is visible. Drag a JPEG file over the zone — border should turn blue and text should change to "Drop photos here".

## Test Cases

### 1. Web drag-and-drop upload zone renders

1. Navigate to `/scan` in browser at 1440px width
2. Verify dashed-border upload zone is visible
3. Verify "Upload Recipe Photos" heading, "Drag & drop or choose files" subtitle, and "Choose Photo" button are present
4. **Expected:** All elements render with design-token colors, no hardcoded grays

### 2. Drag hover visual feedback

1. Drag an image file over the upload zone
2. **Expected:** Border color changes to blue (accentBlue), border width increases, background gets light blue tint, title text changes to "Drop photos here", subtitle changes to "Release to add photos"

### 3. File drop acceptance

1. Drop a JPEG image file onto the upload zone
2. **Expected:** Image appears in the selected photos preview area with photo count and "Scan Recipe" button

### 4. Non-image file rejection

1. Drop a text file onto the upload zone
2. **Expected:** File is silently ignored, no photo added to preview

### 5. Responsive layout at mobile width (390px)

1. Resize browser to 390px width
2. Navigate to `/scan`
3. **Expected:** Upload zone fills width, stacked layout, Choose Photo button prominent

### 6. Responsive layout at tablet width (768px)

1. Resize browser to 768px width
2. Navigate to `/scan`
3. **Expected:** Upload zone renders correctly, no overflow or clipping

### 7. DraftEditor token compliance

1. Run `rg '#[0-9a-fA-F]{6}' src/features/scan/DraftEditor.tsx`
2. **Expected:** Zero results — no hardcoded hex colors

### 8. DraftEditor responsive layout

1. Run `rg 'useBreakpoint' src/features/scan/DraftEditor.tsx`
2. **Expected:** At least one result — breakpoint-aware layout active

### 9. DraftManager Pressable migration

1. Run `rg 'TouchableOpacity' src/features/scan/DraftManager.tsx`
2. **Expected:** Zero results — all migrated to Pressable

### 10. DraftManager token compliance

1. Run `rg '#[0-9a-fA-F]{6}' src/features/scan/DraftManager.tsx`
2. **Expected:** Zero results — no hardcoded hex colors

### 11. iOS simulator app launch

1. Boot iOS simulator, open Expo Go
2. Connect to dev server
3. **Expected:** App launches without crashes, Metro bundler connects

## Edge Cases

### Drag-and-drop with multiple files

1. Drag 3 image files simultaneously onto the upload zone
2. **Expected:** All 3 images appear in selected photos preview

### Mixed file types in drag

1. Drag 2 image files and 1 PDF simultaneously onto the upload zone
2. **Expected:** Only the 2 images are added; PDF is silently filtered out

## Failure Signals

- Hardcoded hex colors in DraftEditor.tsx or DraftManager.tsx (`rg` returns results)
- TouchableOpacity still present in DraftManager.tsx
- StyleSheet.create still present in DraftEditor.tsx or DraftManager.tsx
- Drag-and-drop zone not visible on web at any breakpoint
- No visual feedback on drag hover (border stays unchanged)
- TypeScript compilation fails (`npx tsc --noEmit` non-zero exit)
- Test regressions (`npx jest --ci` failures)
- iOS simulator crashes on app launch

## Requirements Proved By This UAT

- QA-02 — Web scan upload has native drag-and-drop zone with visual hover feedback, verified at 3 breakpoints (390px, 768px, 1440px). Upload zone uses web-appropriate HTML5 drag patterns.
- QA-03 — DraftEditor and DraftManager use design tokens (zero hardcoded hex colors), responsive layout via useBreakpoint, Pressable interaction pattern, responsive modal sizing. Code-level verification via `rg` audits.

## Not Proven By This UAT

- QA-02/QA-03 visual rendering of DraftEditor and DraftManager with real scan data in an authenticated session — requires S05 verification
- QA-10 full iOS scan flow beyond app launch — simulator system dialog blocked deeper testing; needs S05 real-device or workaround verification
- End-to-end scan flow (upload → process → draft review → save) on web — requires authenticated session and working edge function

## Notes for Tester

- DraftEditor and DraftManager cannot be rendered in an unauthenticated browser session. To visually verify token-based styling, you need to: (1) sign in, (2) scan a recipe photo to create drafts, (3) navigate to the draft editor/manager screens.
- iOS simulator cannot test camera capture. Only library selection and app launch can be verified.
- The drag-and-drop zone renders on all web viewports (including narrow mobile widths) because it uses `Platform.OS === 'web'`, not a viewport check. This is correct — mobile web users can still drag files.
