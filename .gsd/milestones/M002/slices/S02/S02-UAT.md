# S02: Multi-Draft UX — UAT

**Milestone:** M002
**Written:** 2026-03-11

## UAT Type

- UAT mode: artifact-driven
- Why this mode is sufficient: S02's UI components are verified through unit tests (19 helper tests), full test suite (353 passing), TypeScript compilation (zero errors), and browser verification of route screen loading states. Full live-runtime UAT with real multi-recipe photos is deferred to S05 where it can exercise the complete end-to-end flow (photo → edge function → multiple drafts → review each → save). The integration logic is contract-verified against S01's boundary.

## Preconditions

- All 353 tests pass (`npx jest`)
- Zero TypeScript errors (`npx tsc --noEmit`)
- S01 complete (multi-draft data layer with getDraftsByJobId returning ScanDraft[])

## Smoke Test

Navigate to `/scan/draft/{jobId}` — the route screen loads without errors and shows either "Loading drafts..." (while fetching) or the appropriate single-draft / multi-draft view based on the job's draft count.

## Test Cases

### 1. Single-draft job renders DraftReview directly

1. Navigate to `/scan/draft/{singleDraftJobId}` where the job has exactly 1 draft
2. **Expected:** DraftReview renders immediately — no draft list, no "1 of 1" UI. Existing single-draft behavior unchanged.

### 2. Multi-draft job renders DraftListView with draft cards

1. Navigate to `/scan/draft/{multiDraftJobId}` where the job has ≥2 drafts
2. **Expected:** Shared photo section at top, progress bar ("0 of N recipes saved"), draft card list with title, confidence badge, and status badge for each draft.

### 3. Select and review a draft from the list

1. From the multi-draft list view, tap a draft card
2. **Expected:** DraftReview renders inline (below list on mobile, in detail panel on tablet/web) showing the selected draft's recipe content. Other draft cards remain visible.

### 4. Save a draft as a recipe from the multi-draft list

1. From the multi-draft list, select a draft and save it as a recipe via DraftEditor
2. **Expected:** Draft list refreshes, saved draft shows "saved" status badge, progress bar updates (e.g., "1 of 3 recipes saved"). User stays on the draft list — not navigated away.

### 5. Batch save all high-confidence drafts

1. Navigate to a multi-draft job where all drafts have confidence ≥ 0.65 and at least one is unsaved
2. Tap "Save All as Recipes"
3. **Expected:** Button shows "Saving N of M..." progress. After completion, all drafts show "saved" status. Progress bar shows "N of N recipes saved — All done!".

### 6. RecentScans shows draft count badge

1. Navigate to the scan history / recent scans view
2. **Expected:** Multi-draft jobs show a blue "N recipes" badge next to the job title. Single-draft jobs show no badge.

## Edge Cases

### Processing job (0 drafts initially)

1. Navigate to `/scan/draft/{processingJobId}` where the job is still processing
2. **Expected:** Route screen shows "Processing your scan..." with activity indicator. When processing completes, view transitions to single-draft or multi-draft display.

### Batch save partial failure

1. Trigger a batch save where one draft fails to convert (e.g., network error mid-batch)
2. **Expected:** Remaining drafts continue saving. After completion, UI shows "N draft(s) failed to save" notice. Successfully saved drafts show "saved" status.

### Empty draft list (error state)

1. Navigate to a job ID that returns an error from getDraftsByJobId
2. **Expected:** Error message displayed in UI. No crash, no blank screen.

## Failure Signals

- Route screen shows blank/white screen instead of loading state or draft list
- Single-draft job shows a "list of 1" instead of rendering DraftReview directly
- Draft cards missing title, confidence badge, or status badge
- Saving a draft in multi-draft view navigates away from the draft list
- "Save All" button appears when drafts have low confidence (< 0.65) or all are already saved
- Progress bar doesn't update after saving a draft
- Console errors on any draft review navigation
- TypeScript compilation errors
- Test failures in helper or full suites

## Requirements Proved By This UAT

- SCAN-MULTI (UI layer) — This UAT proves the multi-draft review, edit, save, and batch-save UI works when backed by multi-draft data from S01. The draft list renders, individual drafts are reviewable and saveable, progress tracks correctly, and single-draft jobs bypass the list.

## Not Proven By This UAT

- SCAN-MULTI (end-to-end) — Full photo → edge function → multiple drafts → review → save with a real multi-recipe cookbook page photo. Deferred to S05 UAT.
- Multi-draft detection reliability — Whether Claude consistently splits ambiguous multi-recipe photos correctly. This is an S01/edge-function concern tested separately.
- Visual design fidelity — Whether DraftListView matches cookbook.pen designs at all breakpoints. Deferred to S05 visual QA.

## Notes for Tester

- The multi-draft UI requires real multi-draft job data in the database. To test without a real scan, insert 2+ `scan_drafts` rows for a single `scan_jobs` row with sequential `draft_index` values.
- Browser verification during S02 development was limited to loading/error states due to requiring authenticated sessions with seeded data. S05 should exercise the full interactive flow.
- The "Save All" button only appears when `canSaveAll()` returns true: ≥2 drafts, all confidence ≥ 0.65, at least one unsaved.
