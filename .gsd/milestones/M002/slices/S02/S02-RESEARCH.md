# S02: Multi-Draft UX — Research

**Date:** 2026-03-11

## Summary

The Multi-Draft UX slice needs to evolve the existing single-draft review flow into one that handles N drafts per scan job. The current architecture routes `/scan/draft/[id]` with the **job ID** (not draft ID) — both `DraftReview` and `DraftEditor` call `getDraftByJobId()` (singular) to fetch a single draft. S01 added `getDraftsByJobId()` (plural) returning `ScanDraft[]` ordered by `draftIndex`, but no UI consumes it yet.

The primary change is a new **DraftListReview** screen (or wrapper component) at the job level that detects multi-draft jobs and presents a list/selector, with each individual draft still reviewable and saveable via the existing `DraftReview` + `DraftEditor` + `DraftManager` components. The existing components are well-structured and don't need major refactoring — they already operate on a single `ScanDraft` and accept it via props or load it by ID. The work is mostly additive.

## Recommendation

**Add a multi-draft awareness layer above the existing single-draft components.** The route `app/scan/draft/[id].tsx` should first call `getDraftsByJobId()`. If 1 draft → render `DraftReview` directly (backward compat). If N drafts → render a new `DraftListView` showing all drafts with titles, confidence badges, and status, letting the user tap into each one for individual review/edit/save. Each draft should be independently saveable as a recipe (the existing `DraftManager.convertToRecipe` already works per-draft-ID).

Key UX decisions:
- **Navigation pattern:** Inline accordion/tab within the job page (not separate routes per draft). This avoids route-param complexity and keeps the multi-draft context visible. A "draft selector" strip or list at the top, with the selected draft's `DraftReview` rendered below.
- **Progress tracking:** Show which drafts have been saved as recipes vs. which are still pending review. A summary bar like "2 of 3 recipes saved" gives clear completion state.
- **"Save All" convenience:** For high-confidence multi-draft jobs, consider a batch "Save All as Recipes" action in addition to per-draft save.

## Don't Hand-Roll

| Problem | Existing Solution | Why Use It |
|---------|------------------|------------|
| Fetching all drafts for a job | `scanDraftService.getDraftsByJobId(jobId, userId)` | Already built and tested in S01 (7 tests). Returns `ScanDraft[]` ordered by `draftIndex`. |
| Single-draft review + confidence display | `DraftReview` component | Full responsive layout (mobile/tablet/web) with photo section, confidence badges, field cards. |
| Single-draft editing with auto-save | `DraftEditor` component | Undo history, ingredient/instruction CRUD, debounced auto-save, conversion to recipe. |
| Draft-to-recipe conversion | `DraftManager.convertToRecipe()` → `scanDraftService.convertToRecipe()` | Handles ingredients/steps transform, recipe insertion, draft status update. |
| Photo loading per job | `getJobPhotos(jobId)` in `scan-service.ts` | Returns all photo URLs for a job. Shared across all drafts from the same scan. |
| Real-time job status | `subscribeToJob(jobId, callback)` | Already used in DraftReview for waiting on processing completion. |
| Responsive breakpoint detection | `useBreakpoint()` hook | Returns mobile/tablet/web. Used throughout the existing draft screens. |

## Existing Code and Patterns

- `app/scan/draft/[id].tsx` — Route screen. Currently creates `DraftReview` or `DraftEditor` based on `isEditing` state. The `id` param is the **job ID** (not draft ID). This is the primary file to modify for multi-draft awareness.
- `src/features/scans/DraftReview.tsx` — Single-draft review. Props: `{ draftId: string, onDraftUpdated, onEdit }`. Note: `draftId` is confusingly named — it's actually the **jobId** (line: `getDraftByJobId(draftId, userId)`). For multi-draft, this component needs a **minor** refactor to accept a `ScanDraft` object directly instead of fetching internally, or a new prop to pass the draft ID.
- `src/features/scans/DraftEditor.tsx` — Single-draft editor. Same pattern — `draftId` prop is actually jobId, calls `getDraftByJobId`. Same refactor need.
- `src/features/scans/DraftManager.tsx` — Save/discard/share actions. Takes a `ScanDraft` object as prop. Already works per-draft. No changes needed.
- `src/lib/scan/scan-draft-service.ts` — Data layer. `getDraftsByJobId()` (plural) is the S01→S02 boundary contract. `convertToRecipe()` takes a draft ID. `deleteDraft()` works per-draft.
- `src/features/scan/RecentScans.tsx` — Shows recent jobs with first draft title. Currently only shows one draft per job. Should be updated to show draft count for multi-draft jobs.
- `src/features/scan/scan-service.ts` — `subscribeToJob()` and `getJobPhotos()`. Photos are per-job, shared across all drafts.
- `src/lib/tokens.ts` — Design tokens. All existing draft UI uses these for consistent styling.

## Constraints

