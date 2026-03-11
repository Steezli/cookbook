# S01: Multi-Recipe Scan

**Goal:** A single photo containing multiple recipes produces separate drafts for each; the edge function detects and splits recipes; unit tests prove parsing logic and the multi-draft data layer.
**Demo:** Send a multi-recipe photo → edge function returns N `ScanResult` items → N `scan_drafts` rows created with `draft_index` ordering → `getDraftsByJobId()` returns the full `ScanDraft[]` array. Single-recipe photos still work identically to before.

## Must-Haves

- Claude prompt requests a JSON array of recipes (`"recipes": [...]`) — always, even for a single recipe
- `parseScanResult` handles both legacy single-object and new array response formats gracefully
- Shared prompt builder extracted from duplicated `processWithClaude` / `processWithClaudeInline` functions
- `max_tokens` increased from 4096 to 8192
- `draft_index` column added to `scan_drafts` via migration (integer, default 0)
- Edge function loops the recipe array and inserts one `scan_drafts` row per recipe with sequential `draft_index`
- `getDraftsByJobId()` (plural) added to `ScanDraftService`, returns `ScanDraft[]` ordered by `draft_index`
- Existing `getDraftByJobId()` (singular) continues to work — returns first draft
- `DraftReview.tsx` is not broken by any change
- Prompt caps multi-recipe detection at 5 recipes per image
- Unit tests for multi-recipe parsing, single-recipe backward compat, and plural draft queries

## Proof Level

- This slice proves: contract
- Real runtime required: no (edge function logic tested via extracted pure functions; client layer tested with mocked Supabase)
- Human/UAT required: no (deferred to S05 full UAT — real multi-recipe photos tested there)

## Verification

- `npx jest src/lib/scan/__tests__/multi-recipe-parser.test.ts` — tests for `parseMultiScanResult`, `buildScanPrompt`, backward compat with legacy format
- `npx jest src/lib/scan/__tests__/scan-draft-service.test.ts` — existing tests still pass, plus new tests for `getDraftsByJobId`
- `npx jest` — full suite passes (297+ tests, zero failures)
- `npx tsc --noEmit` — zero TypeScript errors
- Migration file exists and is syntactically valid SQL

## Observability / Diagnostics

- Runtime signals: Edge function logs `Processing N recipe(s) for job ${jobId}` with recipe count; logs individual draft insertion success/failure per `draft_index`
- Inspection surfaces: `scan_drafts` table — query `SELECT id, job_id, draft_index, title, status FROM scan_drafts WHERE job_id = ?` to see all drafts for a job
- Failure visibility: If any individual draft insert fails, the error is logged with `jobId` and `draft_index` context before the job is marked failed; job `error_message` column captures the failure
- Redaction constraints: None (no secrets in scan data)

## Integration Closure

- Upstream surfaces consumed: existing `scan_drafts` table schema, existing `ScanDraftService` class, existing edge function structure
- New wiring introduced in this slice: edge function produces N drafts per job (array response → loop insert); `getDraftsByJobId()` exposes plural access; `draft_index` column enables stable ordering
- What remains before the milestone is truly usable end-to-end: S02 (multi-draft UI — review screen showing draft list with navigation), S05 (UAT with real multi-recipe photos)

## Tasks

