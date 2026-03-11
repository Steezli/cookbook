# S01: Multi-Recipe Scan — UAT

**Milestone:** M002
**Written:** 2026-03-11

## UAT Type

- UAT mode: artifact-driven
- Why this mode is sufficient: S01 is a data-layer and parsing slice with no UI changes. All behavior is exercised through 50 Jest tests covering multi-recipe parsing, backward compatibility, prompt generation, and plural draft queries. Real-photo end-to-end testing and UI verification are deferred to S02 (multi-draft UI) and S05 (full UAT).

## Preconditions

- Node.js installed with project dependencies (`npm install` completed)
- No server or database required — all tests use mocks

## Smoke Test

Run `npx jest src/lib/scan/__tests__/multi-recipe-parser.test.ts` — all 30 tests pass, confirming multi-recipe parsing works for array format, legacy format, and edge cases.

## Test Cases

### 1. Multi-recipe array parsing

1. Call `parseMultiScanResult({ recipes: [recipe1, recipe2] })`
2. **Expected:** Returns `ScanResult[]` with 2 items, each containing parsed fields from the respective recipe object

### 2. Single recipe in array wrapper

1. Call `parseMultiScanResult({ recipes: [recipe1] })`
2. **Expected:** Returns `ScanResult[]` with 1 item — same behavior as multi-recipe but with a single entry

### 3. Legacy single-object backward compatibility

1. Call `parseMultiScanResult({ rawText: "...", title: "Cake", ingredients: [...] })`
2. **Expected:** Returns `ScanResult[]` with 1 item — legacy format detected via presence of `rawText`/`title`/`ingredients` keys, wrapped in array

### 4. Prompt includes multi-recipe instructions

1. Call `buildScanPrompt(1)` for single image
2. Call `buildScanPrompt(3)` for multi-image
3. **Expected:** Both prompts request `{ "recipes": [...] }` array format, include 5-recipe cap, and contain JSON schema. Multi-image prompt includes "multiple pages" language.

### 5. getDraftsByJobId returns ordered drafts

1. Mock Supabase to return 3 drafts with `draft_index` 0, 1, 2
2. Call `getDraftsByJobId(jobId, userId)`
3. **Expected:** Returns `ScanDraft[]` with 3 items ordered by `draftIndex`, each including the `draftIndex` field

### 6. getDraftByJobId singular backward compatibility

1. Mock Supabase with multiple drafts for a job
2. Call `getDraftByJobId(jobId, userId)`
3. **Expected:** Returns single `ScanDraft` (the first one by `draft_index`), using `order+limit+single` chain

### 7. Edge function produces N drafts (code review)

1. Read `supabase/functions/process-scan-job/index.ts`
2. **Expected:** `buildClaudePrompt` called in both process functions; `parseMultiScanResult` converts response to array; loop inserts each recipe as separate `scan_drafts` row with `draft_index: i`; `max_tokens` is 8192

## Edge Cases

### Malformed Claude response

1. Call `parseMultiScanResult(null)`, `parseMultiScanResult("string")`, `parseMultiScanResult({ random: "object" })`
2. **Expected:** Returns empty array `[]` for all — graceful degradation, no thrown errors

### Empty recipes array

1. Call `parseMultiScanResult({ recipes: [] })`
2. **Expected:** Returns empty array `[]`; edge function's empty-result guard would throw at runtime before inserting zero drafts

### Missing confidence field

1. Call `parseSingleRecipe({ title: "Cake" })` with no `confidence` field
2. **Expected:** Returns `ScanResult` with `confidence: 0.7` (safe default)

## Failure Signals

- Any test in `multi-recipe-parser.test.ts` or `scan-draft-service.test.ts` failing
- TypeScript compilation errors (`npx tsc --noEmit` produces output)
- Migration file missing or containing syntax errors
- `getDraftsByJobId` returning unsorted results or omitting `draftIndex`
- Edge function still using old single-recipe prompt or single-draft insert

## Requirements Proved By This UAT

- SCAN-MULTI (partial) — Parsing logic handles multi-recipe array and legacy formats; data layer supports plural draft storage and retrieval with ordering; edge function code produces N drafts per job. Contract-level proof only — no live runtime execution against Claude API or real database.

## Not Proven By This UAT

- Real multi-recipe photo detection accuracy (requires live Claude API call with actual cookbook page photos — deferred to S05)
- Multi-draft UI rendering and navigation (S02 scope)
- Database migration applied and working in a live Supabase instance (migration is syntactically valid but not applied)
- Edge function runtime behavior under Deno (tested only via code review and TypeScript compilation, not Deno execution)
- Performance of 8192 max_tokens responses from Claude API

## Notes for Tester

This slice is purely contract-verified. All assertions are in the test files — run `npx jest --no-coverage` to execute the full 334-test suite. The edge function changes are verified through code review and TypeScript compilation since they run on Deno (not Jest-testable). Real-photo testing should happen during S05 UAT with actual cookbook page scans.
