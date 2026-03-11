# T04: 12-remaining-screens 04

**Slice:** S12 — **Milestone:** M001

## Description

Rebuild scan upload and draft review screens to match cookbook.pen at all 3 breakpoints, with actual scan photo display and collapsible photo behavior on mobile.

Purpose: The scan-to-draft flow is a core product differentiator. The draft review must show the original photo alongside extracted fields for user verification.
Output: Responsive scan upload screen and draft review with real photo display (collapsible on mobile, side-by-side on tablet/web).

## Must-Haves

- [ ] "Scan upload screen renders responsively and supports both camera capture and photo library selection"
- [ ] "Draft review screen displays the actual scanned photo (not a placeholder)"
- [ ] "On mobile, the scan photo collapses to a thumbnail on scroll in draft review"
- [ ] "On tablet/web, the scan photo displays side-by-side with the draft fields"
- [ ] "Both screens adapt to mobile, tablet, and web breakpoints"

## Files

- `app/scan/index.tsx`
- `app/scan/draft/[id].tsx`
- `src/features/scans/DraftReview.tsx`
