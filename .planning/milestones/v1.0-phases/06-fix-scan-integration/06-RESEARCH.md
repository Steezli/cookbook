# Phase 6: Fix Scan Integration (Gap Closure) - Research

**Researched:** 2026-03-02
**Domain:** Expo Router navigation, Supabase auth/RPC, React Native, scan-to-recipe data flow
**Confidence:** HIGH

## Summary

This phase fixes 5 specific code bugs preventing the scan-to-recipe flow from working end-to-end. Each bug has been verified against the codebase and database schema. The fixes are surgical -- no new libraries, no architectural changes, no new features. The primary risk is the `convertToRecipe` function, which has **4 separate column name mismatches** against the actual recipes table schema.

Additionally, two secondary bugs (inverted `mapScoreToStatus` and missing user filter in `getUserScanJobs`) should be fixed when encountered, per user decision. The `DraftManager.tsx` and `DraftEditor.tsx` files both contain web-only patterns (`window.location`, `<div>`, CSS classes) that need conversion to React Native/expo-router equivalents.

**Primary recommendation:** Fix all 5 bugs in order of dependency (auth first, then service layer, then UI/navigation), verify each fix against the actual database schema, and use the `RetryRecoveryService` to replace the broken `retryScanJob` rather than fixing it.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- After converting a draft to recipe: navigate to the new recipe detail screen (user sees their finished result immediately)
- After discarding a draft: navigate back to the scan hub (not "go back" -- explicit destination)
- Show confirmation dialog before discarding a draft ("Discard this draft? This can't be undone.")
- When a scan job completes: stay on the scan hub, update job card to show "Ready -- View Draft" button (no auto-navigate)

### Claude's Discretion
- Retry feedback UX (inline status change vs toast vs modal; max retry behavior)
- Fix scope beyond the 5 listed bugs (inverted mapScoreToStatus, missing user filter in getUserScanJobs -- fix if encountered during the 5 primary fixes)
- Auth edge cases (unauthenticated access handling, session expiry mid-scan -- follow existing app patterns)
- Loading skeleton and empty state designs
- Exact spacing and typography in scan screens
- Error state visuals

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SCAN-01 | User can upload a recipe photo to start a scan job | Auth fix (getCurrentUserId) enables real-time job subscription; getUserScanJobs user filter ensures user sees only their jobs |
| SCAN-03 | User can review and edit any field in the draft before saving as a normal recipe | draft/[id].tsx useLocalSearchParams fix loads correct draft; convertToRecipe column fixes enable successful save; DraftEditor expo-router navigation works on native |
| SCAN-04 | User can see scan status and retry failed scans | retryScanJob fix (or RetryRecoveryService replacement) enables working retry; subscribeToUserJobs depends on getCurrentUserId fix for real-time updates |

</phase_requirements>

## Standard Stack

### Core (already installed -- no new dependencies)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| expo-router | (project version) | File-based routing for React Native | Already used throughout app; useLocalSearchParams is the standard param access pattern |
| @supabase/supabase-js | (project version) | Database client, auth, realtime | Already used throughout app; supabase.auth.getUser() is the standard auth pattern |
| react-native | (project version) | UI framework | Already used; View/Text/TouchableOpacity instead of div/button |

### Supporting (already installed)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| expo-router (router) | (project version) | Programmatic navigation | router.push() / router.replace() instead of window.location.href |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Fix broken retryScanJob | Use RetryRecoveryService.retryJob() | RetryRecoveryService is more robust (backoff, error classification, subscription-aware) -- recommended by user in CONTEXT.md |

**Installation:**
```bash
# No new packages needed -- all fixes use existing dependencies
```

## Architecture Patterns

### Established Auth Pattern
**What:** All services use `supabase.auth.getUser()` to get the authenticated user ID.
**Where verified:** `src/features/scan/scan-service.ts:55-56` (createMultiPhotoScanJob), `src/features/recipes/api.ts:22-23`, `src/features/collections/api.ts:28-29`
**Example:**
```typescript
// Source: src/features/recipes/api.ts:22-23 (established project pattern)
const { data: { user } } = await supabase.auth.getUser();
if (!user) throw new Error("Not authenticated");
```

