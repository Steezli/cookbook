# S01: Multi-Recipe Scan — Research

**Date:** 2026-03-11

## Summary

The current scan pipeline (`process-scan-job` edge function) sends one or more photos to Claude's vision API and always produces **exactly one `ScanResult` / one `scan_drafts` row per job**. The prompt explicitly says "combine them into a single complete recipe." All downstream code — client-side `ScanDraftService`, `DraftReview`, `DraftEditor`, the route `app/scan/draft/[id].tsx` — assumes a 1:1 job→draft relationship (`.single()` queries, no draft index concept).

To support multi-recipe scanning (one photo containing 2+ recipes → N drafts), the work is concentrated in three layers: **prompt + response schema** (edge function), **database schema** (new `draft_index` column, migration from `.single()` to plural queries), and **client data layer** (new `getDraftsByJobId` returning `ScanDraft[]`). The UI layer (draft list, review navigation) is explicitly deferred to **S02: Multi-Draft UX** per the roadmap boundary map.

The highest risk is prompt reliability — Claude must consistently detect recipe boundaries and return a JSON array of recipes. This needs validation with real multi-recipe images and robust fallback behavior when Claude returns a single recipe for a multi-recipe page.

## Recommendation

**Two-pass prompt strategy with array response schema:**

1. Change the Claude prompt to always return a JSON array of recipes (`"recipes": [...]`), even for single-recipe images (array of length 1). This makes the response schema uniform and avoids branching logic.
2. Add a detection hint in the prompt: "If this image contains multiple distinct recipes, return each as a separate object in the recipes array."
3. Increase `max_tokens` from 4096 to 8192 to accommodate multi-recipe responses.
4. In the edge function, iterate the array and insert one `scan_drafts` row per recipe, with a `draft_index` column for ordering.
5. On the client, add `getDraftsByJobId` (plural) alongside the existing singular method. The existing `getDraftByJobId` should remain for backward compatibility and return the first draft.

**Why not a separate detection pass?** An extra Claude API call doubles cost and latency. Claude's vision model is capable of identifying recipe boundaries and structuring output accordingly in a single pass. If detection proves unreliable, a two-pass approach (detect count first, then extract each) can be added later.

## Don't Hand-Roll

| Problem | Existing Solution | Why Use It |
|---------|------------------|------------|
| JSON response parsing from Claude | Existing `parseScanResult()` in edge function | Extend to handle array; reuse per-recipe parsing logic |
| Confidence scoring per draft | Existing field confidence calculation in edge function | Apply independently to each recipe in the array |
| Database migration | Supabase migrations directory | Follow existing `supabase/migrations/` pattern with sequential timestamps |

## Existing Code and Patterns

- `supabase/functions/process-scan-job/index.ts` — **Primary change target.** Contains `processWithClaude()`, `processWithClaudeInline()`, and `parseScanResult()`. Currently returns a single `ScanResult`. Must be updated to return `ScanResult[]` and loop draft insertion. Both `processWithClaude` and `processWithClaudeInline` share the same prompt structure — DRY opportunity to extract a shared prompt builder.
- `src/lib/scan/scan-draft-service.ts` — `getDraftByJobId()` uses `.single()` (line 174). Need new `getDraftsByJobId()` returning `ScanDraft[]`. The existing method should remain (returns first/only draft) for backward compat with `DraftReview.tsx` until S02 updates the UI.
- `src/features/scans/DraftReview.tsx` — Currently takes `draftId` prop (which is actually a `jobId` — see line 177 where it calls `getDraftByJobId`). S01 must not break this; the existing flow should still work for single-recipe results. S02 will add multi-draft navigation.
- `src/features/scan/scan-service.ts` — `createMultiPhotoScanJob()` already supports multi-photo jobs. No changes needed for S01.
- `src/features/scan/scan-photos.ts` — Upload pipeline already supports multi-photo. No changes needed for S01.
- `supabase/migrations/20260204030000_phase3_scan_system.sql` — Original `scan_drafts` table. Has `job_id` FK to `scan_jobs`. No unique constraint on `job_id`, so multiple drafts per job are already allowed at the DB level.
- `supabase/migrations/20260204040000_phase3_scan_drafts_enhancement.sql` — Added `structured_data`, `field_confidence`, `ocr_confidence` columns. Also added `scan_job_id` column (redundant with `job_id` — investigate which is canonical).
- `jest.config.js` — ts-jest with node environment, `@/` path alias. Tests run in ~5.6s, 297 passing.

