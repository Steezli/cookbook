---
id: T02
parent: S02
milestone: M003
provides:
  - Focus chaining on reset-password form (single field → submit on Enter)
  - Focus chaining on collection create form (name → description focus, no onSubmitEditing on multiline)
key_files:
  - app/(auth)/reset-password.tsx
  - app/(tabs)/collections/create.tsx
key_decisions:
  - Reused `TextInput as TextInputType` type alias pattern from T01 for collection create ref typing
patterns_established:
  - returnKeyType="go" + onSubmitEditing={handler} for single-field forms (reset-password)
  - Multiline TextInputs get ref but NO onSubmitEditing (Enter inserts newlines)
observability_surfaces:
  - none
duration: fast
verification_result: passed
completed_at: 2026-03-12
blocker_discovered: false
---

# T02: Add focus chaining to reset-password and collection create forms

**Wired Enter-to-submit on reset-password and name→description focus chaining on collection create, completing QA-04 coverage for all in-scope sequential forms.**

## What Happened

Reset-password: Added `returnKeyType="go"` and `onSubmitEditing={onUpdatePassword}` to the single password TextInput. No refs needed since it's a single-field form.

Collection create: Added `useRef` import and `TextInput as TextInputType` type alias. Created `descriptionRef` ref. Added `returnKeyType="next"` and `onSubmitEditing={() => descriptionRef.current?.focus()}` to the name TextInput. Attached `ref={descriptionRef}` to the description TextInput without `onSubmitEditing` since it's multiline (Enter inserts newlines).

## Verification

- `npx tsc --noEmit` — exits 0 ✅
- `npx jest --passWithNoTests` — 22 suites, 502 tests passed ✅
- `grep -c 'returnKeyType' app/(auth)/reset-password.tsx` → 1 ✅
- `grep -c 'onSubmitEditing' app/(auth)/reset-password.tsx` → 1 ✅
- `grep -c 'returnKeyType' app/(tabs)/collections/create.tsx` → 1 (name only) ✅
- `grep -c 'onSubmitEditing' app/(tabs)/collections/create.tsx` → 1 (name only) ✅
- `grep -c 'useRef' app/(tabs)/collections/create.tsx` → 2 (≥1) ✅

### Slice-level checks (cumulative through T02):
- ✅ login.tsx: email has returnKeyType="next" + onSubmitEditing focusing password ref, password has returnKeyType="go" + onSubmitEditing={onLogin}
- ✅ signup.tsx: 3 returnKeyType="next" fields + 1 returnKeyType="go" + 4 onSubmitEditing with proper chaining
- ✅ reset-password.tsx: returnKeyType="go" + onSubmitEditing={onUpdatePassword}
- ✅ collections/create.tsx: name has returnKeyType="next" + focus to description ref
- ⬜ docs/oauth-branding.md — T03 scope

## Diagnostics

None — this is pure form UX wiring. TypeScript catches ref type mismatches at compile time. Grep for `returnKeyType` and `onSubmitEditing` in form files to verify wiring.

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `app/(auth)/reset-password.tsx` — Added returnKeyType="go" + onSubmitEditing={onUpdatePassword} on password field
- `app/(tabs)/collections/create.tsx` — Added useRef import, TextInputType alias, descriptionRef, returnKeyType="next" + onSubmitEditing on name field, ref={descriptionRef} on description field
