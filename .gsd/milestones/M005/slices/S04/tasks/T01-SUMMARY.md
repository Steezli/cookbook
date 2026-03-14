---
id: T01
parent: S04
milestone: M005
provides:
  - Shared OAuth redirect handler eliminating triplication across Google/Apple/Facebook
key_files:
  - src/features/auth/social-auth.ts
key_decisions:
  - Extracted handleOAuthRedirect as a private function (not exported) since it's an implementation detail
  - Used a union type OAuthProvider ('google' | 'apple' | 'facebook') instead of Supabase's broader Provider type for tighter contract
patterns_established:
  - OAuth redirect flow consolidated into single handleOAuthRedirect helper; provider-specific functions are thin wrappers
observability_surfaces:
  - none
duration: 10m
verification_result: passed
completed_at: 2026-03-14
blocker_discovered: false
---

# T01: Consolidate OAuth redirect handling

**Extracted shared `handleOAuthRedirect` helper, reducing 3 identical OAuth redirect implementations to 1.**

## What Happened

`signInWithGoogle`, `signInWithApple` (non-iOS), and `signInWithFacebook` all contained identical logic: call `signInWithOAuth` → open in-app browser on native → parse token from redirect URL hash → call `setSession`. This ~20-line block was copy-pasted across all three functions.

Extracted a single `handleOAuthRedirect(provider)` function that encapsulates the entire flow. Each provider function is now a one-liner calling the shared helper. The Apple iOS native path (nonce-based `signInWithIdToken`) remains separate since it's a fundamentally different flow.

Removed obvious/restated comments (e.g. "Ensure web browser auth sessions are properly dismissed" above `maybeCompleteAuthSession()`). Kept comments that explain non-obvious behavior (Apple nonce strategy, first-sign-in name capture).

## Verification

- `npx tsc --noEmit` — exits 0
- `npx jest` — 602 tests pass, 28 suites
- `openAuthSessionAsync` appears once in file (was 3×)
- `access_token` extraction appears once in file (was 3×)
- Return type shape `{ data, error }` preserved — callers unchanged

## Diagnostics

None — pure refactor with no new runtime surfaces.

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `src/features/auth/social-auth.ts` — Extracted `handleOAuthRedirect` shared helper, simplified provider functions to one-liners
