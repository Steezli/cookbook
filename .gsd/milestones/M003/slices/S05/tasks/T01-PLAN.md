---
estimated_steps: 5
estimated_files: 18
---

# T01: Extract cross-platform alert utility and replace all Alert.alert calls

**Slice:** S05 — Full App Audit & Cross-Platform Verification
**Milestone:** M003

## Description

`Alert.alert` is literally `static alert() {}` on react-native-web 0.21 — a complete silent no-op. 41 calls across 15 unguarded files silently swallow every error message, validation feedback, and confirmation dialog on web. Three files (`family/[id].tsx`, `collections/[id].tsx`, `reset-password.tsx`) already have working `showAlert`/`confirmAction` wrappers — extract this pattern into a shared utility and replace all 41 raw calls.

## Steps

1. Create `src/lib/alert.ts` with `showAlert(title, message?)` and `confirmAction(title, message, onConfirm)` functions. `showAlert` branches on `Platform.OS === 'web'` to use `window.alert` vs native `Alert.alert`. `confirmAction` uses `window.confirm` on web vs `Alert.alert` with Cancel/Confirm buttons on native. Export both as named exports.

2. Audit all 17 files with `Alert.alert` calls. For each call, determine whether it's:
   - A simple notification (1-2 args) → replace with `showAlert(title, message)`
   - A confirmation with callback (3 args with buttons) → replace with `confirmAction(title, message, onConfirm)`
   - Remove `import { Alert } from 'react-native'` when no longer needed. Add `import { showAlert, confirmAction } from '@/lib/alert'`.

3. Replace calls in auth screens (5 files, ~10 calls): `login.tsx` (2), `signup.tsx` (4), `forgot-password.tsx` (2), `reset-password.tsx` (1 — remove inline showAlert, import shared), `logout.tsx` (1).

4. Replace calls in tab screens (8 files, ~20 calls): `recipes/[id].tsx` (5), `recipes/[id]/edit.tsx` (3), `recipes/create.tsx` (1), `collections/[id].tsx` (2 — remove inline copies, import shared), `collections/create.tsx` (1), `family/index.tsx` (2), `family/[id].tsx` (3 — remove inline copies, import shared), `profile.tsx` (3).

5. Replace calls in shared components and scan (3 files, ~11 calls): `scan/index.tsx` (3), `RecipeForm.tsx` (4), `CommentInput.tsx` (1), `CommentThread.tsx` (3). Then verify: `rg 'Alert\.alert' app/ src/` returns 0 matches, `npx tsc --noEmit` exits 0, `npx jest --ci` passes.

## Must-Haves

- [ ] `src/lib/alert.ts` exists with `showAlert` and `confirmAction` exports
- [ ] All 41 `Alert.alert` calls replaced — `rg 'Alert\.alert' app/ src/` returns zero
- [ ] Inline duplicates removed from `family/[id].tsx`, `collections/[id].tsx`, `reset-password.tsx`
- [ ] `npx tsc --noEmit` exits 0
- [ ] `npx jest --ci` passes (499 tests)

## Verification

- `rg 'Alert\.alert' app/ src/` — exit code 1 (zero matches)
- `rg 'from.*@/lib/alert' app/ src/ -l | wc -l` — should be ~17 files
- `test -f src/lib/alert.ts` — file exists
- `npx tsc --noEmit` — exits 0
- `npx jest --ci` — 499 tests pass

## Observability Impact

- Signals added/changed: All user-facing error and confirmation feedback now actually reaches the user on web (previously silently swallowed)
- How a future agent inspects this: `rg 'Alert\.alert' app/ src/` detects any regression; `rg 'from.*@/lib/alert'` shows adoption
- Failure state exposed: Error alerts are now visible on web where they were previously invisible

## Inputs

- `app/(tabs)/family/[id].tsx` lines 71-89 — reference implementation of `showAlert`/`confirmAction`
- S05 Research audit table — exact file list and call counts
- S02 Summary — `TextInput as TextInputType` alias pattern (for reference, not directly needed here)

## Expected Output

- `src/lib/alert.ts` — new shared cross-platform alert utility
- 17 files updated: `Alert.alert` replaced with `showAlert`/`confirmAction`, `Alert` import removed where no longer needed
- 3 files with inline duplicates cleaned up (now import from shared utility)
