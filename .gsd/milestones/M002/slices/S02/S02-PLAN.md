# S02: Multi-Draft UX

**Goal:** When a scan job produces multiple drafts, the draft review screen shows all of them and lets the user review, edit, and save each as an independent recipe.
**Demo:** Navigate to `/scan/draft/{jobId}` for a multi-draft job → see a draft list with titles and confidence badges → tap a draft → review it in the existing DraftReview layout → save it as a recipe → return to the list and see it marked as saved → single-draft jobs bypass the list and render DraftReview directly.

## Must-Haves

- Multi-draft list view showing all drafts for a job with title, confidence, and saved status
- Single-draft jobs render DraftReview directly (no "list of 1" flash)
- Each draft independently reviewable via existing DraftReview component
- Each draft independently editable via existing DraftEditor component
- Each draft independently saveable as a recipe via existing DraftManager
- Progress indicator ("2 of 3 recipes saved") on the draft list
- "Save All as Recipes" batch action for high-confidence multi-draft jobs
- Shared photo display at job level (not duplicated per draft)
- DraftReview and DraftEditor refactored to accept a `ScanDraft` object directly (eliminating the `draftId`-as-jobId confusion)
- RecentScans shows draft count for multi-draft jobs
- Multi-draft awareness uses `getDraftsByJobId()` (not singular) so all drafts are discovered at once

## Proof Level

- This slice proves: integration
- Real runtime required: yes (browser verification against running dev server)
- Human/UAT required: no (S05 UAT covers real-photo end-to-end)

## Verification

- `npx jest src/lib/scan/__tests__/multi-draft-helpers.test.ts` — unit tests for draft list helper logic (grouping, progress calculation, "save all" eligibility)
- `npx jest` — full test suite passes (existing 334 + new tests), zero failures
- `npx tsc --noEmit` — zero TypeScript errors
- Browser verification: navigate to draft review for a multi-draft job, confirm list renders with correct draft count, switch between drafts, verify single-draft job bypasses list

## Observability / Diagnostics

- Runtime signals: `console.log` with `[DraftList] Loaded N drafts for job ${jobId}` when multi-draft list mounts — distinguishes multi-draft from single-draft path at a glance
- Inspection surfaces: `getDraftsByJobId(jobId, userId)` returns the full draft array; the UI derives all list state from this array. Database: `SELECT id, job_id, draft_index, title, status FROM scan_drafts WHERE job_id = ?` shows draft state.
- Failure visibility: Draft list shows error state with message when `getDraftsByJobId` fails. Individual draft loading failures surface through existing DraftReview error UI.
- Redaction constraints: none (no secrets in draft data)

## Integration Closure

- Upstream surfaces consumed: `scanDraftService.getDraftsByJobId(jobId, userId)` (S01 boundary contract), `scanDraftService.convertToRecipe()`, `getJobPhotos()`, `subscribeToJob()`
- New wiring introduced in this slice: Route screen `app/scan/draft/[id].tsx` orchestrates multi-draft detection → list view or single-draft passthrough → per-draft review/edit/save. New `DraftListView` component composes existing `DraftReview`/`DraftEditor`/`DraftManager`.
- What remains before the milestone is truly usable end-to-end: S03 (SEO), S04 (ads/GDPR), S05 (UAT with real photos, full polish)

## Tasks

- [x] **T01: Extract multi-draft helper logic and write failing tests** `est:30m`
  - Why: Establish the testable logic layer for draft list behavior — progress calculation, save-all eligibility, draft status derivation — before building UI. Tests define the contract.
  - Files: `src/lib/scan/multi-draft-helpers.ts`, `src/lib/scan/__tests__/multi-draft-helpers.test.ts`
  - Do: Create a pure helper module with: `getDraftProgress(drafts)` → `{saved, total, allSaved}`, `canSaveAll(drafts)` → boolean (true when ≥2 drafts and all have confidence ≥0.65 and none already saved), `getDraftDisplayStatus(draft)` → `'pending' | 'saved' | 'needs_review'`. Write tests covering: 0 drafts, 1 draft, multiple drafts with mixed statuses, all-saved state, save-all eligibility edge cases. Tests should pass immediately since they test pure functions written in the same task.
  - Verify: `npx jest src/lib/scan/__tests__/multi-draft-helpers.test.ts` — all tests pass
  - Done when: Helper module exists with exported functions and ≥12 tests passing