### Established Route Params Pattern
**What:** Dynamic route segments use `useLocalSearchParams()` from expo-router.
**Where verified:** `app/recipes/[id].tsx:1,29`, `app/collections/[id].tsx:1,26`, `app/(family)/family/[id].tsx:1,41`, `app/invite/[token].tsx:1,9`
**Example:**
```typescript
// Source: app/recipes/[id].tsx:1,29 (established project pattern)
import { useLocalSearchParams } from "expo-router";
const { id } = useLocalSearchParams<{ id: string }>();
```

### Established Navigation Pattern
**What:** Programmatic navigation uses `router` from expo-router.
**Where verified:** `app/recipes/create.tsx:195`, `app/collections/create.tsx:56`, `app/collections/[id].tsx:134`
**Example:**
```typescript
// Source: app/recipes/create.tsx:195 (established project pattern)
import { router } from "expo-router";
router.replace(`/recipes/${recipe.id}`);
```

### Established Recipe Insert Pattern
**What:** Recipes use `owner_user_id` (not `user_id`), `steps` (not `instructions`), no `status` column, no `scan_draft_id` column.
**Where verified:** `supabase/migrations/20260203090000_phase1_foundation.sql:136-143` (table definition), `supabase/migrations/20260203100000_phase2_recipe_crud.sql:8-17` (added columns), `src/features/recipes/api.ts:27-39` (insert usage)
**Example:**
```typescript
// Source: src/features/recipes/api.ts:27-39 (established project pattern)
const { data, error } = await supabase
  .from("recipes")
  .insert({
    owner_user_id: user.id,  // NOT user_id
    title: input.title,
    description: input.description || null,
    ingredients: input.ingredients,
    steps: input.steps,  // NOT instructions
    visibility: input.visibility,
    family_id: input.family_id || null,
    servings: input.servings || null,
    prep_time_minutes: input.prep_time_minutes || null,
    cook_time_minutes: input.cook_time_minutes || null,
    source_story: input.source_story || null,
    tags: input.tags || []
  })
  .select()
  .single();
```

### Anti-Patterns to Avoid
- **`window.location.href` in React Native:** Crashes on native. Use `router.push()` or `router.replace()` from expo-router instead.
- **Props-based route params in expo-router:** Route components receive params via `useLocalSearchParams()`, not via props. The `{ params: { id } }` pattern is from Next.js, not expo-router.
- **Nesting `supabase.rpc()` inside `.update()` value:** RPC calls return promises, not values. They cannot be used as field values in an update object.
- **`<div>` and HTML elements in React Native:** Must use `<View>`, `<Text>`, `<TouchableOpacity>` etc. Files using `<div>` with className will not render on native.
- **Creating own Supabase client when singleton exists:** `scan-draft-service.ts` creates its own client instead of importing from `@/lib/supabase`. This can cause auth state mismatch.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Scan job retry with backoff | Fix broken `retryScanJob` in scan-service.ts | `RetryRecoveryService.retryJob()` from retry-recovery-service.ts | Already implements exponential backoff, jitter, subscription-aware limits, error classification, retry history tracking |
| Auth user ID retrieval | Custom `getCurrentUserId()` returning null | `supabase.auth.getUser()` pattern already used in the same file | Matches project convention, handles session state properly |

**Key insight:** Every fix in this phase has an established pattern elsewhere in the codebase. The bugs exist because the scan module was written with web assumptions (window.location, div/className) and placeholder stubs (getCurrentUserId returning null) that were never wired up.

## Common Pitfalls

### Pitfall 1: Column Name Mismatch in convertToRecipe
**What goes wrong:** The `convertToRecipe` method in `scan-draft-service.ts` inserts into the `recipes` table using 4 wrong column names: `user_id` (should be `owner_user_id`), `instructions` (should be `steps`), `status: 'published'` (column does not exist), `scan_draft_id` (column does not exist).
**Why it happens:** The scan module was written assuming a different schema than what Phase 1/2 migrations actually created.
**How to avoid:** Compare every column name against the actual migration files and the established `createRecipe` function in `src/features/recipes/api.ts`.
**Warning signs:** Supabase error `column "X" of relation "recipes" does not exist` at runtime.

### Pitfall 2: Inverted mapScoreToStatus Logic
**What goes wrong:** `mapScoreToStatus` in `scan-draft-service.ts` returns `'needs_enhancement'` for high scores (>= 0.8) and `'ready'` for low scores (< 0.5). This is backwards -- high confidence should mean "ready" and low confidence should mean "needs enhancement".
**Why it happens:** Logic inversion during implementation.
**How to avoid:** The correct mapping: high score >= 0.8 -> 'ready', medium 0.5-0.8 -> 'needs_review', low < 0.5 -> 'needs_enhancement'.
**Warning signs:** High-confidence drafts showing as "needs enhancement" and low-confidence drafts showing as "ready".

