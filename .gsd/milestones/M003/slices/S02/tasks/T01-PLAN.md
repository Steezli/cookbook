---
estimated_steps: 5
estimated_files: 2
---

# T01: Add focus chaining to login and signup forms

**Slice:** S02 — Form UX & OAuth Branding
**Milestone:** M003

## Description

Wire `useRef`-based focus chaining on the login form (2 fields) and signup form (4 fields). After this task, pressing Enter/Next on any non-final field advances focus to the next field, and pressing Enter/Go on the final field submits the form. This directly addresses QA-04 for the two most important auth forms.

## Steps

1. **Login — add ref and chaining for email field:**
   - Import `useRef` (add to existing `useState` import from `react`)
   - Add `TextInput` to the type imports from `react-native` (already imported as value — need the type for ref)
   - Create `const passwordRef = useRef<TextInput>(null)`
   - On the email `TextInput`: add `returnKeyType="next"` and `onSubmitEditing={() => passwordRef.current?.focus()}`
   - On the password `TextInput`: attach `ref={passwordRef}`, verify existing `returnKeyType="go"` and `onSubmitEditing={onLogin}` are present

2. **Signup — add refs and chaining for all 4 fields:**
   - Import `useRef` (add to existing `useState` import)
   - Create refs: `emailRef`, `passwordRef`, `confirmPasswordRef` (all `useRef<TextInput>(null)`)
   - On fullName `TextInput`: add `returnKeyType="next"` + `onSubmitEditing={() => emailRef.current?.focus()}`
   - On email `TextInput`: attach `ref={emailRef}`, add `returnKeyType="next"` + `onSubmitEditing={() => passwordRef.current?.focus()}`
   - On password `TextInput`: attach `ref={passwordRef}`, add `returnKeyType="next"` + `onSubmitEditing={() => confirmPasswordRef.current?.focus()}`
   - On confirmPassword `TextInput`: attach `ref={confirmPasswordRef}`, verify existing `returnKeyType="go"` + `onSubmitEditing={onSignup}`

3. **Verify TypeScript compiles:** `npx tsc --noEmit`

4. **Verify with grep:** Confirm all fields have `returnKeyType` and `onSubmitEditing` props

5. **Run test suite:** `npx jest --passWithNoTests` to confirm no regressions

## Must-Haves

- [ ] Login email field has `returnKeyType="next"` and `onSubmitEditing` that focuses password
- [ ] Login password field has `ref={passwordRef}`, `returnKeyType="go"`, `onSubmitEditing={onLogin}`
- [ ] Signup name field has `returnKeyType="next"` and `onSubmitEditing` that focuses email
- [ ] Signup email field has `ref={emailRef}`, `returnKeyType="next"`, `onSubmitEditing` that focuses password
- [ ] Signup password field has `ref={passwordRef}`, `returnKeyType="next"`, `onSubmitEditing` that focuses confirmPassword
- [ ] Signup confirmPassword field has `ref={confirmPasswordRef}`, `returnKeyType="go"`, `onSubmitEditing={onSignup}`
- [ ] `npx tsc --noEmit` passes

## Verification

- `npx tsc --noEmit` exits 0
- `grep -c 'returnKeyType' app/(auth)/login.tsx` returns 2 (email + password)
- `grep -c 'onSubmitEditing' app/(auth)/login.tsx` returns 2
- `grep -c 'returnKeyType' app/(auth)/signup.tsx` returns 4 (name + email + password + confirmPassword)
- `grep -c 'onSubmitEditing' app/(auth)/signup.tsx` returns 4
- `grep -c 'useRef' app/(auth)/login.tsx` returns at least 1
- `grep -c 'useRef' app/(auth)/signup.tsx` returns at least 3

## Observability Impact

- Signals added/changed: None
- How a future agent inspects this: grep for `returnKeyType` and `onSubmitEditing` in auth form files
- Failure state exposed: None (TypeScript catches ref type mismatches at compile time)

## Inputs

- `app/(auth)/login.tsx` — existing login form with 2 TextInputs; password already has `returnKeyType="go"` + `onSubmitEditing={onLogin}`
- `app/(auth)/signup.tsx` — existing signup form with 4 TextInputs; only confirmPassword has `returnKeyType="go"` + `onSubmitEditing={onSignup}`
- `app/(auth)/forgot-password.tsx` — reference pattern: single field with `returnKeyType="go"` + `onSubmitEditing={onSubmit}` (read-only reference, not modified)

## Expected Output

- `app/(auth)/login.tsx` — email field gains `returnKeyType="next"` + `onSubmitEditing` focusing password ref; password gains `ref={passwordRef}`
- `app/(auth)/signup.tsx` — all 4 fields have `returnKeyType` and `onSubmitEditing`; 3 refs created for email, password, confirmPassword
