---
id: S02
parent: M002
milestone: M002
provides:
  - DraftListView component showing all drafts for a multi-draft job with shared photos, progress bar, draft cards, and inline review/edit
  - Route screen multi-draft detection — single-draft bypasses list, ≥2 drafts renders DraftListView
  - "Save All as Recipes" batch action for high-confidence multi-draft jobs
  - Multi-draft count badge in RecentScans for jobs with >1 draft
  - Pure helper functions for draft progress, save-all eligibility, and display status
  - DraftReview and DraftEditor accept optional `draft` prop (skip internal fetch when provided)
  - DraftEditor `onConverted` callback for multi-draft parent navigation override
requires:
  - slice: S01
    provides: getDraftsByJobId(jobId, userId) returning ScanDraft[] with draft_index ordering, convertToRecipe() for individual draft saving
affects:
  - S05
key_files:
  - src/lib/scan/multi-draft-helpers.ts
  - src/lib/scan/__tests__/multi-draft-helpers.test.ts
  - src/features/scans/DraftListView.tsx
  - src/features/scans/DraftReview.tsx
  - src/features/scans/DraftEditor.tsx
  - app/scan/draft/[id].tsx
  - src/features/scan/RecentScans.tsx
key_decisions:
  - Optional draft prop with fallback fetch pattern — components accept either a direct ScanDraft object or an ID to fetch, branching on prop presence
  - Inline draft selection via component state, not sub-routes — keeps route structure simple, avoids deep-linking complexity for transient workflow
  - Single-draft fast path — 1 draft renders DraftReview directly, no "list of 1"
  - Sequential batch save (not parallel) — avoids API overload, enables per-draft progress feedback, partial failures continue remaining
  - Draft is "saved" when status === 'ready' — matches convertToRecipe behavior from S01
  - ScreenMode union type state machine in route screen — clean branching for loading/processing/single/multi/error states
patterns_established:
  - Optional prop with fallback fetch pattern for dual-loading components
  - ScreenMode union type state machine for route-level branching
  - Batch save pattern — iterate sequentially, update progress per iteration, accumulate failures, refresh after completion
  - Factory helper (makeDraft) for test data construction with sensible defaults
  - onConverted callback pattern on DraftEditor — multi-draft parent overrides default navigation
observability_surfaces:
  - "[DraftList] Loaded N drafts for job ${jobId}" console log on mount — distinguishes multi-draft from single-draft path
  - "[DraftList] Batch save: saving draft N of M" during batch save — tracks per-draft progress
  - "[DraftList] Batch save failed for draft ${id}:" on individual failures — preserves error context
  - Error state rendered in DraftListView and route screen when getDraftsByJobId fails — error message visible in UI
drill_down_paths:
  - .gsd/milestones/M002/slices/S02/tasks/T01-SUMMARY.md
  - .gsd/milestones/M002/slices/S02/tasks/T02-SUMMARY.md
  - .gsd/milestones/M002/slices/S02/tasks/T03-SUMMARY.md
  - .gsd/milestones/M002/slices/S02/tasks/T04-SUMMARY.md
duration: 60m
verification_result: passed
completed_at: 2026-03-11
---

# S02: Multi-Draft UX

**Multi-draft review UI with draft list, shared photos, progress tracking, batch save, and single-draft fast path — all wired into the existing scan draft route.**

## What Happened

Built the complete multi-draft user experience in four tasks:

**T01** established the pure logic layer — `getDraftProgress()`, `canSaveAll()`, and `getDraftDisplayStatus()` in `multi-draft-helpers.ts` with 19 tests defining the contract for UI behavior.

**T02** refactored DraftReview and DraftEditor to accept an optional `draft: ScanDraft` prop. When provided, components skip internal fetch/subscribe and use the object directly. Legacy `draftId` path preserved for backward compatibility. DraftReview gained an `onDraftSaved` callback; DraftEditor gained an `onConverted` callback for parent coordination.

**T03** built the core `DraftListView` component (~340 lines) and rewired the route screen. DraftListView loads all drafts via `getDraftsByJobId()`, displays shared photos at the top, renders draft cards with title/confidence/status badges, shows a progress bar ("N of M recipes saved"), and renders the selected draft's DraftReview/DraftEditor inline. The route screen uses a ScreenMode state machine: 0 drafts → subscribe+poll for processing jobs, 1 draft → single-draft fast path, ≥2 drafts → DraftListView. Responsive layout: mobile shows vertical cards, tablet/web shows sidebar + detail panel.

