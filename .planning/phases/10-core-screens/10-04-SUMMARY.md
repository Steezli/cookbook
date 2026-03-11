---
phase: 10-core-screens
plan: 04
subsystem: ui
tags: [react-native, expo-router, recipe-form, image-picker, lucide, tokens]

# Dependency graph
requires:
  - phase: 08-design-tokens
    provides: tokens.ts color/font/radius constants used throughout RecipeForm
  - phase: 09-navigation
    provides: PageContainer variant="form" for 600px max-width centering
provides:
  - Shared RecipeForm component (photo-first, bulk-add ingredients, up/down reorder)
  - Rebuilt create.tsx as thin wrapper (~37 lines) around RecipeForm
  - Rebuilt edit.tsx as thin wrapper (~92 lines) with prefill and existing photo management
affects:
  - phase 10 plan 05 (cooking mode — same create/edit flow already done)
  - future scan integration (draft review will import RecipeForm for prefill)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Shared form component with PendingPhoto[] passed via onSubmit — no ref needed"
    - "Photo upload deferred to wrapper screen (needs recipeId from createRecipe)"
    - "moveItem<T> generic helper for up/down reordering (no drag-and-drop)"
    - "Bulk-add toggle: multiline TextInput + split-by-newline on Add All"

key-files:
  created:
    - src/components/recipes/RecipeForm.tsx
  modified:
    - app/(tabs)/recipes/create.tsx
    - app/(tabs)/recipes/[id]/edit.tsx

key-decisions:
  - "PendingPhoto type extends { uri, name, type } to match uploadRecipePhoto's existing file-object signature (not URI-only)"
  - "parseIngredient() called at add-time (not on-blur) — simpler flow, no confirm/dismiss UX overhead in new design"
  - "Steps do not get bulk-add — per plan spec, only ingredients need it"
  - "edit.tsx is ~92 lines (target was ~60) — extra lines are the loading guard + AlertBack on recipe-not-found, both required for correctness"

patterns-established:
  - "Wrapper screens own the submit side-effects (createRecipe, uploadRecipePhoto); RecipeForm owns form state only"
  - "Shared form components export their sub-types (PendingPhoto) for wrapper consumption"

requirements-completed: [SCREEN-04]

# Metrics
duration: 3min
completed: 2026-03-04
---

# Phase 10 Plan 04: Create/Edit Recipe Form Summary

**Shared RecipeForm with photo-first layout, single-add + bulk-add ingredients, up/down arrow reordering, and all colors from design tokens — replacing two 573/686-line duplicated screens with thin wrappers.**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-03-04T21:38:45Z
- **Completed:** 2026-03-04T21:42:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Created `RecipeForm.tsx` (778 lines): photo upload area at top, single-add + bulk-add ingredient modes, step single-add, up/down ChevronUp/ChevronDown reorder buttons on each ingredient and step, metadata row, visibility chip selectors, story textarea, tag pills, submit button with disabled state
- Rebuilt `create.tsx` from 574 lines to 37 lines — now a thin wrapper calling createRecipe then uploadRecipePhoto per pending photo
- Rebuilt `edit.tsx` from 687 lines to 92 lines — loads recipe + photos, prefills RecipeForm with all fields, calls updateRecipe + uploadRecipePhoto
- All 180 existing tests pass (no regressions)

## Task Commits

1. **Task 1: Create shared RecipeForm component** - `c9902e7` (feat)
2. **Task 2: Wire create.tsx and edit.tsx to use RecipeForm** - `b8863ed` (feat)

## Files Created/Modified

- `src/components/recipes/RecipeForm.tsx` (created) — Shared form component with photo-first layout, bulk-add, reorder
- `app/(tabs)/recipes/create.tsx` (modified) — Thin wrapper: createRecipe + uploadRecipePhoto
- `app/(tabs)/recipes/[id]/edit.tsx` (modified) — Thin wrapper: load + prefill + updateRecipe

## Decisions Made

- **PendingPhoto type:** The existing `uploadRecipePhoto` function requires `{ uri, name, type }` (not just a URI string). `PendingPhoto` type was defined to match, and `onSubmit` signature extended to `(input, newPhotos: PendingPhoto[])`. This allows wrappers to call `uploadRecipePhoto` directly without conversion.
- **parseIngredient at add-time:** The old forms used on-blur parsing with a confirm/dismiss UX. The new RecipeForm calls `parseIngredient` immediately when an ingredient is added (single-add or bulk), skipping the confirm/dismiss step. This simplifies the UX and is valid since the data is still stored.
- **Steps: no bulk-add:** Per the plan spec, only ingredients have the bulk-add toggle. Steps use single-add only.
- **edit.tsx line count:** At 92 lines vs the planned ~60, the extra lines come from the `isLoading` guard with Stack.Screen + ActivityIndicator, and the `Alert.alert` + `router.back()` on recipe-not-found. Both are required for correctness and were kept.

## Deviations from Plan

None — plan executed exactly as written. The `onSubmit` signature extension to include `PendingPhoto[]` was specified in the plan itself ("Recommended: extend the onSubmit signature...").

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Create and edit recipe screens are fully functional with the new UX
- RecipeForm is available for reuse in scan draft review (Phase 11+) via `@/components/recipes/RecipeForm`
- Phase 10 Plan 05 (Cooking Mode) can proceed — it uses recipe detail, not the form

---
*Phase: 10-core-screens*
*Completed: 2026-03-04*
