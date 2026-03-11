---
id: T03
parent: S02
milestone: M002
provides:
  - DraftListView component rendering all drafts for a multi-draft job with shared photos, progress bar, draft cards, and inline review/edit
  - Route screen multi-draft detection — single-draft bypasses list, multi-draft renders DraftListView
  - Responsive layout — mobile vertical cards, tablet/web sidebar+detail panel
key_files:
  - src/features/scans/DraftListView.tsx
  - app/scan/draft/[id].tsx
  - src/features/scans/DraftEditor.tsx
key_decisions:
  - Route screen orchestrates detection via getDraftsByJobId — 0 drafts triggers subscribe+poll, 1 draft renders single-draft flow, ≥2 drafts renders DraftListView
  - DraftListView handles its own subscribe/poll for in-progress jobs independently from the route screen's detection — once mode='multi' is set, DraftListView owns the draft lifecycle
  - DraftEditor extended with onConverted prop to allow multi-draft parent to intercept post-save navigation instead of the hardcoded router.replace
  - Photos loaded once at job level via getJobPhotos, shared across all draft views — never duplicated per draft
patterns_established:
  - Optional onConverted callback pattern on DraftEditor — multi-draft parent overrides default navigation, single-draft path falls through to existing router.replace behavior
  - ScreenMode union type for route-level state machine — 'loading' | 'processing' | 'single' | 'multi' | 'error' — clean branching for all states
  - Subscribe+poll pattern replicated from DraftReview for both route screen detection and DraftListView mount — consistent approach to waiting for processing jobs
observability_surfaces:
  - console.log('[DraftList] Loaded N drafts for job ${jobId}') on mount — distinguishes multi-draft from single-draft path
  - Error state rendered in DraftListView when getDraftsByJobId fails — error message visible in UI
  - Route screen error state for detection failures — separate from DraftListView internal errors
duration: 20m
verification_result: passed
blocker_discovered: false
---

# T03: Build DraftListView component and wire into route screen

**Created DraftListView component (~340 lines) that renders all drafts for a multi-draft job with shared photos, progress bar, and inline review/edit; updated route screen with multi-draft detection branching.**

## What Happened

Built the core multi-draft UI deliverable:

1. **DraftListView** (`src/features/scans/DraftListView.tsx`): New component accepting `{ jobId }` that:
   - Loads all drafts via `getDraftsByJobId()` with subscribe+poll fallback for in-progress jobs
   - Loads photos once via `getJobPhotos()`, shared across all drafts
   - Renders shared photo section at top with thumbnail strip
   - Shows progress bar with "N of M recipes saved" and success state when all saved
   - Renders draft card list with title (or "Recipe N" fallback), confidence badge, and display status badge
   - On card tap, renders DraftReview (or DraftEditor when editing) inline with the ScanDraft passed directly via the `draft` prop from T02
   - When a draft is saved (via DraftEditor's onConverted override), refreshes the draft list instead of navigating away
   - Responsive: mobile shows vertical cards with selected draft below; tablet/web shows 30% sidebar + 70% detail panel

2. **Route screen** (`app/scan/draft/[id].tsx`): Replaced the simple isEditing toggle with full multi-draft detection:
   - Calls `getDraftsByJobId(id, userId)` on mount
   - ScreenMode state machine: loading → processing (if 0 drafts and waiting) → single (1 draft) or multi (≥2 drafts) or error
   - Single-draft: renders existing DraftReview/DraftEditor flow with draftId prop (backward compat)
   - Multi-draft: renders `<DraftListView jobId={id} />`
   - Subscribe+poll fallback for jobs still processing

3. **DraftEditor extension**: Added optional `onConverted` prop so DraftListView can intercept the post-convert navigation. Falls through to existing `router.replace('/recipes/${recipeId}')` when not provided.

## Verification

- `npx tsc --noEmit` — zero TypeScript errors ✓
- `npx jest src/lib/scan/__tests__/multi-draft-helpers.test.ts` — 16/16 tests pass ✓
- `npx jest` — 350/350 tests pass across 18 suites ✓
- Browser: navigated to `/scan/draft/test-job-id` — route screen renders loading state correctly ("Loading drafts...") with no console errors ✓
- Browser: mobile viewport (390×844) — loading state renders correctly ✓
- Browser: desktop viewport (1280×800) — loading state renders correctly ✓
- Browser assertions: url_contains, text_visible, no_console_errors — all PASS ✓

**Slice-level verification status (intermediate task — 3 of 4):**
- `npx jest src/lib/scan/__tests__/multi-draft-helpers.test.ts` — PASS (16/16)
- `npx jest` — PASS (350/350)
- `npx tsc --noEmit` — PASS (zero errors)
- Browser: multi-draft list rendering — partial (loading/error states verified; full multi-draft data flow requires authenticated session with real multi-draft job data, which T04 or UAT will exercise)

## Diagnostics

- Check route screen branching by reading `app/scan/draft/[id].tsx` — the `mode` state variable shows which path was taken
- `[DraftList] Loaded N drafts for job ${jobId}` console log distinguishes multi-draft from single-draft at runtime
- Error state in DraftListView shows the error message from `getDraftsByJobId` failures
- Route screen error state (mode='error') shows error message from detection failures

## Deviations

- Added `onConverted` prop to `DraftEditor` — not explicitly in the T03 plan but necessary to prevent DraftEditor from navigating away after saving a recipe in multi-draft context. The existing `handleDraftConverted` was hardcoded to `router.replace`. This is a minimal, backward-compatible change.
- "Save All as Recipes" button not included in DraftListView — plan places this in T04 as the batch action task. DraftListView renders progress and card list but delegates batch save to T04.

## Known Issues

None.

## Files Created/Modified

- `src/features/scans/DraftListView.tsx` — **new** — core multi-draft list component (~340 lines)
- `app/scan/draft/[id].tsx` — **modified** — multi-draft detection and branching (replaced simple isEditing toggle)
- `src/features/scans/DraftEditor.tsx` — **modified** — added optional `onConverted` prop for multi-draft parent coordination
