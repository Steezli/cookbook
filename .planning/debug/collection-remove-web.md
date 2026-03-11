---
status: diagnosed
trigger: "UAT Phase 12 test 6: clicking remove on a recipe in collection detail does nothing on web"
created: 2026-03-10T00:00:00Z
updated: 2026-03-10T00:00:00Z
---

## Current Focus

hypothesis: Collection detail screen uses Alert.alert() which is a no-op on React Native Web
test: Compare with family detail screen which has cross-platform helpers
expecting: Collection screen lacks Platform-aware confirm/alert wrappers
next_action: n/a -- root cause confirmed

## Symptoms

expected: Clicking "Remove" on a recipe in collection detail shows a confirmation prompt, then removes the recipe
actual: Nothing happens -- no prompt, no action, no console logs
errors: None (Alert.alert silently fails on web)
reproduction: Open any collection with recipes on web, click "Remove" under a recipe card
started: Always broken on web; works on iOS because Alert.alert is native there

## Eliminated

(none -- first hypothesis confirmed)

## Evidence

- timestamp: 2026-03-10
  checked: app/(tabs)/collections/[id].tsx lines 128-150 (handleRemoveRecipe)
  found: Uses `Alert.alert(...)` with button callbacks directly. On React Native Web, Alert.alert is either a no-op or only supports simple messages (no button callbacks), so the confirmation never appears and the destructive onPress callback never fires.
  implication: This is the root cause for the "remove" action doing nothing on web.

- timestamp: 2026-03-10
  checked: app/(tabs)/collections/[id].tsx lines 172-194 (handleDelete)
  found: Same pattern -- uses Alert.alert with button callbacks for delete collection confirmation. Also broken on web.
  implication: The "Delete" collection button in the header is ALSO broken on web (same bug, different action).

- timestamp: 2026-03-10
  checked: app/(tabs)/collections/[id].tsx lines 163-166 (handleAddRecipe error path)
  found: Error handler uses `Alert.alert('Error', ...)` for simple message display. This is also broken on web but less critical (only fires on error).
  implication: Error feedback for failed add-recipe is also invisible on web.

- timestamp: 2026-03-10
  checked: app/(tabs)/family/[id].tsx lines 67-90
  found: Family detail screen has two cross-platform helpers that were added to fix the same class of bug:
    - `showAlert(title, message)` -- uses `window.alert()` on web, `Alert.alert()` on native
    - `confirmAction(title, message, onConfirm)` -- uses `window.confirm()` on web, `Alert.alert()` with Cancel/Confirm buttons on native
  implication: The fix pattern already exists and is proven. Collection screen just never got it.

## Resolution

root_cause: `app/(tabs)/collections/[id].tsx` uses `Alert.alert()` from react-native for confirmation dialogs and error messages. On React Native Web, `Alert.alert` with button callbacks is a no-op -- the confirmation prompt never appears, so the destructive action callback never fires. The family detail screen (`app/(tabs)/family/[id].tsx`) already solved this with `showAlert()` and `confirmAction()` helpers that use `window.alert`/`window.confirm` on web.

fix: Replace all `Alert.alert()` calls in collections/[id].tsx with the same cross-platform pattern used in family/[id].tsx:
  1. Import `Platform` from react-native
  2. Add `showAlert()` and `confirmAction()` helper functions (or extract them to a shared utility)
  3. Replace `Alert.alert` in `handleRemoveRecipe` with `confirmAction`
  4. Replace `Alert.alert` in `handleDelete` with `confirmAction`
  5. Replace `Alert.alert` in `handleAddRecipe` error catch with `showAlert`

Affected functions (3 total):
  - `handleRemoveRecipe` (line 128) -- confirmation dialog, PRIMARY bug
  - `handleDelete` (line 172) -- confirmation dialog, ALSO broken
  - `handleAddRecipe` (line 152) -- error alert, broken but lower priority

verification: (empty -- diagnosis only)
files_changed: []