**T04** added "Save All as Recipes" batch action (sequential with per-draft progress and partial failure handling) and updated RecentScans to show a "N recipes" badge for multi-draft jobs. Three additional edge-case tests brought the helper suite to 19 total.

## Verification

- `npx jest src/lib/scan/__tests__/multi-draft-helpers.test.ts` — 19/19 tests pass
- `npx jest` — 353/353 tests pass across 18 suites, zero failures
- `npx tsc --noEmit` — zero TypeScript errors
- Browser verification: route screen renders loading state correctly at mobile and desktop viewports, no console errors

## Requirements Advanced

- SCAN-MULTI — S02 completes the UI layer for multi-recipe scan. Users can now see all drafts for a multi-draft job, review/edit/save each independently, batch-save high-confidence drafts, and see draft counts in recent scans. End-to-end proof (photo → edge function → drafts → review → save) requires S05 UAT with real photos.

## Requirements Validated

- None newly validated — SCAN-MULTI requires real-photo UAT in S05 to move from active to validated.

## New Requirements Surfaced

- None.

## Requirements Invalidated or Re-scoped

- None.

## Deviations

- T03 added `onConverted` prop to DraftEditor (not in original plan) — necessary to prevent hardcoded `router.replace` from navigating away after saving a draft in multi-draft context. Minimal, backward-compatible change.

## Known Limitations

- No deep-linking to a specific draft within a multi-draft job — draft selection is transient component state, not URL-driven. Acceptable for the workflow.
- Browser verification limited to loading/error states — full multi-draft data flow (multiple real drafts rendering as cards) requires an authenticated session with real multi-draft job data, deferred to S05 UAT.
- Photos loaded once per DraftListView mount via `getJobPhotos()` — no caching across re-mounts if user navigates away and returns.

## Follow-ups

- S05 UAT: exercise full multi-draft flow with real multi-recipe cookbook page photos end-to-end.
- Consider adding a loading skeleton for DraftListView while drafts load (currently shows "Loading drafts..." text).

## Files Created/Modified

- `src/lib/scan/multi-draft-helpers.ts` — Pure helper functions: getDraftProgress, canSaveAll, getDraftDisplayStatus
- `src/lib/scan/__tests__/multi-draft-helpers.test.ts` — 19 tests for helper functions
- `src/features/scans/DraftListView.tsx` — Core multi-draft list component (~340 lines) with shared photos, progress, batch save
- `src/features/scans/DraftReview.tsx` — Added optional `draft` prop, `onDraftSaved` callback, dual-path loading
- `src/features/scans/DraftEditor.tsx` — Added optional `draft` and `onConverted` props, dual-path loading
- `app/scan/draft/[id].tsx` — Multi-draft detection with ScreenMode state machine, DraftListView integration
- `src/features/scan/RecentScans.tsx` — Multi-draft grouping with draftCount badge

## Forward Intelligence

### What the next slice should know
- The multi-draft UI is complete and wired in but has only been verified with loading/error states in the browser. S05 UAT should exercise the full flow with real multi-draft data.
- DraftListView owns its own subscribe+poll lifecycle independently from the route screen's detection logic — these are separate state machines that could theoretically disagree on draft count if data changes between detection and mount.

### What's fragile
- Two loading paths in DraftReview and DraftEditor (prop vs fetch) — if the ScanDraft type shape changes, both paths must be updated. The dual-path pattern is clear but adds surface area.
- Route screen ScreenMode branching has 5 states — edge cases around timing (job completes between detection and DraftListView mount) are handled by DraftListView's own subscribe+poll but worth watching in UAT.

### Authoritative diagnostics
- `[DraftList] Loaded N drafts for job ${jobId}` console log — confirms which path (single vs multi) was taken at runtime
- Route screen `mode` state variable — inspect in React DevTools to see current state machine position
- `getDraftsByJobId(jobId, userId)` — the single source of truth for draft count per job

### What assumptions changed
- No assumptions changed — S01's boundary contract (getDraftsByJobId returning ScanDraft[]) worked exactly as specified
