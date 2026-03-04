# Phase 6: Fix Scan Integration (Gap Closure) - Context

**Gathered:** 2026-03-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Fix 5 specific code bugs so the scan-to-recipe flow works end-to-end: auth wiring (getCurrentUserId), retry mechanism (retryScanJob RPC call), route params (useLocalSearchParams), DB column names (convertToRecipe), and native navigation (DraftEditor expo-router). The scan route structure already partially exists — wire up remaining gaps so these fixes are testable by users.

</domain>

<decisions>
## Implementation Decisions

### Post-action navigation
- After converting a draft to recipe: navigate to the new recipe detail screen (user sees their finished result immediately)
- After discarding a draft: navigate back to the scan hub (not "go back" — explicit destination)
- Show confirmation dialog before discarding a draft ("Discard this draft? This can't be undone.")
- When a scan job completes: stay on the scan hub, update job card to show "Ready — View Draft" button (no auto-navigate)

### Claude's Discretion
- Retry feedback UX (inline status change vs toast vs modal; max retry behavior)
- Fix scope beyond the 5 listed bugs (inverted mapScoreToStatus, missing user filter in getUserScanJobs — fix if encountered during the 5 primary fixes)
- Auth edge cases (unauthenticated access handling, session expiry mid-scan — follow existing app patterns)
- Loading skeleton and empty state designs
- Exact spacing and typography in scan screens
- Error state visuals

</decisions>

<specifics>
## Specific Ideas

- The gap analysis doc (.planning/debug/scan-navigation-gap-analysis.md) has detailed route structure proposals — use as reference
- Two versions of ScanPhotoUpload.tsx exist (src/features/scan/ for React Native, src/features/scans/ for Web) — use the React Native one for the mobile app
- retry-recovery-service.ts has a more robust retry implementation than scan-service.ts — consider using it instead of fixing the broken one

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/features/scan/scan-service.ts`: Core scan CRUD, subscriptions — needs getCurrentUserId and retryScanJob fixes
- `src/lib/scan/scan-draft-service.ts`: Draft persistence, convertToRecipe — needs column name fix, also has inverted mapScoreToStatus
- `src/lib/scan/retry-recovery-service.ts`: Well-implemented retry with backoff — may replace broken retryScanJob
- `src/features/scans/DraftEditor.tsx`: Draft editing UI — needs window.location.href replaced with expo-router
- `src/features/scans/DraftManager.tsx`: Draft save/discard/convert dialogs — works correctly
- `src/features/scans/DraftReview.tsx`: Draft review display — works correctly

### Established Patterns
- Auth: all services use `supabase.auth.getUser()` → `user.id` (scan-service.ts has a placeholder returning null)
- Navigation: expo-router Stack-based with route groups: (auth), (family), recipes, collections
- Route params: useLocalSearchParams() is the standard expo-router convention (draft/[id].tsx uses props instead)

### Integration Points
- `app/(scan)/_layout.tsx`: Scan route group layout (exists — Stack with "Recipe Scanner" header)
- `app/(scan)/index.tsx`: Scan hub screen (exists — shows ScanPhotoUpload + ScanJobList)
- `app/(scan)/draft/[id].tsx`: Exists but uses props-based params instead of useLocalSearchParams
- `app/index.tsx`: Home screen — already has "Scan Recipes" link pointing to /(scan)
- `getCurrentUserId()` at scan-service.ts:240-244 returns null — must be replaced with supabase.auth.getUser()
- `getUserScanJobs()` at scan-service.ts:87-94 selects all jobs without user filter
- `subscribeToUserJobs()` depends on broken getCurrentUserId — will never fire correctly

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 06-fix-scan-integration*
*Context gathered: 2026-03-02*
