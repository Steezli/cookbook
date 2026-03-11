---
id: S01
parent: M002
milestone: M002
provides:
  - "Edge function detects and splits multiple recipes from a single photo into separate scan_drafts rows"
  - "parseMultiScanResult() handles array and legacy single-object Claude response formats"
  - "buildScanPrompt() with multi-recipe detection instructions and 5-recipe cap"
  - "draft_index column on scan_drafts for stable ordering within a job"
  - "getDraftsByJobId(jobId, userId) → ScanDraft[] ordered by draft_index (S01→S02 boundary contract)"
  - "getDraftByJobId() deterministic with order+limit when multiple drafts exist"
  - "mapRecordToDraft() consolidating all DB→TS mapping in ScanDraftService"
  - "max_tokens increased from 4096 to 8192 for multi-recipe responses"
requires: []
affects:
  - S02
key_files:
  - supabase/migrations/20260311000000_add_draft_index.sql
  - src/lib/scan/multi-recipe-parser.ts
  - src/lib/scan/__tests__/multi-recipe-parser.test.ts
  - supabase/functions/process-scan-job/index.ts
  - src/lib/scan/scan-draft-service.ts
  - src/lib/scan/__tests__/scan-draft-service.test.ts
key_decisions:
  - "Single-pass multi-recipe detection — one Claude call with array-always prompt, not a two-pass detect-then-extract"
  - "Array-always response schema — { recipes: [...] } even for single recipes; eliminates parser branching"
  - "Inlined pure functions in Deno edge function — canonical source in src/lib/scan/, copy in edge function; T01 tests validate canonical"
  - "Parser returns empty array for unrecognised input — graceful degradation over thrown errors"
  - "Extracted mapRecordToDraft() private helper — 6 mapping sites consolidated; draftIndex included everywhere automatically"
patterns_established:
  - "Pure parser modules in src/lib/scan/ with no Deno/Supabase deps — testable in Jest, inlined into edge function"
  - "Safe defaults pattern for Claude responses: missing confidence → 0.7, missing strings → empty, missing arrays → undefined"
  - "DB→TS mapping consolidated in private helper; new fields added in one place"
observability_surfaces:
  - "Edge function logs: `Detected N recipe(s) for job ${jobId}` — recipe count per job"
  - "Edge function logs: `Inserted draft N/M for job ${jobId}` — per-draft insert confirmation"
  - "Edge function error logs include jobId and draft_index context on insert failure"
  - "Database: `SELECT id, job_id, draft_index, title, status FROM scan_drafts WHERE job_id = ?` shows all drafts for a job"
  - "getDraftsByJobId() returns empty array (not null/error) when no drafts — callers can distinguish no-drafts from error"
drill_down_paths:
  - .gsd/milestones/M002/slices/S01/tasks/T01-SUMMARY.md
  - .gsd/milestones/M002/slices/S01/tasks/T02-SUMMARY.md
  - .gsd/milestones/M002/slices/S01/tasks/T03-SUMMARY.md
duration: 40m
verification_result: passed
completed_at: 2026-03-11
---

# S01: Multi-Recipe Scan

**Edge function detects and splits multiple recipes from a single photo into separate scan_drafts rows with draft_index ordering, backed by 50 tests proving parsing, data layer, and backward compatibility.**

## What Happened

Built the complete multi-recipe scan data layer in three tasks:

**T01 — Parser foundation.** Created `src/lib/scan/multi-recipe-parser.ts` with four exports: `ScanResult`/`Ingredient` interfaces, `parseSingleRecipe()` extracted from the edge function's existing parser, `parseMultiScanResult()` handling both `{ recipes: [...] }` array format and legacy single-object format, and `buildScanPrompt()` generating the Claude prompt with multi-recipe detection instructions and a 5-recipe cap. Wrote the `draft_index` migration adding the column with a composite index. 30 tests cover all parsing paths.

