---
estimated_steps: 5
estimated_files: 1
---

# T02: Update edge function to use shared prompt and produce N drafts

**Slice:** S01 — Multi-Recipe Scan
**Milestone:** M002

## Description

Wire the multi-recipe prompt and parser into the actual Supabase edge function (`process-scan-job`). Since edge functions run on Deno and can't import from `src/`, the pure functions from `multi-recipe-parser.ts` must be inlined into the edge function. The key changes: replace the single-recipe prompt with the multi-recipe-aware prompt, change response parsing to produce `ScanResult[]`, increase `max_tokens` to 8192, and replace the single `scan_drafts` insert with a loop that inserts one draft per recipe with `draft_index`.

This is the core production change — after this task, the edge function actually produces multiple drafts from a multi-recipe image.

## Steps

1. Extract the shared prompt builder into the edge function: inline `buildScanPrompt` logic (from T01's `multi-recipe-parser.ts`) directly in the edge function. The prompt must ask Claude to return `{ "recipes": [...] }` array format, include multi-recipe detection guidance ("If this image contains multiple distinct recipes, each with their own title, ingredient list, and instructions, return each as a separate object"), and include the 5-recipe cap.
2. Replace the duplicated prompt construction in `processWithClaude` and `processWithClaudeInline`: extract a shared function `buildClaudePrompt(imageCount: number): string` within the edge function file. Both `processWithClaude` and `processWithClaudeInline` call this instead of having inline prompt strings. Change `max_tokens` from 4096 to 8192 in both functions.
3. Inline `parseMultiScanResult` logic: add a `parseMultiScanResult(parsed: any): ScanResult[]` function in the edge function that handles both `{ recipes: [...] }` and legacy single-object format. Change return type of both `processWithClaude` and `processWithClaudeInline` from `Promise<ScanResult>` to `Promise<ScanResult[]>`.
4. Replace the single draft insert block (lines ~107-162) with a loop: iterate the `ScanResult[]` array, compute field confidence and draft status per recipe, and insert each as a separate `scan_drafts` row with `draft_index: i`. Add structured logging: `console.log(\`Detected ${results.length} recipe(s) for job ${jobId}\`)` before the loop, and `console.log(\`Inserted draft ${i + 1}/${results.length} for job ${jobId}\`)` after each insert.
5. Verify: review the full diff to ensure no logic paths were broken; check that single-recipe images (the common case) still produce exactly one draft with `draft_index: 0`; run `npx tsc --noEmit` to verify no client-side TypeScript breakage.

## Must-Haves

- [ ] Both `processWithClaude` and `processWithClaudeInline` use a shared prompt builder (no duplication)
- [ ] Prompt asks for `{ "recipes": [...] }` array format with multi-recipe detection guidance
- [ ] `max_tokens` increased to 8192 in both Claude API calls
- [ ] `parseMultiScanResult` handles both array and legacy formats
- [ ] Draft insertion loops over results, each row gets sequential `draft_index`
- [ ] Structured logging includes recipe count and per-draft insert confirmation
- [ ] Single-recipe images still produce exactly one draft with `draft_index: 0`

## Verification

- Manual diff review of `supabase/functions/process-scan-job/index.ts` — prompt is correct, loop logic is sound, no dead code paths
- `npx tsc --noEmit` — no client-side TypeScript errors introduced
- `grep -c 'max_tokens.*8192' supabase/functions/process-scan-job/index.ts` — returns 2 (both API call sites)
- `grep 'draft_index' supabase/functions/process-scan-job/index.ts` — present in insert block

## Observability Impact

- Signals added/changed: `console.log(\`Detected N recipe(s) for job ${jobId}\`)` — structured recipe count per job; per-draft insert logging with `draft_index`
- How a future agent inspects this: Supabase Edge Function logs (accessible via `supabase functions logs process-scan-job`); `scan_drafts` table query with `job_id` filter
- Failure state exposed: If any individual draft insert fails, error is logged with `jobId` and `draft_index` context; job status set to `failed` with `error_message` capturing which draft failed

## Inputs

- `supabase/functions/process-scan-job/index.ts` — current edge function (516 lines)
- `src/lib/scan/multi-recipe-parser.ts` — T01's pure functions to inline into the edge function
- S01-RESEARCH.md — prompt strategy, `max_tokens` rationale, `draft_index` insertion pattern

## Expected Output

- `supabase/functions/process-scan-job/index.ts` — updated edge function with shared prompt, array parsing, loop insertion, increased `max_tokens`, structured logging
