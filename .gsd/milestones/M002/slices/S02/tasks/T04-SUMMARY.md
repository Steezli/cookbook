---
id: T04
parent: S02
milestone: M002
provides:
  - "Save All as Recipes" batch action in DraftListView for high-confidence multi-draft jobs
  - Multi-draft count badge in RecentScans ("N recipes") for jobs with >1 draft
  - 3 additional edge-case tests for canSaveAll (19 total helper tests)
key_files:
  - src/features/scans/DraftListView.tsx
  - src/features/scan/RecentScans.tsx
  - src/lib/scan/__tests__/multi-draft-helpers.test.ts
key_decisions:
  - Sequential batch save (not parallel) to avoid overwhelming the API and to provide meaningful per-draft progress feedback
  - Partial failure continues remaining drafts — failures tracked by draft ID in local state, user informed with count and retry suggestion
  - RecentScans groups drafts by jobId using a Map<string, ScanDraft[]> instead of Map<string, ScanDraft> to count multi-draft jobs
  - Draft count badge uses blue pill style (#EFF6FF bg, #1D4ED8 text) to visually distinguish from status indicators
patterns_established:
  - Batch save pattern: iterate unsaved drafts sequentially, update progress state per iteration, accumulate failures, refresh full draft list after completion
  - Multi-draft grouping in RecentScans: getUserDrafts → group by jobId → attach count to ScanWithDraft type
observability_surfaces:
  - "console.log('[DraftList] Batch save: saving draft ${i+1} of ${total}') for each draft during batch save"
  - "console.error('[DraftList] Batch save failed for draft ${draftId}:', error) on individual failures"
  - Batch failure count visible in UI — shows how many drafts failed and suggests retry
duration: 15m
verification_result: passed
completed_at: 2026-03-11
blocker_discovered: false
---

# T04: Add "Save All" batch action and update RecentScans

**Added "Save All as Recipes" batch action to DraftListView and multi-draft count badges to RecentScans, completing the multi-draft UX slice.**

## What Happened

Implemented the two remaining features for the multi-draft UX:

1. **Batch Save in DraftListView**: Added a "Save All as Recipes" button that appears when `canSaveAll(drafts)` returns true (≥2 drafts, all confidence ≥0.65, at least one unsaved). On press, iterates through unsaved drafts sequentially calling `convertToRecipe()` for each with default conversion options from the draft's recipe data. Shows "Saving N of M..." progress text. If any individual save fails, logs the error, records the draft ID as failed, and continues with remaining drafts. After all attempts, refreshes the draft list. Failure count displayed to user. Button disabled during batch save and styled with `accentGreen` background.

2. **RecentScans Multi-Draft Awareness**: Changed the draft grouping from `Map<string, ScanDraft>` (one draft per job, last wins) to `Map<string, ScanDraft[]>` (all drafts grouped by jobId). Extended `ScanWithDraft` type with optional `draftCount` field. For jobs with >1 draft, renders a blue "N recipes" badge pill next to the job title.

3. **Additional Tests**: Added 3 edge-case tests to `multi-draft-helpers.test.ts`: partial batch save state (some saved, some not), just-below-threshold confidence (0.64), and single-draft-with-high-confidence rejection. Total: 19 helper tests.

## Verification

- `npx jest src/lib/scan/__tests__/multi-draft-helpers.test.ts` — 19 tests passing
- `npx jest` — 353 tests passing (18 suites), zero failures
- `npx tsc --noEmit` — zero TypeScript errors

### Slice-Level Verification Status (Final Task)
- ✅ `npx jest src/lib/scan/__tests__/multi-draft-helpers.test.ts` — 19 tests pass
- ✅ `npx jest` — 353 tests pass, zero failures
- ✅ `npx tsc --noEmit` — zero TypeScript errors
- ⬜ Browser verification — requires running dev server with multi-draft test data

## Diagnostics

- Check batch save progress: look for `[DraftList] Batch save: saving draft N of M` in console during batch save
- Check batch save failures: look for `[DraftList] Batch save failed for draft <id>:` errors with full error context
- After batch save, inspect draft statuses via `getDraftsByJobId()` — successful drafts have `status: 'ready'`, failed ones retain previous status
- RecentScans multi-draft badge: visible when `draftCount > 1` on any job card

## Deviations

None — implementation follows the task plan.

## Known Issues

None.

## Files Created/Modified

- `src/features/scans/DraftListView.tsx` — Added batch save state, `handleSaveAll` handler, "Save All as Recipes" button with progress text, failure notice, imported `canSaveAll`
- `src/features/scan/RecentScans.tsx` — Changed draft grouping to `Map<string, ScanDraft[]>`, added `draftCount` to `ScanWithDraft` type, added blue "N recipes" badge for multi-draft jobs
- `src/lib/scan/__tests__/multi-draft-helpers.test.ts` — Added 3 edge-case tests: partial batch save, below-threshold confidence, single-draft rejection