- [x] **T02: Refactor DraftReview and DraftEditor to accept a ScanDraft object** `est:40m`
  - Why: Both components currently accept `draftId` (actually a jobId) and fetch internally. For multi-draft, each component must operate on a specific draft passed from the parent. This refactor is prerequisite to the list UI.
  - Files: `src/features/scans/DraftReview.tsx`, `src/features/scans/DraftEditor.tsx`, `app/scan/draft/[id].tsx`
  - Do: Add an optional `draft` prop to DraftReview — when provided, skip the internal fetch/subscribe cycle and use the passed object directly. Keep `draftId` prop as fallback for backward compat (the route screen can still pass jobId for single-draft). Same pattern for DraftEditor: add optional `draft` prop that bypasses `getDraftByJobId`. Update the route screen to maintain backward compat (it still passes `id` as before). Rename internal variable references from `draftId` to `jobId` where they mean job ID for clarity. Ensure DraftEditor passes the correct `draft.id` (not jobId) to `DraftManager` and `scanDraftService.updateDraftRecipe`.
  - Verify: `npx tsc --noEmit` — zero errors. Browser: navigate to an existing single-draft job at `/scan/draft/{jobId}` — existing behavior unchanged.
  - Done when: Both components accept an optional `ScanDraft` prop, TypeScript compiles, and single-draft flow still works.

- [x] **T03: Build DraftListView component and wire into route screen** `est:50m`
  - Why: This is the core deliverable — the multi-draft list UI that shows all drafts for a job and lets the user select, review, edit, and save each one.
  - Files: `src/features/scans/DraftListView.tsx`, `app/scan/draft/[id].tsx`
  - Do: Create `DraftListView` component that: (1) Calls `getDraftsByJobId()` on mount with subscription/polling fallback for in-progress jobs. (2) Shows shared photo section at the top using `getJobPhotos()`. (3) Renders a draft card list with title, confidence badge, draft status (pending/saved), and tap-to-select. (4) Shows progress bar: "N of M recipes saved". (5) Includes "Save All as Recipes" button when `canSaveAll()` is true. (6) On draft tap, shows `DraftReview` (or `DraftEditor` if editing) inline below the list with the selected `ScanDraft` passed as prop. (7) When a draft is saved as recipe, refresh the drafts list and update progress. (8) Uses design tokens for all styling, responsive via `useBreakpoint()`. Update `app/scan/draft/[id].tsx`: call `getDraftsByJobId()` first — if 1 draft, render existing single-draft flow; if ≥2, render `DraftListView`.
  - Verify: `npx tsc --noEmit`. Browser: navigate to a multi-draft job → list of drafts visible → tap a draft → DraftReview renders → save it → progress updates. Navigate to single-draft job → DraftReview renders directly.
  - Done when: Multi-draft list renders, individual drafts reviewable/saveable, single-draft bypass works, TypeScript compiles.

- [x] **T04: Add "Save All" batch action and update RecentScans** `est:30m`
  - Why: Completes the multi-draft UX with batch save convenience and makes multi-draft jobs visible in the scan history.
  - Files: `src/features/scans/DraftListView.tsx`, `src/features/scan/RecentScans.tsx`, `src/lib/scan/__tests__/multi-draft-helpers.test.ts`
  - Do: (1) Implement "Save All as Recipes" in DraftListView: iterate through unsaved drafts, call `convertToRecipe()` for each sequentially, update progress after each, show error state if any individual save fails (continue with remaining). (2) Update `RecentScans` to call `getDraftsByJobId()` for completed jobs and show "N recipes detected" badge when draft count > 1. (3) Add any additional helper tests discovered during implementation (e.g., batch save error scenarios). (4) Run full test suite to confirm no regressions.
  - Verify: `npx jest` — full suite passes. `npx tsc --noEmit` — zero errors. Browser: multi-draft job with high-confidence drafts shows "Save All" button → clicking it saves all drafts sequentially → progress reaches 100%. RecentScans shows draft count for multi-draft jobs.
  - Done when: Batch save works, RecentScans shows multi-draft info, all tests pass, zero TS errors.

## Files Likely Touched

- `src/lib/scan/multi-draft-helpers.ts`
- `src/lib/scan/__tests__/multi-draft-helpers.test.ts`
- `src/features/scans/DraftReview.tsx`
- `src/features/scans/DraftEditor.tsx`
- `src/features/scans/DraftListView.tsx`
- `app/scan/draft/[id].tsx`
- `src/features/scan/RecentScans.tsx`
