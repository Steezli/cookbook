---
id: T02
parent: S01
milestone: M002
provides:
  - Edge function uses shared multi-recipe prompt (buildClaudePrompt) — no duplication
  - Edge function returns ScanResult[] and inserts N drafts with sequential draft_index
  - max_tokens increased to 8192 for both Claude API call paths
  - Inlined parseMultiScanResult handles array and legacy single-object formats
  - Structured logging with recipe count and per-draft insert confirmation
key_files:
  - supabase/functions/process-scan-job/index.ts
key_decisions:
  - Inlined both buildClaudePrompt and parseMultiScanResult directly in edge function (mirrors src/lib/scan/multi-recipe-parser.ts) since Deno edge functions can't import from src/
  - Changed success response from { draftId: 'created' } to { draftCount: N } — no client code consumed the old draftId field
  - Added guard for empty parse results (results.length === 0 throws error) — prevents silent no-op when Claude returns unrecognised JSON
  - Draft insert failure includes draft_index context in error message for debuggability
patterns_established:
  - Edge function inlines pure logic from src/lib/scan/ — keep both copies in sync manually; T01 tests validate the canonical source
observability_surfaces:
  - console.log(`Detected ${results.length} recipe(s) for job ${jobId}`) — recipe count per job
  - console.log(`Inserted draft ${i + 1}/${results.length} for job ${jobId}`) — per-draft insert confirmation
  - console.error with draft_index context on insert failure
  - Inspectable via `supabase functions logs process-scan-job` or scan_drafts table query
duration: 10m
verification_result: passed
completed_at: 2026-03-11
blocker_discovered: false
---

# T02: Update edge function to use shared prompt and produce N drafts

**Wired multi-recipe prompt, array parsing, and loop insertion into the production edge function so it detects and splits multiple recipes from a single photo into separate scan_drafts rows with draft_index ordering.**

## What Happened

1. **Inlined shared prompt builder** — added `buildClaudePrompt(imageCount)` function in the edge function, mirroring the logic from `src/lib/scan/multi-recipe-parser.ts`. Both `processWithClaude` and `processWithClaudeInline` now call this single function instead of having duplicated inline prompt strings. The prompt requests `{ "recipes": [...] }` array format, includes multi-recipe detection guidance, and caps at 5 recipes.

2. **Inlined multi-recipe parser** — added `parseSingleRecipe(parsed)` and `parseMultiScanResult(parsed)` functions, replacing the old `parseScanResult`. Handles both the new `{ recipes: [...] }` array format and legacy single-object `{ rawText, title, ... }` format. Return type of both process functions changed from `Promise<ScanResult>` to `Promise<ScanResult[]>`.

3. **Increased max_tokens** — changed from 4096 to 8192 in both Claude API calls to accommodate multi-recipe responses.

4. **Replaced single draft insert with loop** — the handler now iterates `results` array, computing field confidence and draft status per recipe independently, and inserts each as a separate `scan_drafts` row with `draft_index: i`. Single-recipe images produce exactly one draft with `draft_index: 0`.

5. **Added structured logging** — `Detected N recipe(s) for job ${jobId}` before the loop, `Inserted draft ${i + 1}/${N} for job ${jobId}` after each insert, and error logging with `draft_index` context on insert failure.

6. **Added empty-result guard** — if `parseMultiScanResult` returns an empty array, the function throws an error rather than silently completing with zero drafts.

## Verification

- `grep -c 'max_tokens.*8192'` — returns **2** (both API call sites) ✅
- `grep 'draft_index'` — present in insert block with loop ✅
- `grep 'buildClaudePrompt'` — 3 occurrences (definition + 2 call sites) ✅
- `npx tsc --noEmit` — **zero errors** ✅
- `npx jest src/lib/scan/__tests__/multi-recipe-parser.test.ts` — **30/30 pass** ✅
- `npx jest src/lib/scan/__tests__/scan-draft-service.test.ts` — **13/13 pass** ✅
- Manual diff review: prompt is correct, loop logic is sound, no dead code paths, single-recipe backward compat preserved ✅

### Slice-level checks status (T02 is task 2 of 3):
- ✅ `multi-recipe-parser.test.ts` — 30/30 pass
- ✅ `scan-draft-service.test.ts` — 13/13 existing tests pass (new plural tests are T03 scope)
- ⏳ Full `npx jest` suite — not run this task (only edge function changed, not importable by tests)
- ✅ `npx tsc --noEmit` — zero errors
- ✅ Migration file exists and is valid SQL

## Diagnostics

- **Runtime inspection:** `supabase functions logs process-scan-job` shows recipe count per job and per-draft insert status
- **Database inspection:** `SELECT id, job_id, draft_index, title, status FROM scan_drafts WHERE job_id = ?` shows all drafts for a job
- **Failure state:** Insert failures logged with `jobId` and `draft_index` context; job status set to `failed` with `error_message` capturing which draft failed

## Deviations

- Changed success response payload from `{ draftId: 'created' }` to `{ draftCount: results.length }` — more useful signal, no client code consumed the old field.
- Added empty-result guard (not in plan) — prevents silent no-op when Claude returns unrecognised JSON shape.

## Known Issues

- The inlined functions in the edge function must be kept in sync with `src/lib/scan/multi-recipe-parser.ts` manually. T01's test suite validates the canonical source; the edge function copy is intentionally separate due to the Deno import constraint.

## Files Created/Modified

- `supabase/functions/process-scan-job/index.ts` — updated edge function with shared prompt builder, array parsing, loop insertion with draft_index, increased max_tokens, and structured logging
