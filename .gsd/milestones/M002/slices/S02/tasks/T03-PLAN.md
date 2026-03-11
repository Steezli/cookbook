---
estimated_steps: 5
estimated_files: 3
---

# T03: Build DraftListView component and wire into route screen

**Slice:** S02 — Multi-Draft UX
**Milestone:** M002

## Description

This is the core UI deliverable: a `DraftListView` component that renders when a scan job produces multiple drafts. It shows shared photos, a scrollable list of draft cards with title/confidence/status, a progress indicator, and inline review of the selected draft. The route screen `app/scan/draft/[id].tsx` is updated to detect multi-draft jobs and branch to either `DraftListView` (≥2 drafts) or existing single-draft flow (1 draft).

## Steps

1. **Create `src/features/scans/DraftListView.tsx`:**
   - Props: `{ jobId: string }`.
   - On mount: call `getDraftsByJobId(jobId, userId)`. If the job is still processing (no drafts yet), use `subscribeToJob` + polling fallback (same pattern as existing DraftReview) until drafts appear, then call `getDraftsByJobId()` again.
   - Load photos once via `getJobPhotos(jobId)` — shared across all drafts.
   - State: `drafts: ScanDraft[]`, `selectedDraftIndex: number | null`, `isEditing: boolean`, `photoUrls: string[]`, `loading: boolean`, `error: string | null`.
   - Layout (responsive via `useBreakpoint()`):
     - **Shared photo section** at the top (reuse the same `PhotoSection` pattern from DraftReview — extract or inline).
     - **Progress bar**: Use `getDraftProgress(drafts)` from multi-draft-helpers. Show "N of M recipes saved" with a visual progress bar. When `allSaved`, show a success state with "All recipes saved!" and a "Back to Scans" button.
     - **Draft card list**: For each draft, render a card with: recipe title (or "Recipe N" fallback using `draftIndex + 1`), confidence badge (reuse `getConfidenceColor`/`getConfidenceLabel` pattern), display status from `getDraftDisplayStatus()`, tap handler to select.
     - **Selected draft panel**: When a draft is selected, render `DraftReview` (or `DraftEditor` when `isEditing`) below the list, passing the `ScanDraft` object via the `draft` prop added in T02. Pass `onDraftSaved` callback to refresh the draft list after a recipe is saved.
   - When a draft is saved (callback fires): re-call `getDraftsByJobId()` to get updated statuses, update progress display.
   - Use design tokens for all colors, fonts, spacing, radii. No hardcoded colors.

2. **Update `app/scan/draft/[id].tsx` to orchestrate multi-draft detection:**
   - On mount: call `getDraftsByJobId(id, userId)`.
   - Loading state while fetching.
   - If 0 drafts and job may be processing: show existing loading/processing UI (reuse pattern from current DraftReview loading state), subscribe to job, then re-check.
   - If 1 draft: render existing `DraftReview`/`DraftEditor` flow directly (backward compat), passing `draftId={id}` as before.
   - If ≥2 drafts: render `<DraftListView jobId={id} />`.
   - This replaces the current simple `isEditing` toggle — the `isEditing` state moves into `DraftListView` for multi-draft, or stays in the route screen for single-draft.

3. **Handle responsive layouts:**
   - Mobile: draft list as vertical cards, selected draft renders below.
   - Tablet/Web: draft list as sidebar (30% width) on the left, selected draft content on the right (70%).

4. **Run `npx tsc --noEmit`** — zero errors.

5. **Browser verification** against running dev server:
   - Navigate to `/scan/draft/{jobId}` for a job with multiple drafts → list renders.
   - Tap a draft → DraftReview renders with correct data.
   - Navigate to `/scan/draft/{jobId}` for a single-draft job → DraftReview renders directly, no list.

## Must-Haves

- [ ] DraftListView renders all drafts for a multi-draft job
- [ ] Progress indicator shows "N of M recipes saved"
- [ ] Selected draft renders DraftReview inline with the ScanDraft passed directly
- [ ] Single-draft jobs bypass the list (no "list of 1")
- [ ] Photos shared at job level, not duplicated per draft
- [ ] Design tokens used for all styling
- [ ] Responsive layout (mobile vertical, tablet/web sidebar)
- [ ] Zero TypeScript errors

## Verification

- `npx tsc --noEmit` — zero errors
- Browser: multi-draft list visible, drafts selectable, single-draft bypass works

## Observability Impact

- Signals added/changed: `console.log('[DraftList] Loaded N drafts for job ${jobId}')` on mount — distinguishes multi-draft from single-draft code path in logs
- How a future agent inspects this: Check route screen branching logic by reading `app/scan/draft/[id].tsx`; inspect draft list state via `getDraftsByJobId()` in the data layer
- Failure state exposed: Error state rendered in DraftListView when `getDraftsByJobId` fails; individual draft errors surface through DraftReview's existing error UI

## Inputs

- `src/lib/scan/multi-draft-helpers.ts` — T01's helper functions for progress/status
- `src/features/scans/DraftReview.tsx` — T02's refactored component with `draft` prop
- `src/features/scans/DraftEditor.tsx` — T02's refactored component with `draft` prop
- `src/lib/scan/scan-draft-service.ts` — `getDraftsByJobId()` boundary contract from S01
- `src/features/scan/scan-service.ts` — `getJobPhotos()`, `subscribeToJob()`
- `src/lib/tokens.ts` — design tokens

## Expected Output

- `src/features/scans/DraftListView.tsx` — new component (~250-350 lines)
- `app/scan/draft/[id].tsx` — updated with multi-draft detection and branching
