---
id: T02
parent: S03
milestone: M006
provides:
  - scan gate implementation in createMultiPhotoScanJob (incrementScanCount + ScanLimitError)
  - isSubscriber threaded through ScanUploadOptions → uploadScanPhotos → createMultiPhotoScanJob
  - react-native-purchases-ui TypeScript declarations
key_files:
  - src/features/subscriptions/types/react-native-purchases-ui.d.ts
  - src/features/scan/scan-service.ts
  - src/features/scan/scan-photos.ts
  - src/features/scan/scan-upload.ts
key_decisions:
  - uploadScanPhotosInline (native path) also receives isSubscriber so the gate applies consistently on both web and native
patterns_established:
  - isSubscriber flows down from ScanUploadOptions through the full upload chain; gate fires at createMultiPhotoScanJob before DB insert
observability_surfaces:
  - ScanLimitError thrown with currentCount field at scan-service layer; npx jest src/features/scan/__tests__/scan-gate.test.ts is the primary diagnostic surface
duration: short
verification_result: passed
completed_at: 2026-03-17
blocker_discovered: false
---

# T02: Gate createMultiPhotoScanJob and thread isSubscriber through the call chain

**Added scan gate in `createMultiPhotoScanJob`: calls `incrementScanCount` for free users (throws `ScanLimitError` at limit), bypasses for subscribers; `isSubscriber` threaded through the full upload call chain.**

## What Happened

1. Created `src/features/subscriptions/types/react-native-purchases-ui.d.ts` with `RevenueCatUI.presentPaywallIfNeeded` declaration.
2. Updated `createMultiPhotoScanJob` in `scan-service.ts`: imports `incrementScanCount`; when `!isSubscriber`, calls `incrementScanCount(user.id)` before the DB insert. `ScanLimitError` bubbles naturally.
3. Updated `uploadScanPhotos` in `scan-photos.ts`: added `isSubscriber?: boolean` to options; passed down to both the web path (`createMultiPhotoScanJob({ ...photoUris, isSubscriber })`) and the native inline path (`uploadScanPhotosInline(files, isSubscriber)`). Also updated `uploadScanPhotosInline` signature to accept and forward `isSubscriber`.
4. Updated `ScanUploadOptions` in `scan-upload.ts`: added `isSubscriber?: boolean`; passed through to `uploadScanPhotos` call in `uploadScanPhotosWithValidation`.

## Verification

- `npx jest src/features/scan/__tests__/scan-gate.test.ts --no-coverage` → **4/4 pass**
- `npx tsc --noEmit` → **exits 0** (no output)

## Diagnostics

- `ScanLimitError` propagates from `incrementScanCount` with `currentCount` field — callers can inspect count at time of rejection.
- Gate test suite at `src/features/scan/__tests__/scan-gate.test.ts` is the primary contract verification surface.

## Deviations

- Plan said only update web path of `uploadScanPhotos`; also threaded `isSubscriber` through `uploadScanPhotosInline` (native path) for consistency — gate must apply on both platforms.

## Known Issues

none

## Files Created/Modified

- `src/features/subscriptions/types/react-native-purchases-ui.d.ts` — new TypeScript declaration for react-native-purchases-ui
- `src/features/scan/scan-service.ts` — gate logic: import incrementScanCount, call when !isSubscriber before DB insert
- `src/features/scan/scan-photos.ts` — isSubscriber added to uploadScanPhotos options; threaded to both web and native code paths
- `src/features/scan/scan-upload.ts` — isSubscriber added to ScanUploadOptions; passed through to uploadScanPhotos
