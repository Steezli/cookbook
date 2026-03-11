---
id: T03
parent: S01
milestone: M002
provides:
  - "getDraftsByJobId(jobId, userId) → ScanDraft[] ordered by draft_index"
  - "ScanDraft.draftIndex optional field mapping draft_index from DB"
  - "getDraftByJobId() deterministic with order+limit when multiple drafts exist"
  - "mapRecordToDraft() private helper consolidating all DB→TS mapping"
key_files:
  - src/lib/scan/scan-draft-service.ts
  - src/lib/scan/__tests__/scan-draft-service.test.ts
key_decisions:
  - "Extracted mapRecordToDraft() private helper — all 6 mapping sites now use one function, reducing drift risk and adding draftIndex everywhere automatically"
  - "draftIndex uses nullish coalescing (record.draft_index ?? undefined) — pre-migration rows with null draft_index map to undefined, not 0"
patterns_established:
  - "DB→TS record mapping consolidated in private helper; new fields added in one place"
observability_surfaces:
  - "none — client-side query method, no new runtime signals"
duration: 15m
verification_result: passed
completed_at: 2026-03-11
blocker_discovered: false
---

# T03: Add getDraftsByJobId to ScanDraftService with tests

**Added plural `getDraftsByJobId()` returning `ScanDraft[]` ordered by `draft_index`, made singular `getDraftByJobId()` deterministic with `order+limit`, added `draftIndex` to interface, and consolidated all DB mapping into a private helper.**

## What Happened

Added the S01→S02 boundary contract method `getDraftsByJobId(jobId, userId)` that returns all drafts for a job ordered by `draft_index ASC`. This enables S02's multi-draft UI to display all drafts from a single scan.

Updated the existing singular `getDraftByJobId()` to add `.order('draft_index', { ascending: true }).limit(1)` before `.single()` — this ensures deterministic behavior when multiple drafts exist (always returns draft_index 0).

Added `draftIndex?: number` to the `ScanDraft` interface and extracted `mapRecordToDraft()` as a private helper to consolidate the 6 duplicate DB→TypeScript mapping blocks into one. All mapping sites (createDraft, getDraft, getDraftByJobId, getDraftsByJobId, getUserDrafts, getDraftsByStatus) now use the helper, which automatically includes `draftIndex`.

Added 7 new tests covering: plural query returning multiple ordered drafts, empty result, draftIndex presence, null data handling, database error propagation, singular backward compat, and order+limit chain verification.

## Verification

- `npx jest src/lib/scan/__tests__/scan-draft-service.test.ts` — **20 tests passed** (13 existing + 7 new)
- `npx jest` — **334 tests passed**, 17 suites, 0 failures
- `npx tsc --noEmit` — zero TypeScript errors
- `grep 'getDraftsByJobId' src/lib/scan/scan-draft-service.ts` — method exists

### Slice-level verification (all pass — this is the final task):
- `npx jest src/lib/scan/__tests__/multi-recipe-parser.test.ts` — ✅ 30 tests pass
- `npx jest src/lib/scan/__tests__/scan-draft-service.test.ts` — ✅ 20 tests pass
- `npx jest` — ✅ 334 tests pass (0 failures)
- `npx tsc --noEmit` — ✅ zero errors
- Migration file exists — ✅ `supabase/migrations/20260311000000_add_draft_index.sql`

## Diagnostics

Call `getDraftsByJobId(jobId, userId)` to see all drafts for a job; check `draftIndex` field for ordering. Returns empty array (not null/error) when no drafts exist — callers can distinguish "no drafts" from error.

## Deviations

Extracted `mapRecordToDraft()` private helper to consolidate 6 duplicate mapping blocks — not in the task plan but a natural refactor when adding `draftIndex` to all mapping sites. Reduces risk of mapping drift.

## Known Issues

None.

## Files Created/Modified

- `src/lib/scan/scan-draft-service.ts` — Added `draftIndex` to `ScanDraft` interface, `mapRecordToDraft()` helper, `getDraftsByJobId()` method, updated `getDraftByJobId()` with order+limit
- `src/lib/scan/__tests__/scan-draft-service.test.ts` — Added 7 tests for plural query and deterministic singular behavior, updated existing tests for new chain shape
