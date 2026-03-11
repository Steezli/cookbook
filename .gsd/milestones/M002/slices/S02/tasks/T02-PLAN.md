---
estimated_steps: 5
estimated_files: 3
---

# T02: Refactor DraftReview and DraftEditor to accept a ScanDraft object

**Slice:** S02 — Multi-Draft UX
**Milestone:** M002

## Description

DraftReview and DraftEditor both accept a prop called `draftId` that is actually a job ID, and they fetch the draft internally via `getDraftByJobId()`. For multi-draft support, the parent component needs to pass a specific `ScanDraft` object to each component. This task adds an optional `draft` prop to both components — when provided, the component uses it directly instead of fetching. The existing `draftId` prop continues to work for backward compatibility so the single-draft route screen doesn't break.

## Steps

1. **Refactor DraftReview.tsx:**
   - Add optional `draft?: ScanDraft` and optional `jobId?: string` props alongside existing `draftId` (keeping `draftId` for backward compat).
   - When `draft` prop is provided: skip the `useEffect` fetch/subscribe cycle entirely, set the draft state directly, still load photos via `getJobPhotos(draft.jobId)`.
   - When `draft` prop is NOT provided (backward compat): existing behavior — use `draftId` as jobId, fetch via `getDraftByJobId()`, subscribe, poll.
   - Add an `onDraftSaved?: (draft: ScanDraft) => void` callback prop so the parent knows when a draft was saved as a recipe.

2. **Refactor DraftEditor.tsx:**
   - Add optional `draft?: ScanDraft` prop.
   - When `draft` prop is provided: skip internal fetch, initialize `draft` and `recipe` state from the prop, use `draft.id` (actual draft ID) for all `scanDraftService` calls (`updateDraftRecipe`, `convertToRecipe`).
   - When `draft` prop is NOT provided: existing behavior with `draftId` as jobId.
   - Ensure `DraftManager` receives the correct `draft` object with the real draft ID.

3. **Update the route screen `app/scan/draft/[id].tsx`:**
   - No changes to the routing — it still extracts `id` from params and passes it as `draftId`.
   - This task does NOT add multi-draft detection (that's T03). The route screen continues to work exactly as before.

4. **Run `npx tsc --noEmit`** to confirm zero TypeScript errors after the refactor.

5. **Run `npx jest`** to confirm no test regressions.

## Must-Haves

- [ ] DraftReview accepts optional `draft` prop and skips internal fetch when provided
- [ ] DraftEditor accepts optional `draft` prop and skips internal fetch when provided
- [ ] DraftEditor uses `draft.id` (not jobId) for service calls when draft prop is provided
- [ ] Backward compatibility: passing `draftId` without `draft` works exactly as before
- [ ] Zero TypeScript errors
- [ ] All existing tests pass

## Verification

- `npx tsc --noEmit` — zero errors
- `npx jest` — all existing tests pass (334+)
- Manual reasoning: the route screen is unchanged, so existing behavior is preserved

## Observability Impact

- Signals added/changed: None — existing console.log/error patterns unchanged
- How a future agent inspects this: Read the component props interface to understand the two loading paths
- Failure state exposed: DraftReview and DraftEditor continue to show error UI when draft loading fails via either path

## Inputs

- `src/features/scans/DraftReview.tsx` — current component accepting `draftId` as jobId
- `src/features/scans/DraftEditor.tsx` — current component accepting `draftId` as jobId
- `src/features/scans/DraftManager.tsx` — already accepts `ScanDraft` object, no changes needed
- `ScanDraft` interface from `src/lib/scan/scan-draft-service.ts`

## Expected Output

- `src/features/scans/DraftReview.tsx` — updated with optional `draft` prop, dual loading path
- `src/features/scans/DraftEditor.tsx` — updated with optional `draft` prop, dual loading path
- `app/scan/draft/[id].tsx` — unchanged (backward compat confirmed)
