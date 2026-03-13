---
estimated_steps: 4
estimated_files: 2
---

# T02: Add focus chaining to reset-password and collection create forms

**Slice:** S02 — Form UX & OAuth Branding
**Milestone:** M003

## Description

Wire `onSubmitEditing` on the reset-password form (single field → submit) and `useRef`-based focus chaining on the collection create form (name → description). This completes QA-04 coverage for all in-scope sequential forms. The collection create description field is multiline, so it must NOT receive `onSubmitEditing` (Enter inserts newlines).

## Steps

1. **Reset-password — add submit on Enter:**
   - On the password `TextInput` in `reset-password.tsx`: add `returnKeyType="go"` and `onSubmitEditing={onUpdatePassword}`
   - No refs needed (single field)

2. **Collection create — add name → description focus chain:**
   - Import `useRef` (add to existing `useState` import from `react`)
   - Add `TextInput` to the type-level imports from `react-native`
   - Create `const descriptionRef = useRef<TextInput>(null)`
   - On the name `TextInput`: add `returnKeyType="next"` and `onSubmitEditing={() => descriptionRef.current?.focus()}`
   - On the description `TextInput`: attach `ref={descriptionRef}` — do NOT add `onSubmitEditing` (it's multiline)

3. **Verify TypeScript compiles:** `npx tsc --noEmit`

4. **Run full verification suite:** `npx jest --passWithNoTests`, grep both files for correct props

## Must-Haves

- [ ] Reset-password password field has `returnKeyType="go"` and `onSubmitEditing={onUpdatePassword}`
- [ ] Collection create name field has `returnKeyType="next"` and `onSubmitEditing` that focuses description ref
- [ ] Collection create description field has `ref={descriptionRef}` but NO `onSubmitEditing` (multiline)
- [ ] `npx tsc --noEmit` passes
- [ ] All existing tests pass

## Verification

- `npx tsc --noEmit` exits 0
- `grep -c 'returnKeyType' app/(auth)/reset-password.tsx` returns 1
- `grep -c 'onSubmitEditing' app/(auth)/reset-password.tsx` returns 1
- `grep -c 'returnKeyType' app/(tabs)/collections/create.tsx` returns 1 (name only — description is multiline)
- `grep -c 'onSubmitEditing' app/(tabs)/collections/create.tsx` returns 1 (name only)
- `grep -c 'useRef' app/(tabs)/collections/create.tsx` returns at least 1
- `npx jest --passWithNoTests` passes

## Observability Impact

- Signals added/changed: None
- How a future agent inspects this: grep for `returnKeyType` and `onSubmitEditing` in form files
- Failure state exposed: None

## Inputs

- `app/(auth)/reset-password.tsx` — single password TextInput, no existing `onSubmitEditing` or `returnKeyType`
- `app/(tabs)/collections/create.tsx` — name (single-line) and description (multiline) TextInputs, no existing focus chaining
- T01 completed — login and signup forms already wired (pattern reference)

## Expected Output

- `app/(auth)/reset-password.tsx` — password field gains `returnKeyType="go"` + `onSubmitEditing={onUpdatePassword}`
- `app/(tabs)/collections/create.tsx` — name field gains `returnKeyType="next"` + `onSubmitEditing` focusing description ref; description gains `ref={descriptionRef}`
