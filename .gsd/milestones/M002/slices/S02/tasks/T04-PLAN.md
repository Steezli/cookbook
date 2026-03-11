---
estimated_steps: 5
estimated_files: 4
---

# T04: Add "Save All" batch action and update RecentScans

**Slice:** S02 — Multi-Draft UX
**Milestone:** M002

## Description

Complete the multi-draft UX with two remaining features: (1) a "Save All as Recipes" batch action in DraftListView for high-confidence multi-draft jobs, and (2) update RecentScans to show draft count badges for multi-draft jobs. Run full verification to close the slice.

## Steps

1. **Implement "Save All as Recipes" in `DraftListView.tsx`:**
   - Show a "Save All as Recipes" button when `canSaveAll(drafts)` returns true (≥2 drafts, all confidence ≥0.65, at least one unsaved).
   - On press: iterate through unsaved drafts sequentially, call `scanDraftService.convertToRecipe()` for each with default conversion options (title from `draft.recipe.title`, ingredients/instructions from draft). Show a saving state with per-draft progress ("Saving 2 of 3...").
   - If any individual save fails: log the error, mark that draft as failed in local state, continue with remaining drafts. After all attempts, refresh the draft list via `getDraftsByJobId()`.
   - After batch save completes: update progress display. If all saved, show success state.
   - Style the button with `accentGreen` background when enabled, disabled state when `canSaveAll` is false or batch save is in progress.

2. **Update `src/features/scan/RecentScans.tsx`:**
   - Currently calls `getUserDrafts()` and maps one draft per job. Change to call `getDraftsByJobId()` for each completed job (or batch-fetch via `getUserDrafts` and group by `jobId`).
   - For multi-draft jobs (>1 draft for same jobId), show a badge like "2 recipes" next to the job title.
   - Show the first draft's title as before, but append the count if multiple.
   - Use the existing `draftsByJobId` Map but count entries per jobId.

3. **Add helper tests if gaps discovered:**
   - Review test coverage for `multi-draft-helpers.ts`. Add any tests for edge cases discovered during implementation (e.g., `canSaveAll` with mixed saved/unsaved drafts after partial batch save).

4. **Run full test suite:** `npx jest` — all tests pass (existing + new).

5. **Run `npx tsc --noEmit`** — zero TypeScript errors. Browser verification: multi-draft job with high confidence → "Save All" visible → click → all drafts saved → progress 100%. RecentScans shows draft count for multi-draft jobs.

## Must-Haves

- [ ] "Save All as Recipes" button appears when canSaveAll() is true
- [ ] Batch save processes drafts sequentially with per-draft progress
- [ ] Partial failure doesn't block remaining drafts
- [ ] RecentScans shows draft count for multi-draft jobs
- [ ] All tests pass (existing + new)
- [ ] Zero TypeScript errors

## Verification

- `npx jest` — full suite passes
- `npx tsc --noEmit` — zero errors
- Browser: "Save All" works for multi-draft high-confidence job; RecentScans shows multi-draft badge

## Observability Impact

- Signals added/changed: `console.log('[DraftList] Batch save: saving draft ${i+1} of ${total}')` for each draft during batch save; `console.error('[DraftList] Batch save failed for draft ${draftId}:', error)` on individual failures
- How a future agent inspects this: Check draft statuses after batch save via `getDraftsByJobId()` — all successful drafts have status `'ready'`; failed ones retain their previous status
- Failure state exposed: Batch save errors are logged per-draft with draft ID context; UI shows which specific drafts failed

## Inputs

- `src/features/scans/DraftListView.tsx` — T03's component, where Save All button will be added
- `src/lib/scan/multi-draft-helpers.ts` — T01's `canSaveAll()` function
- `src/features/scan/RecentScans.tsx` — existing component to add multi-draft awareness
- `src/lib/scan/scan-draft-service.ts` — `convertToRecipe()`, `getDraftsByJobId()`

## Expected Output

- `src/features/scans/DraftListView.tsx` — updated with batch save action
- `src/features/scan/RecentScans.tsx` — updated with multi-draft count display
- `src/lib/scan/__tests__/multi-draft-helpers.test.ts` — any additional edge case tests
