---
id: T02
parent: S03
milestone: M005
provides:
  - Web scan upload marks job as failed on edge function error (mirrors native path)
  - ensureProfile logs failures with structured prefix instead of swallowing silently
key_files:
  - src/features/scan/scan-photos.ts
  - src/features/auth/session.tsx
key_decisions:
  - Web path error handling mirrors native path pattern — update job status to 'failed' with user-facing error message in .catch()
patterns_established:
  - Edge function .catch() handlers should always update job status to 'failed' so users see an error instead of a stuck job
  - Auth-adjacent best-effort operations log with '[SessionProvider]' prefix on failure
observability_surfaces:
  - "[SessionProvider] ensureProfile failed:" console.warn on profile upsert failure
  - scan_jobs.status='failed' + error_message set on web edge function invocation failure
duration: 8m
verification_result: passed
completed_at: 2026-03-14
blocker_discovered: false
---

# T02: Fix error handling in scan upload and session provider

**Web scan upload now marks jobs as failed on edge function error; ensureProfile logs failures instead of swallowing them silently.**

## What Happened

Two silent error-swallowing patterns were fixed:

1. **Web scan upload path** (`scan-photos.ts`): The `.catch()` handler on the edge function invocation only logged a warning but left the job in a pending/processing state forever. Added a `scan_jobs` update to set `status: 'failed'` and `error_message` — the same pattern already used by the native (inline) path.

2. **ensureProfile** (`session.tsx`): The `{ error }` from the profiles upsert was destructured but never inspected. Added a `console.warn('[SessionProvider] ensureProfile failed:', error.message)` so failures are observable in logs while still being non-blocking for auth flow.

## Verification

- `npx tsc --noEmit` — exits 0 (clean)
- `npx jest` — 602 tests passing, 28 suites
- Code review: web `.catch()` now matches native path's error handling pattern
- Code review: ensureProfile error path now logs with structured prefix

### Slice-level checks (intermediate — T02 of 3):
- ✅ `npx tsc --noEmit` exits 0
- ✅ `npx jest` — all tests pass
- ⏳ `grep -r ': any'` — 4 hits remain in `multi-recipe-parser.ts` (likely T03 scope)
- ⏳ `curl localhost:3000/health` — health endpoint not yet added (T03 scope)

## Diagnostics

- **ensureProfile failures**: Look for `[SessionProvider] ensureProfile failed:` in console output. The error message from Supabase is included.
- **Web scan upload failures**: Check `scan_jobs` table for `status='failed'` rows. The `error_message` column contains the user-facing message. The original error is logged to console as `[scan-photos] Edge function invocation failed (web path):`.

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `src/features/scan/scan-photos.ts` — Web path .catch() now marks job as failed with error_message (mirrors native path)
- `src/features/auth/session.tsx` — ensureProfile logs errors with [SessionProvider] prefix instead of swallowing silently
