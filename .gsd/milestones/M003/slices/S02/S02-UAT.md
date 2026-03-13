# S02: Form UX & OAuth Branding — UAT

**Milestone:** M003
**Written:** 2026-03-12

## UAT Type

- UAT mode: artifact-driven
- Why this mode is sufficient: Focus chaining is wired via standard React Native props (`returnKeyType`, `onSubmitEditing`, `ref`). Correct wiring is verified by TypeScript compilation (ref types must match) and grep pattern matching (all fields have the required props). Runtime keyboard behavior is a platform concern verified in S05's cross-platform audit.

## Preconditions

- Repository checked out on the `gsd/M003/S02` branch
- Node modules installed (`npm install`)
- TypeScript compiler available (`npx tsc`)
- Jest test runner available (`npx jest`)

## Smoke Test

Run `npx tsc --noEmit && npx jest --passWithNoTests` — both exit 0. This confirms all ref types are correct and no existing functionality is broken.

## Test Cases

### 1. Login form focus chaining

1. `grep -n 'returnKeyType\|onSubmitEditing\|useRef.*TextInput\|\.focus()' app/(auth)/login.tsx`
2. **Expected:** email field has `returnKeyType="next"` + `onSubmitEditing` calling `passwordRef.current?.focus()`. Password field has `returnKeyType="go"` + `onSubmitEditing={onLogin}`. One `useRef` for passwordRef.

### 2. Signup form focus chaining

1. `grep -n 'returnKeyType\|onSubmitEditing\|useRef.*TextInput\|\.focus()' app/(auth)/signup.tsx`
2. **Expected:** 3 fields have `returnKeyType="next"` with focus-forwarding `onSubmitEditing`. Final field has `returnKeyType="go"` + `onSubmitEditing={onSignup}`. 3 refs (emailRef, passwordRef, confirmPasswordRef).

### 3. Reset-password Enter-to-submit

1. `grep -n 'returnKeyType\|onSubmitEditing' app/(auth)/reset-password.tsx`
2. **Expected:** Password field has `returnKeyType="go"` + `onSubmitEditing={onUpdatePassword}`.

### 4. Collection create name → description chaining

1. `grep -n 'returnKeyType\|onSubmitEditing\|useRef.*TextInput\|\.focus()' app/(tabs)/collections/create.tsx`
2. **Expected:** Name field has `returnKeyType="next"` + `onSubmitEditing` focusing descriptionRef. Description field has `ref={descriptionRef}` but no `onSubmitEditing` (multiline).

### 5. OAuth branding documentation

1. `test -f docs/oauth-branding.md && echo EXISTS`
2. `grep -c 'Google Cloud Console' docs/oauth-branding.md`
3. `grep -c 'Apple Developer' docs/oauth-branding.md`
4. `grep -c 'Supabase' docs/oauth-branding.md`
5. **Expected:** File exists. Contains sections for Google Cloud Console (≥5 mentions), Apple Developer (≥3 mentions), and Supabase (≥5 mentions).

### 6. TypeScript and test suite integrity

1. `npx tsc --noEmit`
2. `npx jest --passWithNoTests`
3. **Expected:** Both exit 0. No new TypeScript errors. 502 tests pass across 22 suites.

## Edge Cases

### Multiline field has no onSubmitEditing

1. `grep 'onSubmitEditing' app/(tabs)/collections/create.tsx | wc -l`
2. **Expected:** Exactly 1 (name field only). The multiline description field must NOT have `onSubmitEditing` — Enter inserts newlines.

## Failure Signals

- `npx tsc --noEmit` fails with ref type errors → ref typing is wrong
- `grep -c 'returnKeyType' <file>` returns fewer matches than expected → fields missing keyboard props
- `grep -c 'onSubmitEditing' <file>` returns fewer matches than expected → submit/focus chaining incomplete
- `docs/oauth-branding.md` doesn't exist → documentation task incomplete
- Test suite has failures → existing functionality broken by changes

## Requirements Proved By This UAT

- QA-04 — Form Enter-key submission: All auth forms (login, signup, reset-password) and collection create form have focus chaining and Enter-to-submit wired and verified by TypeScript compilation + grep pattern analysis. RecipeForm coverage deferred to S05.
- QA-05 — OAuth consent branding: Documentation file exists with actionable steps for Google, Apple, and Supabase. Requirement is documentation-only; deliverable is complete.

## Not Proven By This UAT

- Runtime keyboard behavior on iOS/Android devices (focus actually moves, keyboard type changes) — deferred to S05 cross-platform verification
- RecipeForm Enter-key behavior — not in S02 scope, deferred to S05
- Actual execution of OAuth console branding steps — documentation-only deliverable, actual configuration is a manual ops task

## Notes for Tester

- Focus chaining is a runtime behavior that can't be fully verified without running the app on a device or simulator. This UAT verifies the code wiring is correct. S05 will exercise these forms in the iOS simulator.
- The `TextInput as TextInputType` alias is used because `TextInput` is already imported as a component value — the alias avoids duplicate identifier errors.
