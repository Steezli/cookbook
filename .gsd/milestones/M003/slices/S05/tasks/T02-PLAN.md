---
estimated_steps: 5
estimated_files: 5
---

# T02: Fix error handling gaps, RecipeForm focus chaining, and hardcoded colors

**Slice:** S05 — Full App Audit & Cross-Platform Verification
**Milestone:** M003

## Description

Fixes the specific error handling gaps found during S05 research and completes RecipeForm focus chaining for QA-04. The Home screen and recipes/index silently swallow load errors (empty catch blocks). Cook mode falls through to a generic "not found" message for all failures. Collections/index has a hardcoded `#d32f2f` error color. RecipeForm title field lacks focus chaining to description.

## Steps

1. **Home screen error state** (`app/(tabs)/index.tsx`): Add `const [error, setError] = useState<string | null>(null)`. In the existing catch block (line ~88), set `setError('Unable to load recipes. Pull down to refresh.')`. In the render, if `error && !isLoading`, show an error text element styled with `errorText` token. Use `showAlert` from `@/lib/alert` if appropriate, or inline error text in the UI.

2. **Recipes index error state** (`app/(tabs)/recipes/index.tsx`): Add `error` state. In the outer catch block (line ~99), set error state with a descriptive message. Show error feedback in the UI when error is set and not loading. Clear error state at the start of each load attempt.

3. **Cook mode error differentiation** (`app/(tabs)/recipes/[id]/cook.tsx`): Add `error` state. In the catch block (line ~59), set `setError('Failed to load recipe')` instead of silently falling through. Add an error-specific UI block that shows the error message with a "Go Back" button, rendered before the existing `!recipe` null check (which remains for the "not found" case).

4. **Collections index token** (`app/(tabs)/collections/index.tsx`): Import `errorText` from `@/lib/tokens`. Replace hardcoded `color: '#d32f2f'` (line ~172) with `color: errorText`.

5. **RecipeForm focus chaining** (`src/components/recipes/RecipeForm.tsx`): Import `useRef` and `TextInput as TextInputType` (per S02 pattern). Create `const descriptionRef = useRef<TextInputType>(null)`. On the title TextInput: add `returnKeyType="next"` and `onSubmitEditing={() => descriptionRef.current?.focus()}`. On the description TextInput: add `ref={descriptionRef}` (no `onSubmitEditing` — it's multiline, Enter inserts newlines). Verify with `npx tsc --noEmit` and `npx jest --ci`.

## Must-Haves

- [ ] Home screen shows error feedback when data loading fails (not empty catch)
- [ ] Recipes index shows error feedback when data loading fails (not silent catch)
- [ ] Cook mode has differentiated error state (load failure vs. not found)
- [ ] Collections index uses `errorText` token instead of `#d32f2f`
- [ ] RecipeForm title has `returnKeyType="next"` + `onSubmitEditing` focusing description ref
- [ ] `npx tsc --noEmit` exits 0
- [ ] `npx jest --ci` passes (499 tests)

## Verification

- `rg 'setError' app/(tabs)/index.tsx` — at least 1 match (error state exists)
- `rg 'setError' app/(tabs)/recipes/index.tsx` — at least 1 match
- `rg 'setError' app/(tabs)/recipes/[id]/cook.tsx` — at least 1 match
- `rg '#d32f2f' app/` — zero matches
- `rg 'returnKeyType' src/components/recipes/RecipeForm.tsx` — includes a "next" for title field
- `npx tsc --noEmit` — exits 0
- `npx jest --ci` — 499 tests pass

## Observability Impact

- Signals added/changed: Three screens now expose load failure to users instead of silently swallowing; error state is visible in component state
- How a future agent inspects this: `rg 'setError' app/(tabs)/` shows which screens have error handling wired
- Failure state exposed: Home, recipes list, and cook mode now show descriptive error text when data loading fails

## Inputs

- T01 output: `src/lib/alert.ts` available for import (use `showAlert` if needed for error display)
- S02 pattern: `TextInput as TextInputType`, `useRef<TextInputType>(null)`, `returnKeyType="next"`, `onSubmitEditing`
- S03 tokens: `errorText` available from `src/lib/tokens.ts`
- Research: specific line numbers for catch blocks and hardcoded color

## Expected Output

- `app/(tabs)/index.tsx` — error state added, catch block surfaces error, UI shows feedback
- `app/(tabs)/recipes/index.tsx` — error state added, catch block surfaces error, UI shows feedback
- `app/(tabs)/recipes/[id]/cook.tsx` — error state added with differentiated UI for load failure vs. not found
- `app/(tabs)/collections/index.tsx` — hardcoded `#d32f2f` replaced with `errorText` token
- `src/components/recipes/RecipeForm.tsx` — title → description focus chaining wired with useRef
