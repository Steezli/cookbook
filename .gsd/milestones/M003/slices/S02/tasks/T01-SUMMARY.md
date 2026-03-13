---
id: T01
parent: S02
milestone: M003
provides:
  - Focus chaining on login form (email → password → submit)
  - Focus chaining on signup form (name → email → password → confirmPassword → submit)
key_files:
  - app/(auth)/login.tsx
  - app/(auth)/signup.tsx
key_decisions:
  - Used `TextInput as TextInputType` type alias for ref typing to avoid conflict with the value import already present
patterns_established:
  - useRef<TextInputType>(null) pattern for focus chaining across RN TextInputs
  - returnKeyType="next" + onSubmitEditing with ref.current?.focus() for field-to-field chaining
  - returnKeyType="go" + onSubmitEditing={handler} for final-field submission
observability_surfaces:
  - none
duration: fast
verification_result: passed
completed_at: 2026-03-12
blocker_discovered: false
---

# T01: Add focus chaining to login and signup forms

**Wired useRef-based focus chaining on login (2 fields) and signup (4 fields) so Enter/Next advances focus and Enter/Go submits.**

## What Happened

Added `useRef` imports and `TextInput` type imports to both auth form files. Created ref objects for each non-first field (1 ref in login, 3 refs in signup). Attached `returnKeyType="next"` and `onSubmitEditing` focus-forwarding callbacks to all non-final fields. Attached `ref` props to all target fields. Verified the existing `returnKeyType="go"` and `onSubmitEditing={handler}` on final fields were already in place.

Login chain: email → password → submit (onLogin)
Signup chain: fullName → email → password → confirmPassword → submit (onSignup)

## Verification

- `npx tsc --noEmit` — exits 0 ✅
- `npx jest --passWithNoTests` — 22 suites, 502 tests passed ✅
- `grep -c 'returnKeyType' app/(auth)/login.tsx` → 2 ✅
- `grep -c 'onSubmitEditing' app/(auth)/login.tsx` → 2 ✅
- `grep -c 'returnKeyType' app/(auth)/signup.tsx` → 4 ✅
- `grep -c 'onSubmitEditing' app/(auth)/signup.tsx` → 4 ✅
- `grep -c 'useRef' app/(auth)/login.tsx` → 2 (≥1) ✅
- `grep -c 'useRef' app/(auth)/signup.tsx` → 4 (≥3) ✅

### Slice-level checks (partial — T01 scope only):
- ✅ login.tsx: email has returnKeyType="next" + onSubmitEditing focusing password ref, password has returnKeyType="go" + onSubmitEditing={onLogin}
- ✅ signup.tsx: 3 returnKeyType="next" fields + 1 returnKeyType="go" + 4 onSubmitEditing with proper chaining
- ⬜ reset-password.tsx — not in T01 scope
- ⬜ collections/create.tsx — not in T01 scope
- ⬜ docs/oauth-branding.md — not in T01 scope

## Diagnostics

None — this is pure form UX wiring. TypeScript catches ref type mismatches at compile time. Grep for `returnKeyType` and `onSubmitEditing` in auth form files to verify wiring.

## Deviations

Used `import type { TextInput as TextInputType } from 'react-native'` instead of adding `TextInput` to the type imports as the plan suggested. The value import of `TextInput` was already present in both files, so an alias was needed to avoid a duplicate identifier. This achieves the same result.

## Known Issues

None.

## Files Created/Modified

- `app/(auth)/login.tsx` — Added useRef import, passwordRef, returnKeyType="next" + onSubmitEditing on email, ref={passwordRef} on password
- `app/(auth)/signup.tsx` — Added useRef import, 3 refs (emailRef, passwordRef, confirmPasswordRef), returnKeyType="next" + onSubmitEditing on name/email/password, refs on email/password/confirmPassword