### Pitfall 3: DraftEditor Uses HTML Elements
**What goes wrong:** `DraftEditor.tsx` renders `<div>`, `<input>`, `<textarea>`, `<button>` with CSS className strings. These do not render on React Native.
**Why it happens:** Component was written for web, not cross-platform React Native.
**How to avoid:** The scope of this phase is to fix the `window.location.href` navigation calls. Full conversion to React Native components is a larger task. Focus on the navigation fix per phase success criteria. However, note that this component will not render correctly on native until fully converted.
**Warning signs:** Blank screen or crash when navigating to draft editor on native.

### Pitfall 4: ScanDraftService Creates Own Supabase Client
**What goes wrong:** `scan-draft-service.ts` creates its own Supabase client with `createClient()` using `EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY` (or anon key fallback). This bypasses the shared client's auth state, potentially causing RLS issues.
**Why it happens:** Service was written independently without using the project's shared Supabase instance.
**How to avoid:** Import from `@/lib/supabase` like all other services do. The shared client handles auth state automatically.
**Warning signs:** "Not authenticated" or RLS policy violation errors even when user is logged in.

### Pitfall 5: subscribeToUserJobs Filter Breaks with Null
**What goes wrong:** `subscribeToUserJobs` calls `getCurrentUserId()` synchronously to build the Postgres changes filter. Since it returns null, the filter becomes `user_id=eq.null` which matches nothing.
**Why it happens:** Realtime subscriptions need a synchronous user ID at subscription time, but the auth getUser() call is async.
**How to avoid:** Make `subscribeToUserJobs` accept a `userId` parameter instead of calling `getCurrentUserId()`. The caller (component) already has the user ID from the auth context.
**Warning signs:** "Connected to user scan jobs" logs but no real-time updates ever fire.

## Code Examples

Verified patterns from the actual codebase:

### Fix 1: getCurrentUserId -- Replace with Standard Auth Pattern
```typescript
// BROKEN (scan-service.ts:240-244):
function getCurrentUserId(): string | null {
  return null; // Always returns null
}

// FIX: Remove getCurrentUserId entirely.
// Make subscribeToUserJobs accept userId as parameter:
export function subscribeToUserJobs(
  userId: string,  // Caller provides from auth context
  callback: (job: ScanJob) => void
) {
  const channel = supabase
    .channel('user_scan_jobs')
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'scan_jobs',
        filter: `user_id=eq.${userId}`
      },
      (payload) => {
        if (payload.eventType === 'UPDATE' && payload.new) {
          callback(payload.new as ScanJob);
        }
      }
    )
    .subscribe();

  return channel;
}
```

### Fix 2: getUserScanJobs -- Add User Filter
```typescript
// BROKEN (scan-service.ts:86-94): No user filter, returns ALL jobs
export async function getUserScanJobs(): Promise<ScanJob[]> {
  const { data, error } = await supabase
    .from('scan_jobs')
    .select('*')
    .order('created_at', { ascending: false });
  // ...
}

// FIX: Add auth + user_id filter (matches createMultiPhotoScanJob pattern)
export async function getUserScanJobs(): Promise<ScanJob[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('scan_jobs')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });
  // ...
}
```

### Fix 3: retryScanJob -- Replace with RetryRecoveryService
```typescript
// BROKEN (scan-service.ts:123-135): supabase.rpc() nested inside .update() value
export async function retryScanJob(jobId: string): Promise<void> {
  const { error } = await supabase
    .from('scan_jobs')
    .update({
      status: 'queued',
      error_message: null,
      retry_count: supabase.rpc('increment_retry_count', { job_id: jobId })
      // ^ This is a Promise, not a value. Will set retry_count to "[object Promise]"
    })
    .eq('id', jobId)
    .eq('status', 'failed');
}

// FIX: Delegate to RetryRecoveryService or do two-step (get auth, then update):
import { RetryRecoveryService } from '@/lib/scan/retry-recovery-service';

export async function retryScanJob(jobId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const result = await RetryRecoveryService.retryJob(jobId, user.id);
  if (!result.success) {
    throw new Error(result.message);
  }
}
```

