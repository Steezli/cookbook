---
estimated_steps: 5
estimated_files: 1
---

# T01: Add web drag-and-drop to scan upload screen

**Slice:** S03 — Scan UI Polish
**Milestone:** M003

## Description

Add a web-native HTML5 drag-and-drop file zone to the scan upload screen. Currently the upload area only has a "Choose Photo" button that opens a file dialog — there's no way to drag files onto the page. On web, wrap the upload zone in a raw `<div>` element (since react-native-web 0.21 doesn't support drag events on `<View>`) that handles `onDragOver`, `onDragLeave`, and `onDrop` events. Show visual feedback during drag hover (border color change, text update). Convert dropped `File` objects into the same shape as `ImagePicker.ImagePickerAsset` so they work with the existing upload pipeline. Mobile path stays completely unchanged.

## Steps

1. Read `app/scan/index.tsx` and the existing `ImagePicker.ImagePickerAsset` type shape to understand what fields are needed for compatibility.
2. Add drag-and-drop state (`isDragging: boolean`) to the component. Inside the upload zone, wrap the dashed-border area with a `Platform.OS === 'web'` conditional `<div>` that has `onDragOver` (preventDefault + setDragging true), `onDragLeave` (setDragging false), and `onDrop` (extract files, convert to asset-like objects, add to selectedImages). On non-web platforms, render the existing `<View>` unchanged.
3. Update the upload zone's visual styles to respond to `isDragging` state — change border color to `accentBlue`, change background to a lighter highlight, and update the upload text to "Drop photos here".
4. Convert dropped `File` objects: create `{ uri: URL.createObjectURL(file), fileName: file.name, mimeType: file.type, fileSize: file.size }` objects that match the `ImagePickerAsset` interface used downstream.
5. Verify: run `npx tsc --noEmit`, start dev server, test drag-and-drop in browser at web width (should show hover feedback and accept drops), test at mobile width (should show normal button-only UI).

## Must-Haves

- [ ] Web upload zone accepts file drops via HTML5 drag-and-drop events
- [ ] Visual feedback during drag hover (border color + text change)
- [ ] Dropped files appear in the selected photos preview using existing UI
- [ ] Mobile path completely unchanged (no drag-and-drop rendering on native)
- [ ] `npx tsc --noEmit` passes
- [ ] File type filtering: only accept image files (image/jpeg, image/png, image/webp)

## Verification

- `npx tsc --noEmit` — exits 0
- Browser: navigate to /scan at 1440px width, drag an image file over the upload zone → border color changes to blue, text changes. Drop the file → it appears in the selected photos preview.
- Browser: navigate to /scan at 390px width → no drag-and-drop div visible, standard buttons render normally

## Observability Impact

- Signals added/changed: None — drag-and-drop is a pure UI input mechanism with no new logging or state surfaces
- How a future agent inspects this: Browser DevTools → inspect the upload zone element, look for the raw `<div>` wrapper on web
- Failure state exposed: None — if drag-and-drop fails, the button fallback still works

## Inputs

- `app/scan/index.tsx` — existing scan upload screen with token-based styling and responsive layout
- `src/features/scan/scan-upload.ts` — `uploadScanPhotosWithValidation()` expects files with `uri`, `name`, `type`, `size`
- S03 Research — confirms react-native-web 0.21 doesn't support drag events on `<View>`, needs raw `<div>`

## Expected Output

- `app/scan/index.tsx` — updated with web-only drag-and-drop zone wrapping the upload area, visual hover feedback, file conversion logic
