---
estimated_steps: 4
estimated_files: 2
---

# T01: Extract multi-draft helper logic and write tests

**Slice:** S02 — Multi-Draft UX
**Milestone:** M002

## Description

Create the pure logic layer for multi-draft list behavior. These helpers will be consumed by `DraftListView` in T03 and `RecentScans` in T04 for progress tracking, save-all eligibility, and draft display status. By building and testing this first, we establish a clear contract that the UI components can rely on.

## Steps

1. Create `src/lib/scan/multi-draft-helpers.ts` with three exported functions:
   - `getDraftProgress(drafts: ScanDraft[])` → `{ saved: number, total: number, allSaved: boolean }` — a draft is "saved" when its status is `'ready'` (which is the status set after `convertToRecipe` in `DraftManager`)
   - `canSaveAll(drafts: ScanDraft[])` → `boolean` — true when there are ≥2 drafts AND all have `overallConfidence.score >= 0.65` AND at least one draft has not been saved yet
   - `getDraftDisplayStatus(draft: ScanDraft)` → `'pending' | 'saved' | 'needs_review'` — maps the internal `draft.status` to a display-friendly label (ready → saved, needs_review → needs_review, enhanced → pending)
2. Create `src/lib/scan/__tests__/multi-draft-helpers.test.ts` with tests covering:
   - `getDraftProgress`: empty array, single unsaved draft, single saved draft, 3 drafts with 1 saved, all saved
   - `canSaveAll`: 1 draft (false), 2 high-confidence unsaved (true), 2 drafts but one low confidence (false), 2 drafts but all already saved (false), 3 drafts mixed confidence with one below threshold (false)
   - `getDraftDisplayStatus`: each status variant maps correctly
3. Run tests and confirm all pass.
4. Run `npx tsc --noEmit` to ensure type correctness.

## Must-Haves

- [ ] `getDraftProgress()` correctly counts saved vs total drafts
- [ ] `canSaveAll()` returns false for single drafts and low-confidence drafts
- [ ] `getDraftDisplayStatus()` maps all three status values
- [ ] ≥12 tests covering edge cases
- [ ] Zero TypeScript errors

## Verification

- `npx jest src/lib/scan/__tests__/multi-draft-helpers.test.ts` — all tests pass
- `npx tsc --noEmit` — zero errors

## Observability Impact

- None — pure functions with no runtime side effects

## Inputs

- `ScanDraft` interface from `src/lib/scan/scan-draft-service.ts` — the `status` and `overallConfidence` fields drive all helper logic
- S01 summary: draft status is set to `'ready'` after `convertToRecipe()` (not deleted)

## Expected Output

- `src/lib/scan/multi-draft-helpers.ts` — 3 exported pure functions
- `src/lib/scan/__tests__/multi-draft-helpers.test.ts` — ≥12 passing tests