### Fix 4: draft/[id].tsx -- Use useLocalSearchParams
```typescript
// BROKEN (app/(scan)/draft/[id].tsx):
interface DraftReviewScreenProps {
  params: { id: string };
}
export default function DraftReviewScreen({ params }: DraftReviewScreenProps) {
  return <DraftReview draftId={params.id} />;
}

// FIX (matches app/recipes/[id].tsx pattern):
import { useLocalSearchParams } from "expo-router";

export default function DraftReviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <DraftReview draftId={id!} />;
}
```

### Fix 5: convertToRecipe -- Correct Column Names
```typescript
// BROKEN (scan-draft-service.ts:408-423):
const { data, error } = await this.supabase
  .from('recipes')
  .insert({
    // ...
    instructions: recipeData.instructions,  // WRONG: column is "steps"
    user_id: userId,                         // WRONG: column is "owner_user_id"
    status: 'published',                     // WRONG: column does not exist
    scan_draft_id: draftId,                  // WRONG: column does not exist
    // ...
  })

// FIX (matches src/features/recipes/api.ts pattern):
const { data, error } = await this.supabase
  .from('recipes')
  .insert({
    owner_user_id: userId,                   // Correct column name
    title: recipeData.title,
    description: recipeData.description || null,
    ingredients: recipeData.ingredients,
    steps: recipeData.instructions,          // Map instructions -> steps column
    servings: recipeData.servings || null,
    prep_time_minutes: recipeData.prepTimeMinutes || null,
    cook_time_minutes: recipeData.cookTimeMinutes || null,
    tags: recipeData.tags || [],
    source_story: null,
    // Removed: status (doesn't exist), scan_draft_id (doesn't exist)
  })
```

### Fix 6: DraftEditor Navigation -- Replace window.location.href
```typescript
// BROKEN (DraftEditor.tsx:158-165):
const handleDraftConverted = useCallback((recipeId: string) => {
  window.location.href = `/recipe/${recipeId}`;  // Crashes on native
}, []);
const handleDraftDiscarded = useCallback(() => {
  window.location.href = '/scan';  // Crashes on native
}, []);

// FIX (matches app/recipes/create.tsx:195 pattern):
import { router } from "expo-router";

const handleDraftConverted = useCallback((recipeId: string) => {
  router.replace(`/recipes/${recipeId}`);  // Navigate to recipe detail
}, []);
const handleDraftDiscarded = useCallback(() => {
  router.replace('/(scan)');  // Navigate back to scan hub (explicit destination per user decision)
}, []);
```

