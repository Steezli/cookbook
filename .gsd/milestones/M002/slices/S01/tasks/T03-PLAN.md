---
estimated_steps: 5
estimated_files: 2
---

# T03: Add getDraftsByJobId to ScanDraftService with tests

**Slice:** S01 — Multi-Recipe Scan
**Milestone:** M002

## Description

Complete the S01→S02 boundary contract by adding `getDraftsByJobId()` (plural) to `ScanDraftService`. This method returns `ScanDraft[]` ordered by `draft_index`, enabling S02's multi-draft UI to display all drafts for a job. The existing `getDraftByJobId()` (singular) is updated for deterministic behavior when multiple drafts exist (adds `order` + `limit` before `.single()`). The `ScanDraft` interface gains an optional `draft_index` field.

This task also runs the full test suite to confirm nothing is broken across all 297+ tests.

## Steps

1. Update the `ScanDraft` interface in `src/lib/scan/scan-draft-service.ts`: add `draftIndex?: number` field. Update the internal mapping function to map `draft_index` from DB records to `draftIndex` in the TypeScript interface.
2. Add `getDraftsByJobId(jobId: string, userId: string): Promise<ScanDraft[]>` method to `ScanDraftService`: query `scan_drafts` where `job_id = jobId` and `user_id = userId`, ordered by `draft_index ASC`. Returns full array (no `.single()`). Maps each DB record to `ScanDraft` using existing mapping logic.
3. Update existing `getDraftByJobId()` for deterministic multi-draft behavior: add `.order('draft_index', { ascending: true }).limit(1)` before the `.single()` call, so it always returns the first draft (index 0) when multiple drafts exist for a job.
4. Add tests to `src/lib/scan/__tests__/scan-draft-service.test.ts`:
   - `getDraftsByJobId` returns multiple drafts ordered by `draft_index`
   - `getDraftsByJobId` returns empty array when no drafts exist
   - `getDraftsByJobId` includes `draftIndex` in returned objects
   - `getDraftByJobId` (singular) still returns single draft (backward compat)
   - `getDraftByJobId` (singular) works correctly when multiple drafts exist (returns first)
5. Run full test suite: `npx jest` — all tests pass (297+ existing + new). Run `npx tsc --noEmit` — zero TypeScript errors.

## Must-Haves

- [ ] `getDraftsByJobId()` method exists and returns `ScanDraft[]` ordered by `draft_index`
- [ ] `getDraftByJobId()` (singular) still works — returns first draft deterministically
- [ ] `ScanDraft` interface includes optional `draftIndex` field
- [ ] New tests cover plural query, empty result, and backward compat
- [ ] Full test suite passes (297+ tests)
- [ ] Zero TypeScript errors

## Verification

- `npx jest src/lib/scan/__tests__/scan-draft-service.test.ts` — all old + new tests pass
- `npx jest` — full suite green (297+ tests, 0 failures)
- `npx tsc --noEmit` — zero errors
- `grep 'getDraftsByJobId' src/lib/scan/scan-draft-service.ts` — method exists

## Observability Impact

- Signals added/changed: None (client-side query method, no new runtime signals)
- How a future agent inspects this: Call `getDraftsByJobId(jobId, userId)` to see all drafts for a job; check `draftIndex` field for ordering
- Failure state exposed: Returns empty array (not null/error) when no drafts exist — callers can distinguish "no drafts" from error

## Inputs

- `src/lib/scan/scan-draft-service.ts` — current service with `getDraftByJobId()` singular method
- `src/lib/scan/__tests__/scan-draft-service.test.ts` — existing test file with mock patterns to follow
- T01 output — `ScanResult` interface for reference; T02 output — edge function now inserts with `draft_index`

## Expected Output

- `src/lib/scan/scan-draft-service.ts` — updated with `getDraftsByJobId()`, `draftIndex` in interface, deterministic singular method
- `src/lib/scan/__tests__/scan-draft-service.test.ts` — extended with multi-draft query tests