**T02 — Edge function wiring.** Inlined the prompt builder and parser into the Deno edge function (can't import from `src/`). Replaced duplicated inline prompts in both `processWithClaude` and `processWithClaudeInline` with the shared `buildClaudePrompt()`. Changed return type to `ScanResult[]` and replaced the single draft insert with a loop inserting N drafts with sequential `draft_index`. Increased `max_tokens` to 8192. Added structured logging for recipe count and per-draft insert status. Added an empty-result guard.

**T03 — Plural data access.** Added `getDraftsByJobId(jobId, userId)` returning `ScanDraft[]` ordered by `draft_index` — the S01→S02 boundary contract. Updated singular `getDraftByJobId()` with `order+limit` for deterministic results when multiple drafts exist. Added `draftIndex` to the `ScanDraft` interface. Extracted `mapRecordToDraft()` private helper consolidating 6 duplicate mapping blocks. 7 new tests.

## Verification

- `npx jest src/lib/scan/__tests__/multi-recipe-parser.test.ts` — **30/30 pass**
- `npx jest src/lib/scan/__tests__/scan-draft-service.test.ts` — **20/20 pass** (13 existing + 7 new)
- `npx jest` — **334/334 pass**, 17 suites, 0 failures
- `npx tsc --noEmit` — **zero TypeScript errors**
- Migration file `20260311000000_add_draft_index.sql` exists with valid SQL

## Requirements Advanced

- SCAN-MULTI — Edge function now produces N drafts from a single multi-recipe photo; parser and data layer tested with 50 tests. Full end-to-end proof (real photo → UI) deferred to S02 (multi-draft UI) and S05 (UAT).

## Requirements Validated

- None newly validated by this slice (SCAN-MULTI needs S02 UI + S05 UAT to fully validate)

## New Requirements Surfaced

- SCAN-MULTI — Multi-recipe scan: a photo containing 2+ recipes produces separate drafts for each, with edge function detection/splitting and unit-tested parsing logic. (New requirement — was referenced in M002 roadmap as `SCAN-MULTI (new)` but not yet in REQUIREMENTS.md.)

## Requirements Invalidated or Re-scoped

- None

## Deviations

- T02 changed success response payload from `{ draftId: 'created' }` to `{ draftCount: results.length }` — no client consumed the old field.
- T02 added empty-result guard (not in plan) — prevents silent no-op when Claude returns unrecognised JSON.
- T03 extracted `mapRecordToDraft()` private helper (not in plan) — natural refactor when adding `draftIndex` to all 6 mapping sites.

## Known Limitations

- Edge function inlines copies of parser/prompt functions from `src/lib/scan/multi-recipe-parser.ts` — the two copies must be kept in sync manually. T01's tests validate the canonical source only.
- No UI for reviewing multiple drafts yet — that's S02's scope.
- No real-photo end-to-end testing — deferred to S05 UAT.
- Multi-recipe detection reliability depends on Claude's vision capability — prompt includes guidance for recipe boundary detection, but accuracy with ambiguous pages is untested.

## Follow-ups

- S02 must consume `getDraftsByJobId()` to build the multi-draft review UI.
- S05 should test with real multi-recipe cookbook page photos to validate detection accuracy.
- Consider a sync mechanism or code generation step to keep the edge function's inlined parser in sync with the canonical source.

## Files Created/Modified

- `supabase/migrations/20260311000000_add_draft_index.sql` — migration adding `draft_index INTEGER NOT NULL DEFAULT 0` with composite index
- `src/lib/scan/multi-recipe-parser.ts` — pure parser module: ScanResult types, multi/single parsing, prompt builder
- `src/lib/scan/__tests__/multi-recipe-parser.test.ts` — 30-test suite for all parsing and prompt paths
- `supabase/functions/process-scan-job/index.ts` — edge function with shared prompt, array parsing, N-draft loop insert, 8192 max_tokens
- `src/lib/scan/scan-draft-service.ts` — added getDraftsByJobId(), draftIndex field, mapRecordToDraft() helper, deterministic singular method
- `src/lib/scan/__tests__/scan-draft-service.test.ts` — 7 new tests for plural query and backward compat

## Forward Intelligence

### What the next slice should know
- `getDraftsByJobId(jobId, userId)` is the entry point — returns `ScanDraft[]` ordered by `draftIndex`. Empty array means no drafts (not an error).
- The existing `getDraftByJobId()` (singular) still works and returns the first draft — S02 can use either method depending on UX needs.
- `DraftReview.tsx` was intentionally not modified — S02 owns the UI changes.

### What's fragile
- The inlined parser in `supabase/functions/process-scan-job/index.ts` is a manual copy of `src/lib/scan/multi-recipe-parser.ts` — if one changes, the other must be updated manually. The test suite only validates the canonical source.

### Authoritative diagnostics
- `npx jest src/lib/scan/__tests__/multi-recipe-parser.test.ts` — validates all parsing behavior including edge cases
- `npx jest src/lib/scan/__tests__/scan-draft-service.test.ts` — validates the data access layer including plural queries
- Database: `SELECT id, job_id, draft_index, title, status FROM scan_drafts WHERE job_id = ?` shows all drafts for a job

### What assumptions changed
- No assumptions changed — execution matched the plan closely. The only additions were defensive improvements (empty-result guard, mapRecordToDraft helper).