### Fix 7: mapScoreToStatus -- Correct Inversion
```typescript
// BROKEN (scan-draft-service.ts:509-513): Logic is inverted
private mapScoreToStatus(score: number): 'ready' | 'needs_review' | 'needs_enhancement' {
  if (score >= 0.8) return 'needs_enhancement'  // High score should be 'ready'
  if (score >= 0.5) return 'needs_review'
  return 'ready'                                 // Low score should be 'needs_enhancement'
}

// FIX:
private mapScoreToStatus(score: number): 'ready' | 'needs_review' | 'needs_enhancement' {
  if (score >= 0.8) return 'ready'
  if (score >= 0.5) return 'needs_review'
  return 'needs_enhancement'
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Props-based params in route components | useLocalSearchParams() from expo-router | Expo Router v2+ | Route components never receive params as props in expo-router |
| window.location for navigation | router.push/replace from expo-router | React Native convention | window.location does not exist in native JS runtime |

**Deprecated/outdated:**
- `getCurrentUserId()` returning null: Was a placeholder that should have been replaced during Phase 3

## Open Questions

1. **DraftEditor and DraftManager HTML elements**
   - What we know: Both files use `<div>`, `<input>`, `<textarea>`, `<button>` with CSS className strings. These will not render on React Native.
   - What's unclear: Whether to fully convert these to React Native components in this phase, or just fix the navigation bugs (window.location.href).
   - Recommendation: Fix the navigation bugs (phase success criteria), then convert HTML elements to RN if time allows. The DraftManager also has `window.location.origin` in its `shareDraft` function that needs fixing. Full RN conversion of these 2 files may be warranted as a sub-task.

2. **ScanDraftService Supabase client**
   - What we know: `scan-draft-service.ts` creates its own Supabase client with `createClient()` instead of importing from `@/lib/supabase`. It even tries to use `EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY`.
   - What's unclear: Whether fixing this is in scope for this phase.
   - Recommendation: Fix when touching convertToRecipe (same file). Replace `this.supabase` with imported singleton. This eliminates potential auth state mismatch.

3. **Missing scan_draft_id column on recipes**
   - What we know: `convertToRecipe` tries to set `scan_draft_id` on the recipes table, but this column was never created in any migration.
   - What's unclear: Whether to add a migration for this column or just remove the reference.
   - Recommendation: Remove the reference. The draft already tracks its own `scan_job_id` linkage. Adding a column requires a new migration and is scope creep for a bug-fix phase.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Jest 30.2.0 + ts-jest 29.4.6 |
| Config file | `jest.config.js` (project root) |
| Quick run command | `npx jest --testPathPattern="scan" -x` |
| Full suite command | `npx jest` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SCAN-01 | getCurrentUserId returns authenticated user ID; getUserScanJobs filters by user | unit | `npx jest --testPathPattern="scan-service" -x` | No -- Wave 0 |
| SCAN-03 | convertToRecipe uses correct column names; draft/[id] loads correct draft | unit | `npx jest --testPathPattern="scan-draft-service" -x` | No -- Wave 0 |
| SCAN-04 | retryScanJob calls RPC correctly (or delegates to RetryRecoveryService) | unit | `npx jest --testPathPattern="scan-service\|retry" -x` | No -- Wave 0 |
| SCAN-04 | mapScoreToStatus returns correct status for score ranges | unit | `npx jest --testPathPattern="scan-draft-service" -x` | No -- Wave 0 |

### Sampling Rate
- **Per task commit:** `npx jest --testPathPattern="scan" -x`
- **Per wave merge:** `npx jest`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/features/scan/__tests__/scan-service.test.ts` -- covers SCAN-01, SCAN-04 (getCurrentUserId, getUserScanJobs, retryScanJob)
- [ ] `src/lib/scan/__tests__/scan-draft-service.test.ts` -- covers SCAN-03, SCAN-04 (convertToRecipe column names, mapScoreToStatus)
- [ ] Test mocks for Supabase client (auth.getUser, from().select/insert/update, rpc)

Note: Navigation fixes (useLocalSearchParams, router.replace) and HTML-to-RN conversion are UI concerns best verified manually or with integration tests. Unit tests focus on the service-layer logic fixes.

## Sources

### Primary (HIGH confidence)
- `supabase/migrations/20260203090000_phase1_foundation.sql:136-143` -- recipes table definition (owner_user_id, no status, no scan_draft_id)
- `supabase/migrations/20260203100000_phase2_recipe_crud.sql:8-17` -- recipes table added columns (steps, not instructions)
- `src/features/recipes/api.ts:21-46` -- established recipe creation pattern (owner_user_id, steps)
- `src/features/scan/scan-service.ts:240-244` -- broken getCurrentUserId returning null
- `src/features/scan/scan-service.ts:123-135` -- broken retryScanJob with nested RPC
- `src/features/scan/scan-service.ts:86-94` -- getUserScanJobs without user filter
- `src/lib/scan/scan-draft-service.ts:408-423` -- convertToRecipe with wrong column names
- `src/lib/scan/scan-draft-service.ts:509-513` -- inverted mapScoreToStatus
- `src/features/scans/DraftEditor.tsx:158-165` -- window.location.href usage
- `src/features/scans/DraftManager.tsx:108` -- window.location.origin usage
- `app/(scan)/draft/[id].tsx:4-12` -- props-based params instead of useLocalSearchParams
- `app/recipes/[id].tsx:1,29` -- established useLocalSearchParams pattern
- `src/lib/scan/retry-recovery-service.ts:80-206` -- RetryRecoveryService.retryJob implementation

### Secondary (MEDIUM confidence)
- `.planning/debug/scan-navigation-gap-analysis.md` -- navigation gap analysis from Phase 3 audit

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new libraries, all fixes use existing project dependencies
- Architecture: HIGH -- all fix patterns directly verified against existing codebase files
- Pitfalls: HIGH -- every bug verified against actual migration SQL and working code examples

**Research date:** 2026-03-02
**Valid until:** 2026-04-02 (stable -- no external dependencies changing)
