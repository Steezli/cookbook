---
id: T01
parent: S01
milestone: M002
provides:
  - draft_index column migration for multi-recipe ordering
  - parseMultiScanResult() — handles array and legacy single-object formats
  - parseSingleRecipe() — extracted from edge function's parseScanResult
  - buildScanPrompt() — multi-recipe-aware prompt with 5-recipe cap and array schema
  - ScanResult and Ingredient TypeScript interfaces
key_files:
  - supabase/migrations/20260311000000_add_draft_index.sql
  - src/lib/scan/multi-recipe-parser.ts
  - src/lib/scan/__tests__/multi-recipe-parser.test.ts
key_decisions:
  - Parser returns empty array (not throws) for null/undefined/unrecognised input shapes — graceful degradation over noisy failures
  - Legacy format detection uses presence of rawText, title, or ingredients keys — minimal check that covers all realistic Claude responses
  - Prompt always requests { "recipes": [...] } array format even for single recipes — simplifies parsing path
patterns_established:
  - Pure parser modules in src/lib/scan/ with no Deno/Supabase deps — edge function inlines the logic since it can't import from src/
  - Safe defaults pattern: missing confidence → 0.7, missing string fields → empty string, missing arrays → undefined
observability_surfaces:
  - none (pure functions — no runtime signals)
duration: 15m
verification_result: passed
completed_at: 2026-03-11
blocker_discovered: false
---

# T01: Add draft_index migration and multi-recipe parser with tests

**Created migration adding `draft_index` to `scan_drafts`, extracted multi-recipe parser with array/legacy format handling, and 30-test suite covering all parsing paths and prompt generation.**

## What Happened

1. Wrote migration `20260311000000_add_draft_index.sql` — adds `draft_index INTEGER NOT NULL DEFAULT 0` to `scan_drafts` with a composite index on `(job_id, draft_index)` for efficient ordered retrieval.

2. Created `src/lib/scan/multi-recipe-parser.ts` with four exports:
   - `ScanResult` / `Ingredient` interfaces matching the edge function's existing shape
   - `parseSingleRecipe(parsed)` — extracted and generalized from the edge function's `parseScanResult`, with safe defaults for all missing fields
   - `parseMultiScanResult(parsed)` — detects `{ recipes: [...] }` array format or legacy single-object format, returns `ScanResult[]`
   - `buildScanPrompt(imageCount)` — generates the Claude prompt with multi-recipe detection instructions, 5-recipe cap, and `{ "recipes": [...] }` JSON schema

3. Wrote 30 tests in `multi-recipe-parser.test.ts` covering:
   - Full recipe parsing with all fields
   - Confidence defaults (missing → 0.7, non-number → 0.7)
   - Null/undefined/empty object graceful handling
   - Ingredient field coercion and defaults
   - Multi-recipe array format (2 recipes)
   - Single recipe in array wrapper
   - Legacy single-object backward compatibility
   - Various malformed inputs (null, undefined, string, number, empty array, unrecognised shape)
   - Legacy format detection via rawText, title, or ingredients keys
   - Prompt content: photo language for single image, "multiple pages" for multi-image, image count reference, recipes array schema, 5-recipe cap, always-wrap instruction, JSON schema fields

## Verification

- `npx jest src/lib/scan/__tests__/multi-recipe-parser.test.ts` — **30/30 tests pass**
- `npx tsc --noEmit` — **zero errors**
- `npx jest src/lib/scan/__tests__/scan-draft-service.test.ts` — **13/13 existing tests still pass** (no regressions)
- Migration file is syntactically valid SQL

### Slice-level checks status (T01 is task 1 of 3):
- ✅ `multi-recipe-parser.test.ts` — all pass
- ✅ `scan-draft-service.test.ts` — existing tests pass (new plural tests are T03 scope)
- ⏳ Full `npx jest` suite — not run this task (no changes to existing code)
- ✅ `npx tsc --noEmit` — zero errors
- ✅ Migration file exists and is valid SQL

## Diagnostics

Pure functions with no runtime — inspect by reading `multi-recipe-parser.ts` exports or running the test file.

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `supabase/migrations/20260311000000_add_draft_index.sql` — migration adding `draft_index` column with composite index
- `src/lib/scan/multi-recipe-parser.ts` — pure parser module with ScanResult types, multi/single parsing, and prompt builder
- `src/lib/scan/__tests__/multi-recipe-parser.test.ts` — 30-test suite covering all parsing and prompt paths
