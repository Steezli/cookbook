---
id: S03
provides:
  - Dynamic scan timeout scaling (60s base + 30s per additional image, capped at 180s)
  - Image-count-aware processing UX with specific time estimates
  - "Check Again" retry button on timeout (re-polls for completed drafts)
  - "Back to Scanner" link on error
  - Error screen uses design tokens (errorBg, errorBorder, etc.) instead of hardcoded hex
  - Processing spinner uses accentWarm instead of accentBlue for consistency
  - iOS scan route changed from modal to full-screen presentation
  - fullScreenGestureEnabled and slide_from_right animation on scan route
key_decisions:
  - Dynamic timeout formula (base 60s + 30s per additional image, cap 180s) — covers 1-5 image scenarios
  - Retry via retryCount state increment triggers useEffect re-run — clean approach without manual cleanup
  - Changed error title to "Processing Delayed" instead of "Error Loading Drafts" — less alarming, more accurate
  - Polling interval increased from 4s to 5s — slightly less aggressive, reduces server load
  - fullScreenGestureEnabled instead of just removing modal — enables iOS swipe-back gesture
verification_result: passed — tsc clean, 540 tests pass
completed_at: 2026-03-13
---

# S03: Multi-Image Scan Timeout Fix & iOS Full-Screen Scanner

**Fixed false timeout errors on multi-image scans with dynamic timeout scaling, improved processing UX, and changed iOS scanner from modal to full-screen.**

## What Changed

### Dynamic Timeout (`app/scan/draft/[id].tsx`)

- **Before**: Fixed 60s timeout for all scans — multi-image scans (3+ photos) would falsely timeout
- **After**: `getTimeoutMs(imageCount)` scales: 60s for 1 image, 90s for 2, 120s for 3, capped at 180s
- Fetches `getJobPhotos(id)` on mount to determine image count
- Timeout error message is image-count-aware

### Processing UX

- Shows "Processing N photos..." instead of generic "Processing your scan..."
- Dynamic time estimates: "10–30 seconds" for 1 image, "up to a minute" for 2-3, "1–2 minutes" for 4+
- Additional "Multi-photo scans take longer — hang tight!" helper text for multi-image
- Spinner changed to `accentWarm` for design consistency

### Error Recovery

- "Check Again" button re-polls for completed drafts (retry via `retryCount` state)
- "Back to Scanner" link to navigate back
- Error card uses design tokens (`errorBg`, `errorBorder`, `errorTitle`, `errorText`)
- Title changed from "Error Loading Drafts" to "Processing Delayed"

### iOS Full-Screen Scanner (`app/_layout.tsx`)

- **Before**: `presentation: "modal"` — scan rendered as sheet/popup on iOS
- **After**: `fullScreenGestureEnabled: true, animation: 'slide_from_right'` — full-screen with swipe-back gesture

## Files Modified

- `app/scan/draft/[id].tsx` — rewritten with dynamic timeout, image-aware UX, retry
- `app/_layout.tsx` — scan route changed from modal to full-screen

## Verification

- `npx tsc --noEmit` — exits 0
- `npx jest --ci` — 540 tests, 23 suites, 0 failures
- `rg "presentation.*modal" app/_layout.tsx` — returns 0 matches (confirmed removed)
