---
id: T02
parent: S04
milestone: M005
provides:
  - Cleaned up restating/obvious comments across 12 source files, net -254 lines
key_files:
  - src/features/units/api.ts
  - src/features/recipes/photos.ts
  - src/features/recipes/search.ts
  - src/features/scan/scan-service.ts
  - src/features/scan/scan-photos.ts
  - src/features/scan/scan-upload.ts
  - src/lib/scan/scan-draft-service.ts
  - src/features/comments/api.ts
  - src/features/recipes/public.ts
  - src/features/recipes/api.ts
  - src/features/scan/types.ts
  - src/features/units/types.ts
key_decisions:
  - Kept comments that explain WHY (RLS behavior, iOS 0-byte bug, inline retry semantics, error code meanings) — removed comments that restate WHAT the code does
  - Replaced multi-line JSDoc that only restated the function name with either nothing or a one-line comment adding real context
  - Removed stale "TDD RED phase" comment from units/types.ts
  - Removed unused imports (supabase, uploadScanPhoto) from scan-upload.ts discovered during readability pass
patterns_established:
  - Comment standard: only retain comments that explain non-obvious behavior, edge cases, business logic, or platform-specific workarounds
observability_surfaces:
  - none
duration: 20m
verification_result: passed
completed_at: 2026-03-14
blocker_discovered: false
---

# T02: Clean up comments and improve readability

**Removed ~254 lines of restating/obvious comments across 12 files while preserving all comments that explain non-obvious behavior.**

## What Happened

Audited all `src/features/*/api.ts`, `src/features/*/types.ts`, and `src/lib/**/*.ts` files for comment quality. The codebase had many JSDoc comments that simply restated the function name (e.g., `/** Get a scan draft by ID */` above `getDraft(draftId)`) and inline comments that described what the next line obviously does (e.g., `// Get current user` above `supabase.auth.getUser()`).

Removed these noise comments while carefully preserving every comment that explains:
- WHY something is done (RLS behavior, iOS 0-byte Storage bug, non-retryable inline jobs)
- Edge cases and error handling (unique constraint 23505, HEIC→JPEG Claude compatibility)
- Non-obvious behavior (backfill fire-and-forget semantics, placeholder URL replacement)
- Platform-specific workarounds (native vs web upload paths)

Also cleaned up inconsistent formatting: removed extra blank lines, consolidated redundant section divider comments, and removed unused imports discovered during the pass (`supabase` and `uploadScanPhoto` in scan-upload.ts).

## Verification

- `npx tsc --noEmit` — exits 0
- `npx jest` — 602 tests pass, 28 suites
- Code review: remaining comments all explain non-obvious behavior, edge cases, or platform-specific workarounds

## Diagnostics

None — pure cleanup with no new runtime surfaces.

## Deviations

- Removed unused imports (`supabase`, `uploadScanPhoto`) from `scan-upload.ts` — not in the original plan but discovered during the readability pass and clearly beneficial.

## Known Issues

None.

## Files Created/Modified

- `src/features/units/api.ts` — Removed 5 restating inline comments, consolidated error handling
- `src/features/units/types.ts` — Removed stale "TDD RED phase" comment
- `src/features/recipes/photos.ts` — Removed 7 obvious JSDoc/inline comments
- `src/features/recipes/search.ts` — Removed restating inline/JSDoc comments, kept RLS note
- `src/features/recipes/public.ts` — Condensed JSDoc to single-line summaries with actual content
- `src/features/recipes/api.ts` — Removed 3 restating inline comments
- `src/features/comments/api.ts` — Removed 6 restating inline comments, kept threading explanation
- `src/features/scan/scan-service.ts` — Removed 7 obvious JSDoc comments, fixed extra blank lines
- `src/features/scan/scan-photos.ts` — Removed/condensed 15+ comments, kept platform-specific explanations
- `src/features/scan/scan-upload.ts` — Removed 6 obvious comments, removed unused imports
- `src/features/scan/types.ts` — Consolidated provenance comment, removed section divider
- `src/lib/scan/scan-draft-service.ts` — Removed 15+ obvious JSDoc/inline comments across the class
