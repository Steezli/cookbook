---
estimated_steps: 5
estimated_files: 0
---

# T04: Browser verification at all breakpoints and iOS simulator check

**Slice:** S03 — Scan UI Polish
**Milestone:** M003

## Description

Visual verification of all S03 changes across mobile (390px), tablet (768px), and web (1440px) breakpoints in the browser, plus iOS simulator verification of the scan flow. This is a verification-only task — no code changes unless a visual issue is found during inspection, in which case it's fixed inline.

## Steps

1. Start the dev server (`npx expo start --web`). Navigate to `/scan` in the browser at 1440px width. Verify: drag-and-drop zone is visible, the dashed border and upload icon render correctly, "Choose Photo" button works alongside drag-and-drop. Test drag hover: drag a file over the zone and verify border color changes and text updates.
2. Resize to 768px (tablet). Verify: upload zone and recent scans stack appropriately, upload buttons render correctly, no overflow or clipping. Resize to 390px (mobile). Verify: fully stacked mobile layout, no drag-and-drop div visible, camera + library buttons render.
3. Navigate to a draft editor screen (may need to mock or use an existing draft). Verify at 1440px: wider padding, constrained max-width, metadata grid properly spaced, font families match the rest of the app. Check at 768px and 390px for responsive layout changes.
4. Verify DraftManager section: action buttons render with proper token colors (blue save, gray draft, red discard). Open the "Save as Recipe" modal — verify it's centered, proper width, token-based styling. Check at mobile width — modal should be near-full-width.
5. Run `npx tsc --noEmit` and `npx jest --ci` as final contract verification. If iOS simulator is available, launch `npx expo start` and verify the scan screen renders in the iOS simulator without crashes. Document what was verified.

## Must-Haves

- [ ] Scan upload page verified at 3 breakpoints (390px, 768px, 1440px)
- [ ] Drag-and-drop visual feedback verified on web
- [ ] DraftEditor responsive layout verified at 3 breakpoints
- [ ] DraftManager buttons and modals verified visually
- [ ] `npx tsc --noEmit` passes
- [ ] `npx jest --ci` — 502+ tests pass
- [ ] Any visual issues found are fixed

## Verification

- Browser assertions at 3 viewport widths — scan upload page renders correctly
- DraftEditor and DraftManager render with token-based styling (no gray/blue mismatches)
- `npx tsc --noEmit` exits 0
- `npx jest --ci` — 502+ tests pass

## Observability Impact

- Signals added/changed: None — verification-only task
- How a future agent inspects this: T04 summary will document what was verified and any fixes applied
- Failure state exposed: None

## Inputs

- T01 output — `app/scan/index.tsx` with drag-and-drop
- T02 output — `src/features/scan/DraftEditor.tsx` with tokens and responsive layout
- T03 output — `src/features/scan/DraftManager.tsx` with Pressable, tokens, responsive modals

## Expected Output

- Verified: all scan UI components render correctly at 3 breakpoints on web
- Verified: iOS simulator scan screen renders (if simulator available)
- Any visual fixes applied inline to the 3 files modified in T01–T03