## Constraints

- **Deno runtime** — Edge function runs on Deno; no npm packages, only URL imports from `esm.sh` and `deno.land/std`
- **Claude API `max_tokens`** — Currently 4096. Multi-recipe responses (2-3 recipes) could exceed this. Must increase to 8192.
- **`scan_drafts` schema has two job FK columns** — `job_id` (original, used by client code) and `scan_job_id` (added in enhancement migration). Client code exclusively uses `job_id`. New code should use `job_id` for consistency.
- **No unique constraint on `scan_drafts.job_id`** — This is actually helpful: the schema already supports 1:N job→draft without migration changes to constraints.
- **Edge function is invoked fire-and-forget** — `scan-photos.ts` calls `supabase.functions.invoke('process-scan-job', ...)` without awaiting the result. Status is communicated via Supabase Realtime subscriptions on `scan_jobs` table updates. This pattern remains unchanged.
- **Existing tests use mocked Supabase** — All 16 test suites (297 tests) pass. New tests for multi-recipe parsing should follow the same mock pattern from `src/lib/scan/__tests__/scan-draft-service.test.ts`.

## Common Pitfalls

- **Claude returning inconsistent JSON structure** — If the prompt asks for an array but Claude returns a single object (no array wrapper), the parser will crash. Must handle both `{recipes: [...]}` and `{rawText, title, ...}` (legacy single-recipe format) gracefully, wrapping the latter in an array.
- **Prompt duplication** — `processWithClaude` and `processWithClaudeInline` have nearly identical prompts. Changing one without the other will cause inconsistent behavior. Extract shared prompt construction.
- **`scan_job_id` vs `job_id` confusion** — Enhancement migration added `scan_job_id` but all client code uses `job_id`. The `draft_index` column should be added alongside `job_id`. Ignore `scan_job_id`.
- **Breaking `DraftReview` with plural queries** — `DraftReview.tsx` calls `getDraftByJobId` and expects a single draft. If this method is changed to return an array, the component will break. Keep the singular method, add a separate plural method.
- **`max_tokens` undercount** — A typical single recipe response is ~800-1200 tokens. Two recipes ~1600-2400. Three recipes ~2400-3600. 4096 is tight for 3+ recipes with raw text. 8192 provides safe headroom.

## Open Risks

- **Multi-recipe detection accuracy** — Claude may fail to split recipes on ambiguous pages (e.g., a recipe with a variation listed below it). Need test fixtures with known multi-recipe images to validate. Mitigation: include explicit detection guidance in the prompt ("separate recipes have their own title, ingredient list, and instructions") and allow user correction in S02.
- **Response size for pages with many recipes** — A cookbook index page might have 5+ recipes. The prompt should cap at a reasonable number (e.g., max 5 recipes per image) to avoid token exhaustion and extreme processing times.
- **Backward compatibility of JSON schema change** — Changing from single-object to array response means both the edge function parser AND any future consumers must handle the new shape. The `parseScanResult` function needs a `parseMultiScanResult` sibling or wrapper.
- **Draft ordering** — When multiple drafts are created from one job, the UI (S02) needs a stable sort order. The `draft_index` column (0-based integer) serves this purpose. Must be set during insertion in the edge function.

## Skills Discovered

| Technology | Skill | Status |
|------------|-------|--------|
| Supabase | `supabase/agent-skills@supabase-postgres-best-practices` (31.8K installs) | available — `npx skills add supabase/agent-skills@supabase-postgres-best-practices` |
| Expo | `expo/skills@building-native-ui` (16.6K installs) | available — not directly relevant to S01 (backend-focused slice) |

## Sources

- Edge function source: `supabase/functions/process-scan-job/index.ts` — current prompt, parsing, and draft insertion logic
- Draft service: `src/lib/scan/scan-draft-service.ts` — client-side draft CRUD with `.single()` queries
- DB schema: `supabase/migrations/20260204030000_phase3_scan_system.sql` — `scan_drafts` table definition (no unique constraint on `job_id`)
- Claude API docs (Context7) — `max_tokens` controls output ceiling; JSON schema output available for structured responses
- Roadmap boundary map: S01 produces `getDraftsByJobId()` returning `ScanDraft[]` with `draft_index` ordering; S02 consumes it for UI
