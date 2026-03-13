---
id: T02
parent: S05
milestone: M003
provides:
  - Error state wired in Home screen, recipes index, and cook mode — catch blocks no longer silently swallow failures
  - RecipeForm title → description focus chaining via useRef + returnKeyType="next"
  - Collections index errorText token replacing hardcoded #d32f2f
key_files:
  - app/(tabs)/index.tsx
  - app/(tabs)/recipes/index.tsx
  - app/(tabs)/recipes/[id]/cook.tsx
  - app/(tabs)/collections/index.tsx
  - src/components/recipes/RecipeForm.tsx
key_decisions:
  - Home and recipes index show inline error text (not showAlert) since the error is a persistent load failure, not a transient action result
  - Cook mode differentiates load error (shows error message + Go Back) from not-found (shows "not found" message + Go Back) — separate code paths
  - Recipes index clears error at start of each loadRecipes call and only sets error if the sequence number is still current (prevents stale error from a superseded request)
patterns_established:
  - Use errorText token for all inline error text color — never hardcode hex values
  - Load-failure catch blocks should setError with a user-facing message, not silently swallow
observability_surfaces:
  - rg 'setError' app/(tabs)/ — shows which screens have error handling wired
  - Error state is visible in component state for each affected screen
duration: 12m
verification_result: passed
completed_at: 2026-03-12
blocker_discovered: false
---

# T02: Fix error handling gaps, RecipeForm focus chaining, and hardcoded colors

**Added error states to Home/recipes-index/cook-mode screens, wired RecipeForm title→description focus chaining, and replaced hardcoded error color with errorText token.**

## What Happened

Fixed five files addressing three categories of issues found during S05 research:

1. **Error handling gaps (3 screens):** Home screen (`app/(tabs)/index.tsx`), recipes index (`app/(tabs)/recipes/index.tsx`), and cook mode (`app/(tabs)/recipes/[id]/cook.tsx`) all had empty catch blocks that silently swallowed load errors. Added `error` state to each, set descriptive error messages in catch blocks, and added error UI that displays when loading fails. Cook mode now differentiates between a load error (network/auth failure) and a not-found state (recipe doesn't exist or access denied).

2. **Hardcoded color (1 file):** `app/(tabs)/collections/index.tsx` had `color: '#d32f2f'` for error text. Replaced with `errorText` token import from `@/lib/tokens`.

3. **Focus chaining (1 file):** `src/components/recipes/RecipeForm.tsx` title field lacked focus chaining to description. Added `useRef<TextInputType>(null)` for the description field, `returnKeyType="next"` on title, and `onSubmitEditing` that focuses the description ref. Description is multiline so it gets no `onSubmitEditing` (Enter inserts newlines).

## Verification

- `npx tsc --noEmit` — exits 0 (clean)
- `npx jest --ci` — 499 tests passed, 22 suites
- `rg 'setError' app/(tabs)/index.tsx` — 3 matches (state, clear, set)
- `rg 'setError' app/(tabs)/recipes/index.tsx` — 3 matches
- `rg 'setError' app/(tabs)/recipes/[id]/cook.tsx` — 2 matches (state, set)
- `rg '#d32f2f' app/(tabs)/collections/index.tsx` — 0 matches
- `rg 'returnKeyType' src/components/recipes/RecipeForm.tsx` — includes `"next"` for title field

### Slice-level checks (this task's scope):
- ✅ `rg 'Alert\.alert' app/ src/ --no-heading` — only matches in `src/lib/alert.ts` (T01 result preserved)
- ✅ `rg 'from.*@/lib/alert' app/ src/ -c` — 18 files (17 consumers + alert.ts itself)
- ✅ `npx tsc --noEmit` exits 0
- ✅ `npx jest --ci` passes (499 tests)
- ✅ `rg 'returnKeyType' src/components/recipes/RecipeForm.tsx` includes `"next"`
- ⬜ Web: dev server starts, login page loads — deferred to T03
- ⬜ iOS simulator: app launches without crash — deferred to T03

## Diagnostics

- `rg 'setError' app/(tabs)/` — shows all screens with error handling wired
- Each error state renders inline with `errorText` color token — visible in the UI when load fails
- Cook mode error vs. not-found: error state takes precedence (checked first), so a load failure shows "Failed to load recipe" instead of the generic "Recipe not found"

## Deviations

None.

## Known Issues

- `app/(tabs)/collections/[id].tsx` and `app/(tabs)/collections/create.tsx` also have hardcoded `#d32f2f` — outside this task's scope (plan only specified `collections/index.tsx`). Could be addressed in a future pass.

## Files Created/Modified

- `app/(tabs)/index.tsx` — Added error state, wired catch block, added error UI
- `app/(tabs)/recipes/index.tsx` — Added error state with sequence-aware catch, added error UI between loading and empty states
- `app/(tabs)/recipes/[id]/cook.tsx` — Added differentiated error state with dedicated error UI block before not-found check
- `app/(tabs)/collections/index.tsx` — Imported errorText token, replaced hardcoded `#d32f2f`
- `src/components/recipes/RecipeForm.tsx` — Added useRef/TextInputType imports, descriptionRef, title returnKeyType="next" + onSubmitEditing, description ref binding
