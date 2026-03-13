---
id: T01
parent: S03
milestone: M003
provides:
  - Web-native HTML5 drag-and-drop file zone on scan upload screen
key_files:
  - app/scan/index.tsx
key_decisions:
  - Used raw <div> wrapper with Platform.OS === 'web' conditional for drag events (react-native-web 0.21 doesn't support drag events on <View>)
  - Used dragenter/dragleave counter pattern (dragCounterRef) to handle nested element enter/leave events without flicker
  - Converted dropped File objects to ImagePickerAsset shape with URL.createObjectURL for uri, width/height set to 0 (sufficient for upload pipeline)
patterns_established:
  - Web-only raw HTML element wrapping pattern for unsupported react-native-web events
observability_surfaces:
  - none
duration: 20m
verification_result: passed
completed_at: 2026-03-12
blocker_discovered: false
---

# T01: Add web drag-and-drop to scan upload screen

**Added HTML5 drag-and-drop file zone to web scan upload with visual hover feedback and image type filtering**

## What Happened

Wrapped the scan upload zone in a web-only raw `<div>` element (conditional on `Platform.OS === 'web'`) that handles `onDragEnter`, `onDragOver`, `onDragLeave`, and `onDrop` events. On native platforms, the existing `<View>` with camera + library buttons renders unchanged.

Key implementation details:
- **Drag counter pattern**: Used a `dragCounterRef` counter to track nested dragenter/dragleave events, preventing flicker when dragging over child elements
- **Visual feedback**: During drag hover, border color changes to `accentBlue`, background gets a light blue tint (`${accentBlue}0D`), icon color changes to blue, title text changes to "Drop photos here", subtitle changes to "Release to add photos", and CSS transitions smooth the change
- **File conversion**: Dropped `File` objects are converted to `ImagePickerAsset`-compatible objects with `{ uri: URL.createObjectURL(file), width: 0, height: 0, fileName, mimeType, fileSize, type: 'image' }`
- **Type filtering**: Only `image/jpeg`, `image/png`, `image/webp` files are accepted; other file types are silently ignored
- **Native path**: The mobile/native branch renders the original `<View>` with camera and library buttons, completely unchanged

## Verification

- `npx tsc --noEmit` — exits 0 ✅
- `npx jest --ci` — 502 tests pass, 22 suites, 0 failures ✅
- Browser at 1440px: drag-and-drop `<div>` wrapper present, dragenter triggers blue border + "Drop photos here" text ✅
- Browser at 1440px: dropping an image file adds it to selectedImages preview with photo count and Scan Recipe button ✅
- Browser at 1440px: dropping a non-image file (text/plain) is silently rejected, no photo added ✅
- Browser at 390px: web still renders `<div>` wrapper (correct — `isWeb` is platform check, not viewport) ✅
- Native path: code inspection confirms `Platform.OS !== 'web'` renders original `<View>` with camera + library buttons ✅

### Slice-level checks (T01 scope):
- `npx tsc --noEmit` — ✅ exits 0
- `npx jest --ci` — ✅ 502 tests pass
- Browser: scan upload at web width shows drag-and-drop zone, hover changes border — ✅
- Remaining slice checks (DraftEditor tokens, DraftManager migration) — not yet applicable (T02, T03)

## Diagnostics

None — drag-and-drop is a pure UI input mechanism. Inspect via browser DevTools → look for the raw `<div>` wrapper with `style*="dashed"` on the web upload zone. If drag-and-drop fails, the Choose Photo button fallback still works.

## Deviations

- Updated subtitle text on web from "JPEG, PNG, or WebP up to 10MB each" to "Drag & drop or choose files — JPEG, PNG, or WebP up to 10MB each" to indicate drag-and-drop capability (minor UX improvement, not in plan but natural)
- Used `onDragEnter` with counter pattern instead of only `onDragOver`/`onDragLeave` as mentioned in plan — this prevents flicker from nested child elements

## Known Issues

None.

## Files Created/Modified

- `app/scan/index.tsx` — Added web-only `<div>` drag-and-drop wrapper with isDragging state, drag event handlers, file type filtering, ImagePickerAsset conversion, and visual hover feedback
