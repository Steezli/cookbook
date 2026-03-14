# S03: Multi-Image Scan Timeout Fix & iOS Full-Screen Scanner

**Goal:** Multi-image scans use dynamic timeout and better UX messaging; iOS scanner renders full-screen instead of modal.
**Demo:** Submit 3+ photos → processing screen shows image-count-aware estimate → no false timeout errors. iOS scan screen is full-screen.

## Must-Haves

- Dynamic timeout scaling based on image count (base 60s + 30s per additional image)
- Better processing UX: show image count, dynamic time estimate
- Remove `presentation: "modal"` from scan route in root layout
- All existing tests pass

## Proof Level

- This slice proves: integration
- Real runtime required: yes (web browser for timeout behavior, code inspection for iOS)
- Human/UAT required: no

## Verification

- `npx tsc --noEmit` — TypeScript compiles clean
- `npx jest --ci` — all tests pass
- Code inspection: `app/_layout.tsx` scan route has no `presentation: "modal"`
- Code inspection: `app/scan/draft/[id].tsx` timeout scales with image count

## Tasks

- [x] **T01: Fix scan timeout and processing UX** `est:20m`
  - Why: Multi-image scans timeout at 60s when Claude API can take 90+ seconds for 3+ images; processing screen gives no feedback about image count
  - Files: `app/scan/draft/[id].tsx`, `src/features/scan/scan-service.ts`
  - Do: Add `getJobPhotos` call to determine image count. Scale timeout: base 60s + 30s per additional image. Update processing UI to show image count and dynamic time estimate. Add retry ability on timeout.
  - Verify: Code review of timeout logic
  - Done when: timeout is dynamic, processing screen shows image count

- [x] **T02: Change iOS scan route from modal to full-screen** `est:5m`
  - Why: Scan page renders as modal popup on iOS due to `presentation: "modal"` in root layout
  - Files: `app/_layout.tsx`
  - Do: Remove `presentation: "modal"` from the scan Stack.Screen options. Keep `headerShown: false`.
  - Verify: `npx tsc --noEmit`
  - Done when: scan route has `fullScreenGesture: true` and no modal presentation

## Files Likely Touched

- `app/scan/draft/[id].tsx`
- `app/_layout.tsx`