- **Test environment is Node.js, not jsdom.** Jest config uses `testEnvironment: 'node'`. React component rendering tests would need `@testing-library/react-native` or similar, which isn't set up. Plan for logic-level tests (hooks, data transforms) rather than component render tests.
- **`draftId` naming confusion.** Both `DraftReview` and `DraftEditor` accept a prop called `draftId` but treat it as a **jobId** (they call `getDraftByJobId`). Renaming this prop is a breaking change to the route screen. Safer to refactor the components to accept either a jobId (for backward compat / single-draft) or a pre-loaded `ScanDraft` object.
- **Expo Router file-based routing.** Adding new routes (e.g., `app/scan/draft/[id]/[draftIndex].tsx`) requires new files and careful nesting. Prefer keeping the current route and handling multi-draft selection within the component.
- **Photos are per-job, not per-draft.** All drafts from the same job share the same scan photos. The `DraftReview` photo section loads via `getJobPhotos(jobId)`. In multi-draft mode, photos should display once at the top (or in a shared panel) rather than duplicated per-draft.
- **No `@testing-library/react-native` in devDependencies.** Component-level rendering tests aren't the established pattern. Existing tests mock Supabase and test service-layer logic. Follow the same pattern for new logic.

## Common Pitfalls

- **Naming collision: draftId vs jobId.** The existing `DraftReview` and `DraftEditor` both call their prop `draftId` but use it as a jobId. When introducing actual draft IDs (for individual draft selection in multi-draft), keep naming clear: `jobId` for the scan job, `draftId` for the individual `scan_drafts.id`. Refactor the prop name in the existing components when modifying them.
- **Loading state flash for single-draft jobs.** If the multi-draft wrapper always shows a draft list first, single-draft jobs (the common case) get an unnecessary intermediate "list of 1" step. Optimize: if `drafts.length === 1`, render `DraftReview` directly with no list UI. Only show the list for ≥2 drafts.
- **Race condition on job completion polling.** `DraftReview` uses both Supabase Realtime subscription AND polling (every 4s) to detect when a job finishes. In multi-draft mode, `getDraftsByJobId()` should be used instead of `getDraftByJobId()` so all drafts are discovered at once, not just the first one.
- **Draft save doesn't remove it from the list.** When a draft is converted to a recipe, its status changes to `ready` (via `updateDraftStatus`), but it's not deleted. The multi-draft list needs to track which drafts have been saved and show their status accordingly (not assume deletion = saved).
- **Scroll position loss on draft switch.** If using a tab/selector pattern, switching between drafts shouldn't reset scroll position of the previously viewed draft. Either maintain per-draft scroll state or always scroll to top on switch (simpler, acceptable UX).

## Open Risks

- **No existing React component tests.** The project has no established pattern for testing React Native components. The new `DraftListView` component will be tested via manual browser verification and logic-level unit tests on any extracted helpers.
- **DraftReview internal state management.** DraftReview manages its own loading/polling/subscription lifecycle in a `useEffect`. Refactoring it to accept a pre-loaded `ScanDraft` instead of fetching internally requires careful state migration to avoid breaking the existing flow for single-draft jobs.
- **RecentScans shows only one draft per job.** The `RecentScans` component maps each job to its first draft's title. For multi-draft jobs, users may expect to see "2 recipes detected" or similar. This is a minor enhancement but adds scope.
- **The DraftEditor loads draft by jobId (singular).** When editing a specific draft from a multi-draft job, the editor must load the correct draft (by actual draft ID, not jobId). This requires either a new `getDraft(draftId, userId)` call path or passing the draft object down.

## Skills Discovered

| Technology | Skill | Status |
|------------|-------|--------|
| Expo Router | `jchaselubitz/drill-app@expo-router` | available (64 installs) |
| React Native Testing | `callstack/react-native-testing-library@react-native-testing` | available (271 installs) |
| Supabase | `supabase/agent-skills@supabase-postgres-best-practices` | available (31.8K installs) — already relevant patterns established in codebase |
| React Native | `pluginagentmarketplace/custom-plugin-react-native@react-native-animations` | available (306 installs) — not needed for this slice |

None of these are critical for S02. The codebase already has established Expo Router and Supabase patterns. React Native testing skill could help if component tests are desired, but the project uses logic-level Jest tests.

## Sources

- S01 summary provides `getDraftsByJobId()` API contract (source: `.gsd/milestones/M002/slices/S01/S01-SUMMARY.md`)
- Existing `DraftReview.tsx` uses `draftId` as jobId and calls `getDraftByJobId()` (source: `src/features/scans/DraftReview.tsx`)
- Upload flow navigates to `/scan/draft/${result.jobId}` after upload (source: `app/scan/index.tsx`)
- Jest config uses `testEnvironment: 'node'` with ts-jest (source: `jest.config.js`)
- `ScanDraft` interface includes `draftIndex?: number` added in S01 (source: `src/lib/scan/scan-draft-service.ts`)