- [x] **T01: Add draft_index migration and multi-recipe parser with tests** `est:1h`
  - Why: Creates the test-first foundation — `draft_index` column for ordering, extracted parsing functions testable outside Deno, and the test file with assertions that validate single + multi-recipe parsing
  - Files: `supabase/migrations/20260311000000_add_draft_index.sql`, `src/lib/scan/multi-recipe-parser.ts`, `src/lib/scan/__tests__/multi-recipe-parser.test.ts`
  - Do: (1) Write migration adding `draft_index INTEGER NOT NULL DEFAULT 0` to `scan_drafts`. (2) Extract `parseScanResult` into `multi-recipe-parser.ts` as `parseMultiScanResult(parsed: any): ScanResult[]` — handles both `{recipes: [...]}` array format and legacy single-object `{rawText, title, ...}` format (wraps in array). Also extract `buildScanPrompt(imageCount: number): string` that includes multi-recipe detection instructions and 5-recipe cap. (3) Write tests: multi-recipe array (2 recipes), single recipe in array wrapper, legacy single-object format, empty/malformed input, cap enforcement.
  - Verify: `npx jest src/lib/scan/__tests__/multi-recipe-parser.test.ts` passes; `npx tsc --noEmit` clean
  - Done when: All parser tests pass, migration file exists, TypeScript compiles

- [x] **T02: Update edge function to use shared prompt and produce N drafts** `est:1h`
  - Why: Wires the new parser and prompt into the actual edge function — the production code path that creates drafts. This is where multi-recipe scanning actually happens.
  - Files: `supabase/functions/process-scan-job/index.ts`
  - Do: (1) Import/inline the shared prompt builder and multi-recipe parser logic (edge function runs on Deno — can't import from `src/`, so copy the pure functions or inline them). (2) Replace the single-recipe prompt in both `processWithClaude` and `processWithClaudeInline` with `buildScanPrompt()`. (3) Change return type from `ScanResult` to `ScanResult[]` using `parseMultiScanResult`. (4) Increase `max_tokens` to 8192 in both functions. (5) Replace the single `scan_drafts` insert with a loop: iterate `results`, insert each with `draft_index: i`. (6) Add structured logging: `console.log(\`Detected ${results.length} recipe(s) for job ${jobId}\`)` and per-draft insert logging. (7) Update job completion — `draft_count` isn't a column, so just log the count.
  - Verify: `npx tsc --noEmit` clean (edge function is Deno but verify no TS import breakage in client code); manual review of diff for prompt correctness
  - Done when: Edge function uses shared prompt, returns array, inserts N drafts with `draft_index`, `max_tokens` is 8192

- [x] **T03: Add getDraftsByJobId to ScanDraftService with tests** `est:45m`
  - Why: Completes the S01→S02 boundary contract: `getDraftsByJobId(jobId)` returning `ScanDraft[]` ordered by `draft_index`. Also verifies backward compat of the existing singular method.
  - Files: `src/lib/scan/scan-draft-service.ts`, `src/lib/scan/__tests__/scan-draft-service.test.ts`
  - Do: (1) Add `getDraftsByJobId(jobId: string, userId: string): Promise<ScanDraft[]>` — queries `scan_drafts` where `job_id = jobId` and `user_id = userId`, ordered by `draft_index ASC`. No `.single()`. (2) Ensure existing `getDraftByJobId` still uses `.single()` and returns first draft — add `.order('draft_index', { ascending: true }).limit(1)` before `.single()` for deterministic results when multiple drafts exist. (3) Add `draft_index` to the `ScanDraft` interface (optional number, defaults to 0). (4) Add tests: `getDraftsByJobId` returns multiple drafts ordered by `draft_index`; returns empty array when no drafts; `getDraftByJobId` still returns single draft when multiple exist.
  - Verify: `npx jest src/lib/scan/__tests__/scan-draft-service.test.ts` passes (old + new tests); `npx jest` full suite passes; `npx tsc --noEmit` clean
  - Done when: `getDraftsByJobId` exists with tests, existing `getDraftByJobId` backward compatible, full test suite green, zero TS errors

## Files Likely Touched

- `supabase/migrations/20260311000000_add_draft_index.sql`
- `src/lib/scan/multi-recipe-parser.ts`
- `src/lib/scan/__tests__/multi-recipe-parser.test.ts`
- `supabase/functions/process-scan-job/index.ts`
- `src/lib/scan/scan-draft-service.ts`
- `src/lib/scan/__tests__/scan-draft-service.test.ts`
