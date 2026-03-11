---
id: T02
parent: S02
milestone: M002
provides:
  - DraftReview accepts optional `draft` prop and skips internal fetch/subscribe when provided
  - DraftEditor accepts optional `draft` prop and skips internal fetch when provided
  - Both components retain backward compat via `draftId` prop (legacy single-draft path)
  - onDraftSaved callback on DraftReview for multi-draft parent coordination
key_files:
  - src/features/scans/DraftReview.tsx
  - src/features/scans/DraftEditor.tsx
key_decisions:
  - Dual useEffect pattern — one effect for draftProp sync (photo load only), second effect for legacy fetch/subscribe — guarded by `if (draftProp) return` to ensure mutual exclusivity
  - State initialization from prop — `useState(draftProp ?? null)` and `useState(!draftProp)` for loading — avoids flash of loading state when draft is already available
  - DraftEditor syncs all edit state (history, recipe, lastSaved) when draftProp changes, enabling parent to switch between drafts in multi-draft view
patterns_established:
  - Optional prop with fallback fetch pattern — component accepts either a direct object or an ID to fetch, using prop presence to choose the code path
observability_surfaces:
  - None new — existing console.error/warn patterns preserved for both loading paths
duration: 15m
verification_result: passed
completed_at: 2026-03-11
blocker_discovered: false
---

# T02: Refactor DraftReview and DraftEditor to accept a ScanDraft object

**Added optional `draft` prop to DraftReview and DraftEditor, enabling multi-draft parent to pass specific drafts directly while preserving backward-compat single-draft path.**

## What Happened

Refactored both components to support two loading paths:

1. **Direct draft path** (`draft` prop provided): Component initializes state from the prop, skips the fetch/subscribe/poll cycle entirely, and only loads photos via `getJobPhotos(draft.jobId)`. DraftEditor syncs edit history and recipe state from the prop.

2. **Legacy path** (`draftId` prop, no `draft`): Existing behavior unchanged — fetches via `getDraftByJobId()`, subscribes to job status, polls as fallback. This is what the route screen `app/scan/draft/[id].tsx` continues to use.

DraftReview also gained an `onDraftSaved` callback prop for multi-draft parent coordination (T03 will use this).

DraftEditor already used `draft.id` (from local state) for `scanDraftService.updateDraftRecipe()` and passed the `draft` object to `DraftManager`, so service calls were already correct once local state is initialized from `draftProp`.

The route screen was left unchanged — it passes `draftId={id!}` which exercises the backward-compat path.

## Verification

- `npx tsc --noEmit` — zero TypeScript errors
- `npx jest` — 350 tests pass, zero failures
- `npx jest src/lib/scan/__tests__/multi-draft-helpers.test.ts` — 16 tests pass (T01 helpers intact)
- Route screen unchanged — backward compat confirmed by code inspection (same `draftId={id!}` prop)

## Diagnostics

Both loading paths preserve existing `console.error` / `console.warn` patterns. A future agent can identify which path a component is using by checking whether a `draft` prop is passed in the parent JSX.

## Deviations

None — executed as planned.

## Known Issues

None.

## Files Created/Modified

- `src/features/scans/DraftReview.tsx` — Added optional `draft` prop, `onDraftSaved` callback, dual-path loading with separate useEffects
- `src/features/scans/DraftEditor.tsx` — Added optional `draft` prop, dual-path loading with draftProp sync effect
