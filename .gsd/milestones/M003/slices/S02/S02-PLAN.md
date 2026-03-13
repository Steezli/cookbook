# S02: Form UX & OAuth Branding

**Goal:** Every sequential auth form chains focus on Enter/Next and submits on the final field. OAuth consent branding steps documented for Google and Apple.
**Demo:** On login, tap Enter after email → password focuses. Tap Enter after password → form submits. Same chaining on signup (4 fields) and collection create (name → description). Reset-password submits on Enter. Documentation file explains how to brand the OAuth consent screens.

## Must-Haves

- Login form: email → password focus chain, password Enter → submit
- Signup form: name → email → password → confirmPassword focus chain, confirmPassword Enter → submit
- Reset-password form: password field Enter → submit
- Collection create form: name field Enter → focus description (description is multiline, no `onSubmitEditing`)
- `returnKeyType="next"` on all non-final single-line fields, `returnKeyType="go"` on final fields
- OAuth branding documentation covering Google Cloud Console and Apple Developer portal steps
- `npx tsc --noEmit` still passes
- All existing tests still pass

## Proof Level

- This slice proves: integration (keyboard interaction wiring verified by TypeScript compilation + manual verification commands)
- Real runtime required: yes (focus chaining is a runtime behavior — verified by code review + `tsc` + test suite, with browser verification during execution)
- Human/UAT required: no (behavioral correctness is verifiable from code patterns; full UX feel verified in S05 cross-platform audit)

## Verification

- `npx tsc --noEmit` — exits 0 (all new refs and props are type-correct)
- `npx jest --passWithNoTests` — all existing tests still pass
- `grep -n 'returnKeyType\|onSubmitEditing\|useRef.*TextInput\|\.focus()' app/(auth)/login.tsx` — shows email has `returnKeyType="next"` + `onSubmitEditing` focusing password ref, password has `returnKeyType="go"` + `onSubmitEditing={onLogin}`
- `grep -n 'returnKeyType\|onSubmitEditing\|useRef.*TextInput\|\.focus()' app/(auth)/signup.tsx` — shows 3 `returnKeyType="next"` fields + 1 `returnKeyType="go"` + 4 refs with proper chaining
- `grep -n 'returnKeyType\|onSubmitEditing' app/(auth)/reset-password.tsx` — shows `returnKeyType="go"` + `onSubmitEditing={onUpdatePassword}`
- `grep -n 'returnKeyType\|onSubmitEditing\|useRef.*TextInput\|\.focus()' app/(tabs)/collections/create.tsx` — shows name has `returnKeyType="next"` + focus to description ref
- `test -f docs/oauth-branding.md` — exits 0 (documentation file exists)

## Observability / Diagnostics

- Runtime signals: none (no new runtime logging — this is form UX wiring and documentation)
- Inspection surfaces: grep patterns above verify correct wiring in source files
- Failure visibility: TypeScript compilation catches ref type mismatches; incorrect `onSubmitEditing` wiring would be caught by `tsc --noEmit`
- Redaction constraints: none

## Integration Closure

- Upstream surfaces consumed: none (S02 is independent of other slices)
- New wiring introduced in this slice: `useRef<TextInput>` refs and `onSubmitEditing` handlers in 4 form files; new `docs/oauth-branding.md` documentation file
- What remains before the milestone is truly usable end-to-end: S03 (scan UI polish), S04 (logging/dead code), S05 (full audit with cross-platform verification of these form changes)

## Tasks

- [x] **T01: Add focus chaining to login and signup forms** `est:30m`
  - Why: Login has 2 fields with no chaining on email; signup has 4 fields with chaining only on the last. Both need full `useRef`-based focus chains so Enter advances through every field and submits on the last.
  - Files: `app/(auth)/login.tsx`, `app/(auth)/signup.tsx`
  - Do: Import `useRef` and `TextInput` type. Create refs for each field after the first. Add `returnKeyType="next"` + `onSubmitEditing={() => nextRef.current?.focus()}` to non-final fields. Ensure final field has `returnKeyType="go"` + `onSubmitEditing={submitFn}`. Attach `ref={...}` to each `TextInput`.
  - Verify: `npx tsc --noEmit` passes; grep confirms all fields have `returnKeyType` and `onSubmitEditing`
  - Done when: Login chains email→password→submit. Signup chains name→email→password→confirmPassword→submit. TypeScript compiles clean.

- [x] **T02: Add focus chaining to reset-password and collection create forms** `est:20m`
  - Why: Reset-password has a single password field with no `onSubmitEditing`. Collection create has name and description (multiline) with no chaining. Both need wiring.
  - Files: `app/(auth)/reset-password.tsx`, `app/(tabs)/collections/create.tsx`
  - Do: Reset-password: add `returnKeyType="go"` + `onSubmitEditing={onUpdatePassword}` to the password TextInput. Collection create: import `useRef`/`TextInput`, create description ref, add `returnKeyType="next"` + `onSubmitEditing` on name to focus description ref. Do NOT add `onSubmitEditing` to the multiline description field.
  - Verify: `npx tsc --noEmit` passes; grep confirms props are present; `npx jest --passWithNoTests` all tests pass
  - Done when: Reset-password submits on Enter. Collection create focuses description when Enter is pressed in name field. All tests and TypeScript still pass.

- [x] **T03: Write OAuth consent branding documentation** `est:25m`
  - Why: QA-05 requires documenting how to brand the Google and Apple OAuth consent screens so users see "Berven Book" instead of the raw Supabase URL. This is a console configuration task, not code.
  - Files: `docs/oauth-branding.md`
  - Do: Create `docs/oauth-branding.md` with step-by-step instructions for: (1) Google Cloud Console — OAuth consent screen app name, logo, support email, authorized domains, verification status; (2) Apple Developer — Service ID display name for Sign in with Apple; (3) Supabase Dashboard — verify provider config references correctly branded Google/Apple apps. Include notes about domain verification requirements and redirect URI behavior.
  - Verify: `test -f docs/oauth-branding.md` exits 0; file contains sections for Google, Apple, and Supabase
  - Done when: Documentation file exists with actionable steps for all three platforms, including caveats about verification status and redirect URIs.

## Files Likely Touched

- `app/(auth)/login.tsx`
- `app/(auth)/signup.tsx`
- `app/(auth)/reset-password.tsx`
- `app/(tabs)/collections/create.tsx`
- `docs/oauth-branding.md`
