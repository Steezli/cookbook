---
id: T01
parent: S05
milestone: M003
provides:
  - Shared cross-platform alert utility at src/lib/alert.ts
  - All 41 Alert.alert calls replaced across 17 consumer files
  - Inline duplicates removed from 3 files
key_files:
  - src/lib/alert.ts
  - app/(auth)/login.tsx
  - app/(auth)/signup.tsx
  - app/(auth)/forgot-password.tsx
  - app/(auth)/reset-password.tsx
  - app/(auth)/logout.tsx
  - app/(tabs)/recipes/[id].tsx
  - app/(tabs)/recipes/[id]/edit.tsx
  - app/(tabs)/recipes/create.tsx
  - app/(tabs)/collections/[id].tsx
  - app/(tabs)/collections/create.tsx
  - app/(tabs)/family/[id].tsx
  - app/(tabs)/family/index.tsx
  - app/(tabs)/profile.tsx
  - app/scan/index.tsx
  - src/components/recipes/RecipeForm.tsx
  - src/features/comments/CommentInput.tsx
  - src/features/comments/CommentThread.tsx
key_decisions:
  - confirmAction uses "Confirm" button text (destructive style) matching the existing family/[id].tsx pattern
  - CommentThread handleDelete refactored from manual Platform.OS branching to use confirmAction directly
patterns_established:
  - Use showAlert(title, message?) for simple notifications — never raw Alert.alert
  - Use confirmAction(title, message, onConfirm) for confirmation dialogs — never raw Alert.alert with buttons
  - Import from @/lib/alert, not from react-native Alert
observability_surfaces:
  - "rg 'Alert\\.alert' app/ src/" detects regressions (should return 0 matches outside alert.ts)
  - "rg 'from.*@/lib/alert' app/ src/ -l" tracks adoption (currently 17 consumer files)
duration: 15m
verification_result: passed
completed_at: 2026-03-12
blocker_discovered: false
---

# T01: Extract cross-platform alert utility and replace all Alert.alert calls

**Created `src/lib/alert.ts` with `showAlert`/`confirmAction` and replaced all 41 raw `Alert.alert` calls across 17 files — every user-facing error and confirmation message now actually reaches the user on web.**

## What Happened

1. Created `src/lib/alert.ts` with two exported functions:
   - `showAlert(title, message?)` — branches on `Platform.OS === 'web'` to use `window.alert` vs native `Alert.alert`
   - `confirmAction(title, message, onConfirm)` — uses `window.confirm` on web vs `Alert.alert` with Cancel/Confirm buttons on native

2. Replaced all 41 `Alert.alert` calls across 17 files:
   - **Auth screens (5 files, 10 calls):** login.tsx (2), signup.tsx (4), forgot-password.tsx (2), reset-password.tsx (1), logout.tsx (1)
   - **Tab screens (8 files, 20 calls):** recipes/[id].tsx (5), recipes/[id]/edit.tsx (3), recipes/create.tsx (1), collections/[id].tsx (used shared already but had inline copies), collections/create.tsx (1), family/index.tsx (2), family/[id].tsx (had inline copies), profile.tsx (3)
   - **Components (3 files, 8 calls):** scan/index.tsx (3), RecipeForm.tsx (4), CommentInput.tsx (1), CommentThread.tsx (3 + refactored manual Platform branching)

3. Removed inline `showAlert`/`confirmAction` duplicates from:
   - `app/(tabs)/family/[id].tsx` — removed 26-line inline implementation
   - `app/(tabs)/collections/[id].tsx` — removed 22-line inline implementation
   - `app/(auth)/reset-password.tsx` — removed 7-line inline implementation

4. Cleaned up imports: removed unused `Alert` from react-native imports in all 17 files. Also removed unused `Platform` from `family/[id].tsx` and `collections/[id].tsx` where it was only used by the removed inline functions. Cleaned up a stale unused `Alert` import from `invite/[token].tsx` discovered during audit.

## Verification

- `rg 'Alert\.alert' app/ src/` — only matches inside `src/lib/alert.ts` itself (the utility). Zero matches in consumer code. ✅
- `rg 'from.*@/lib/alert' app/ src/ -l | wc -l` — 18 files (17 consumers + alert.ts itself). ✅
- `test -f src/lib/alert.ts` — exists. ✅
- `npx tsc --noEmit` — exits 0. ✅
- `npx jest --ci` — 499 tests pass (22 suites, 0 failures). ✅

### Slice-level verification (partial — T01 of 3):
- ✅ `rg 'Alert\.alert' app/ src/ --no-heading` returns zero matches outside utility
- ✅ `rg 'from.*@/lib/alert' app/ src/ -c` shows 17+ files importing shared utility
- ✅ `npx tsc --noEmit` exits 0
- ✅ `npx jest --ci` passes (499 tests)
- ⬜ RecipeForm focus chaining (T02)
- ⬜ Web dev server verification (T03)
- ⬜ iOS simulator verification (T03)

## Diagnostics

- Run `rg 'Alert\.alert' app/ src/` to detect regressions — should match only `src/lib/alert.ts`
- Run `rg 'from.*@/lib/alert' app/ src/ -l` to confirm adoption across all files
- All user-facing error/confirmation messages now actually display on web where they were previously silently swallowed

## Deviations

- Also cleaned up an unused `Alert` import from `app/(tabs)/invite/[token].tsx` (not in the original 17-file target list) — discovered during sweep
- CommentThread.tsx `handleDelete` was refactored from manual `Platform.OS` branching (10 lines) into a single `confirmAction` call — cleaner than 1:1 replacement

## Known Issues

None.

## Files Created/Modified

- `src/lib/alert.ts` — new shared cross-platform alert utility with `showAlert` and `confirmAction`
- `app/(auth)/login.tsx` — replaced 2 Alert.alert calls with showAlert
- `app/(auth)/signup.tsx` — replaced 4 Alert.alert calls with showAlert
- `app/(auth)/forgot-password.tsx` — replaced 2 Alert.alert calls with showAlert
- `app/(auth)/reset-password.tsx` — removed inline showAlert, imported shared utility
- `app/(auth)/logout.tsx` — replaced 1 Alert.alert call with showAlert
- `app/(tabs)/recipes/[id].tsx` — replaced 5 calls (1 confirmAction for delete, 4 showAlert for errors)
- `app/(tabs)/recipes/[id]/edit.tsx` — replaced 3 Alert.alert calls with showAlert
- `app/(tabs)/recipes/create.tsx` — replaced 1 Alert.alert call with showAlert
- `app/(tabs)/collections/[id].tsx` — removed inline showAlert/confirmAction, imported shared utility
- `app/(tabs)/collections/create.tsx` — replaced 1 Alert.alert call with showAlert
- `app/(tabs)/family/[id].tsx` — removed inline showAlert/confirmAction, imported shared utility
- `app/(tabs)/family/index.tsx` — replaced 2 Alert.alert calls with showAlert
- `app/(tabs)/profile.tsx` — replaced 3 Alert.alert calls with showAlert
- `app/scan/index.tsx` — replaced 3 Alert.alert calls with showAlert
- `src/components/recipes/RecipeForm.tsx` — replaced 4 Alert.alert calls with showAlert
- `src/features/comments/CommentInput.tsx` — replaced 1 Alert.alert call with showAlert
- `src/features/comments/CommentThread.tsx` — replaced 3 calls (1 confirmAction for delete, 2 showAlert for errors)
- `app/(tabs)/invite/[token].tsx` — removed unused Alert import
