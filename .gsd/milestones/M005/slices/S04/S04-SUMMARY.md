---
id: S04
parent: M005
milestone: M005
provides:
  - Consolidated OAuth redirect handling (3 providers → 1 shared helper)
  - Cleaned up ~254 lines of restating/obvious comments across 12 files
  - Consistent auth pattern across all API modules (getUser for mutations, getSession for reads)
  - Standardized error handling (throw Supabase errors directly)
requires:
  - slice: S01
    provides: Security fixes (search injection, retry logic, non-mutating backfill)
  - slice: S02
    provides: Performance optimization (photo queries, parser sync, deprecated code removal)
affects:
  - S05
key_files:
  - src/features/auth/social-auth.ts
  - src/features/ratings/api.ts
  - src/features/scan/scan-service.ts
  - src/features/units/api.ts
  - src/features/recipes/api.ts
  - src/features/recipes/photos.ts
  - src/features/recipes/search.ts
  - src/features/recipes/public.ts
  - src/features/collections/api.ts
  - src/features/comments/api.ts
  - src/features/scan/scan-photos.ts
  - src/features/scan/scan-upload.ts
  - src/features/scan/types.ts
  - src/features/units/types.ts
  - src/lib/scan/scan-draft-service.ts
key_decisions:
  - "OAuth redirect consolidation: shared handleOAuthRedirect helper, provider functions are thin wrappers"
  - "Comment standard: only retain comments that explain non-obvious behavior, edge cases, business logic, or platform-specific workarounds"
  - "Auth convention: getUser() for mutations, getSession() for reads, no auth for public reads"
  - "Error convention: throw Supabase error objects directly (they already contain descriptive messages)"
  - "Retained as Type casts — domain types have richer typing than DB row types (Json columns), making casts structurally necessary"
patterns_established:
  - "OAuth redirect flow consolidated into single handleOAuthRedirect helper; provider-specific functions are thin wrappers"
  - "Comment standard: only retain comments that explain WHY (business logic, edge cases, platform workarounds)"
  - "Auth convention: getUser() for mutations, getSession() for reads"
  - "Error convention: throw Supabase errors directly, no custom wrapping"
observability_surfaces:
  - none
drill_down_paths:
  - .gsd/milestones/M005/slices/S04/tasks/T01-SUMMARY.md
  - .gsd/milestones/M005/slices/S04/tasks/T02-SUMMARY.md
  - .gsd/milestones/M005/slices/S04/tasks/T03-SUMMARY.md
duration: 40m
verification_result: passed
completed_at: 2026-03-14
---

# S04: Code Quality & Readability

**Consolidated OAuth redirect handling, cleaned up ~254 lines of noise comments, and standardized auth/error patterns across all API modules.**

## What Happened

Three tasks targeted code quality and readability across the codebase:

**OAuth consolidation (T01):** The three OAuth providers (Google, Apple non-iOS, Facebook) shared identical redirect handling — `signInWithOAuth` → open in-app browser → parse tokens from URL hash → `setSession`. Extracted a shared `handleOAuthRedirect(provider)` function, reducing each provider function to a one-liner. The Apple iOS native path (nonce-based `signInWithIdToken`) correctly remains separate since it's a fundamentally different flow. `openAuthSessionAsync` and `access_token` extraction each appear once in the file (was 3×).

**Comment cleanup (T02):** Audited all `src/features/*/api.ts`, `src/features/*/types.ts`, and `src/lib/**/*.ts` files. Removed ~254 lines of comments that restated function names or described obvious code. Preserved every comment that explains WHY (RLS behavior, iOS 0-byte Storage bug, inline retry semantics), edge cases (unique constraint 23505, HEIC→JPEG compatibility), or platform-specific workarounds. Also removed unused imports (`supabase`, `uploadScanPhoto`) from scan-upload.ts discovered during the pass.

**API standardization (T03):** Audited all 6 API modules for auth and error handling consistency. Fixed 3 inconsistencies: `getUserRating` (a read) switched from `getUser()` to `getSession()`, `createMultiPhotoScanJob` (a mutation) switched from `getSession()` to `getUser()`, and `getUnitPreference` (a read) switched to `getSession()` with standardized error handling. Investigated `as Type` casts — determined they're structurally necessary since domain types have richer typing than auto-generated DB row types.

## Verification

- `npx tsc --noEmit` — exits 0
- `npx jest` — 602 tests pass, 28 suites
- OAuth: `openAuthSessionAsync` appears 1× (was 3×), `access_token` extraction appears 1× (was 3×)
- Auth audit: all mutations use `getUser()`, all authenticated reads use `getSession()`
- Comment review: remaining comments all explain non-obvious behavior

## Requirements Advanced

- none — this slice is a pure code quality improvement with no requirement implications

## Requirements Validated

- none

## New Requirements Surfaced

- none

## Requirements Invalidated or Re-scoped

- none

## Deviations

- T02 removed unused imports (`supabase`, `uploadScanPhoto`) from `scan-upload.ts` — not in the original plan but discovered during the readability pass.
- T03 extended scope to include `units/api.ts` which wasn't in the task file list but had the same auth/error inconsistencies.
- T03: `as Type` casts were not removed since they're structurally necessary — documented as a pattern decision rather than treated as incomplete work.

## Known Limitations

- `as Type` casts on Supabase query results remain throughout API modules — these are structurally necessary due to the gap between generated DB row types (Json columns) and richer domain types. Removing them would require either loosening domain types or maintaining manual generic overrides.

## Follow-ups

- none

## Files Created/Modified

- `src/features/auth/social-auth.ts` — Extracted shared `handleOAuthRedirect` helper, simplified 3 provider functions to one-liners
- `src/features/units/api.ts` — Removed restating comments, switched to getSession() for reads, standardized error handling
- `src/features/units/types.ts` — Removed stale "TDD RED phase" comment
- `src/features/recipes/photos.ts` — Removed 7 obvious JSDoc/inline comments
- `src/features/recipes/search.ts` — Removed restating comments, kept RLS note
- `src/features/recipes/public.ts` — Condensed JSDoc to single-line summaries
- `src/features/recipes/api.ts` — Removed 3 restating inline comments
- `src/features/comments/api.ts` — Removed 6 restating comments, kept threading explanation
- `src/features/ratings/api.ts` — Switched getUserRating from getUser() to getSession()
- `src/features/scan/scan-service.ts` — Removed 7 obvious JSDoc comments, switched createMultiPhotoScanJob to getUser()
- `src/features/scan/scan-photos.ts` — Removed/condensed 15+ comments, kept platform-specific explanations
- `src/features/scan/scan-upload.ts` — Removed 6 obvious comments, removed unused imports
- `src/features/scan/types.ts` — Consolidated provenance comment, removed section divider
- `src/lib/scan/scan-draft-service.ts` — Removed 15+ obvious JSDoc/inline comments

## Forward Intelligence

### What the next slice should know
- The codebase is clean and consistent — all API modules follow the same auth (getUser/getSession) and error handling patterns. No cleanup needed before end-to-end verification.
- 602 tests pass with zero TypeScript errors. The codebase is in good shape for S05's full walkthrough.

### What's fragile
- `as Type` casts on Supabase query results — if domain types or DB schema drift, these casts silently mask mismatches. The generated types from S03 reduce this risk but don't eliminate it.

### Authoritative diagnostics
- `npx tsc --noEmit` and `npx jest` are the definitive health checks — both pass cleanly after all S04 changes.

### What assumptions changed
- Originally planned to remove `as Type` casts — they turned out to be structurally necessary. This is a known acceptable pattern, not technical debt.
