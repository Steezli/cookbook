---
estimated_steps: 5
estimated_files: 5
---

# T02: Gate createMultiPhotoScanJob and thread isSubscriber through the call chain

**Slice:** S03 — Scan Gating + Paywall
**Milestone:** M006

## Description

Implement the scan gate in `createMultiPhotoScanJob` and thread `isSubscriber` through the full call chain: `createMultiPhotoScanJob` ← `uploadScanPhotos` ← `uploadScanPhotosWithValidation`. Add TypeScript type declarations for `react-native-purchases-ui` so the module compiles cleanly. After this task, all T01 gate tests pass and `npx tsc --noEmit` exits 0.

## Steps

1. Create `src/features/subscriptions/types/react-native-purchases-ui.d.ts` with:
   ```ts
   declare module 'react-native-purchases-ui' {
     export const RevenueCatUI: {
       presentPaywallIfNeeded(options: { requiredEntitlementIdentifier: string }): Promise<void>;
     };
   }
   ```
2. Update `createMultiPhotoScanJob(photoUrls: string[], options?: { isSubscriber?: boolean })` in `scan-service.ts`. After the `getUser()` check and before the `scan_jobs` insert, add: `if (!options?.isSubscriber) { await incrementScanCount(user.id); }`. Import `incrementScanCount` from `@/features/subscriptions/scan-count`. `ScanLimitError` bubbles naturally. Do NOT call `incrementScanCount` anywhere else.
3. Update `uploadScanPhotos` in `scan-photos.ts` — its call to `createMultiPhotoScanJob` should pass `{ isSubscriber: options?.isSubscriber }`. Add `isSubscriber?: boolean` to `uploadScanPhotos`'s options parameter (it already has an options param — add the field).
4. Update `ScanUploadOptions` in `scan-upload.ts` to add `isSubscriber?: boolean`. In `uploadScanPhotosWithValidation`, pass `isSubscriber: options.isSubscriber` into the `uploadScanPhotos` call.
5. Run T01 tests and TypeScript check to confirm both pass.

## Must-Haves

- [ ] `react-native-purchases-ui.d.ts` exists with `RevenueCatUI.presentPaywallIfNeeded` declaration
- [ ] `createMultiPhotoScanJob` accepts optional `options?: { isSubscriber?: boolean }`
- [ ] `incrementScanCount(user.id)` called only once, only when `!options?.isSubscriber`, before the DB insert
- [ ] `isSubscriber` threads through: `ScanUploadOptions` → `uploadScanPhotos` → `createMultiPhotoScanJob`
- [ ] All T01 gate tests pass (4 tests)
- [ ] `npx tsc --noEmit` exits 0

## Verification

- `npx jest src/features/scan/__tests__/scan-gate.test.ts --no-coverage` → 4/4 pass
- `npx tsc --noEmit` → exits 0

## Observability Impact

- Signals added/changed: `ScanLimitError` with `currentCount` field is now thrown at the service layer — callers receive structured error with exact count
- How a future agent inspects this: run gate test suite; inspect `ScanLimitError.currentCount` in stack traces
- Failure state exposed: `ScanLimitError` preserves the count at time of rejection for diagnostic logging

## Inputs

- `src/features/scan/__tests__/scan-gate.test.ts` — failing tests from T01 that define exact expected behavior
- `src/features/subscriptions/scan-count.ts` — `incrementScanCount()` API; throws `ScanLimitError` when `data > 3`
- `src/features/scan/scan-service.ts` — insertion point for gate; existing `getUser()` pattern
- `src/features/scan/scan-photos.ts` — `uploadScanPhotos` calls `createMultiPhotoScanJob`
- `src/features/scan/scan-upload.ts` — `ScanUploadOptions` type and `uploadScanPhotosWithValidation`
- `__mocks__/react-native-purchases.js` — structural template for new `.d.ts` declarations

## Expected Output

- `src/features/subscriptions/types/react-native-purchases-ui.d.ts` — TypeScript declarations
- `src/features/scan/scan-service.ts` — gate logic added with `incrementScanCount` call
- `src/features/scan/scan-photos.ts` — `isSubscriber` threaded through
- `src/features/scan/scan-upload.ts` — `isSubscriber` in `ScanUploadOptions`, passed down
- T01 tests: 4/4 passing; `npx tsc --noEmit` exits 0
