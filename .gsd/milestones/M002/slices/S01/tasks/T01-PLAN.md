---
estimated_steps: 5
estimated_files: 3
---

# T01: Add draft_index migration and multi-recipe parser with tests

**Slice:** S01 — Multi-Recipe Scan
**Milestone:** M002

## Description

Create the foundational pieces for multi-recipe scanning: a database migration adding `draft_index` to `scan_drafts`, a pure TypeScript module with the multi-recipe parsing and prompt-building logic extracted from the edge function, and a comprehensive test suite proving both single-recipe backward compatibility and multi-recipe array handling.

The parser module (`multi-recipe-parser.ts`) lives in `src/lib/scan/` and contains pure functions with no Deno or Supabase dependencies — making them testable in the standard Jest/Node environment. The edge function (T02) will inline these functions since it can't import from `src/`.

## Steps

1. Write `supabase/migrations/20260311000000_add_draft_index.sql` — `ALTER TABLE scan_drafts ADD COLUMN draft_index INTEGER NOT NULL DEFAULT 0;` with a comment explaining the column's purpose for multi-recipe support.
2. Create `src/lib/scan/multi-recipe-parser.ts` with:
   - `ScanResult` interface (same shape as edge function's current interface, exported for reuse)
   - `parseMultiScanResult(parsed: any): ScanResult[]` — if input has `recipes` array key, parse each element; if input is legacy single-object format (`rawText`, `title`, etc.), wrap it as a single-element array. Handle malformed/empty input gracefully (return empty array or throw descriptive error).
   - `parseSingleRecipe(parsed: any): ScanResult` — extracted from the existing `parseScanResult` logic in the edge function
   - `buildScanPrompt(imageCount: number): string` — builds the prompt text with multi-recipe detection instructions, 5-recipe cap, and JSON array response schema (`{ "recipes": [...] }`)
3. Write `src/lib/scan/__tests__/multi-recipe-parser.test.ts` with test cases:
   - Multi-recipe: input `{ recipes: [{rawText, title, ...}, {rawText, title, ...}] }` → returns `ScanResult[]` with length 2, both fully parsed
   - Single recipe in array wrapper: `{ recipes: [{...}] }` → returns `ScanResult[]` with length 1
   - Legacy single-object format: `{ rawText, title, ingredients, ... }` → returns `ScanResult[]` with length 1 (backward compat)
   - Malformed input: missing fields, null values, empty arrays → graceful handling (defaults, not crashes)
   - Confidence defaults: missing `confidence` field → defaults to 0.7
   - `buildScanPrompt(1)` → contains "single" or "photo" language, NOT "multiple pages"
   - `buildScanPrompt(3)` → contains multi-image language
   - Both prompts contain "recipes" array schema and 5-recipe cap instruction
4. Run `npx jest src/lib/scan/__tests__/multi-recipe-parser.test.ts` and iterate until all tests pass.
5. Run `npx tsc --noEmit` to verify TypeScript compilation is clean.

## Must-Haves

- [ ] Migration adds `draft_index INTEGER NOT NULL DEFAULT 0` to `scan_drafts`
- [ ] `parseMultiScanResult` handles both array and legacy single-object formats
- [ ] `buildScanPrompt` includes multi-recipe detection guidance and 5-recipe cap
- [ ] All parser tests pass
- [ ] TypeScript compiles cleanly

## Verification

- `npx jest src/lib/scan/__tests__/multi-recipe-parser.test.ts` — all tests pass
- `npx tsc --noEmit` — zero errors
- `cat supabase/migrations/20260311000000_add_draft_index.sql` — valid SQL

## Observability Impact

- Signals added/changed: None (pure functions, no runtime signals)
- How a future agent inspects this: Read `multi-recipe-parser.ts` exports; run the test file
- Failure state exposed: Parser returns empty array for truly unparseable input; throws descriptive errors for structural issues

## Inputs

- `supabase/functions/process-scan-job/index.ts` — existing `parseScanResult` function logic (lines 442-464) to extract and generalize
- `supabase/migrations/20260204030000_phase3_scan_system.sql` — existing `scan_drafts` table definition to understand current columns

## Expected Output

- `supabase/migrations/20260311000000_add_draft_index.sql` — migration file adding `draft_index` column
- `src/lib/scan/multi-recipe-parser.ts` — exported `ScanResult` interface, `parseMultiScanResult()`, `parseSingleRecipe()`, `buildScanPrompt()`
- `src/lib/scan/__tests__/multi-recipe-parser.test.ts` — comprehensive test suite for all parser paths
