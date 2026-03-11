# T02: 08-home-navigation-photo-polish 02

**Slice:** S07 — **Milestone:** M001

## Description

Install Google Fonts packages and integrate font loading into the root layout so all screens render with Bricolage Grotesque and DM Sans.

Purpose: Every screen in Phases 9-13 uses these fonts. Loading must happen once at the root before any screen renders.
Output: Updated `app/_layout.tsx` with font loading and splash screen hold. New font packages in `package.json`.

## Must-Haves

- [ ] "Bricolage Grotesque and DM Sans fonts render on first paint without falling back to system font"
- [ ] "The splash screen stays visible until fonts finish loading"
- [ ] "If fonts fail to load, the app still renders (graceful degradation)"
- [ ] "Font packages are explicitly listed in package.json"

## Files

- `app/_layout.tsx`
- `package.json`
