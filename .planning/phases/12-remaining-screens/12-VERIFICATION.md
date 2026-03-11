---
phase: 12-remaining-screens
verified: 2026-03-10T23:30:00Z
status: human_needed
score: 10/10 must-haves verified
re_verification:
  previous_status: passed
  previous_score: 7/7
  gaps_closed:
    - "Signup screen shows 'Already have an account? Sign In' inline text link (not bordered button)"
    - "Collection detail remove/delete confirmations work on web via window.confirm"
    - "create_family_invite and accept_family_invite RPCs can call gen_random_bytes without error"
    - "Unit preference toggle affects legacy plain-text ingredients on recipe detail and cook mode"
    - "DraftReview waits for edge function job completion before showing Draft not found"
    - "DraftReview has polling fallback (4s interval) alongside Supabase Realtime subscription"
    - "Forgot password emails link to production URL (Supabase Dashboard Site URL updated)"
  gaps_remaining: []
  regressions: []
human_verification:
  - test: "Open a family detail page, tap Invite Members, enter an email address and submit."
    expected: "Invite succeeds (no gen_random_bytes error). Family invite email delivered."
    why_human: "Requires the search_path migration to be confirmed live on remote Supabase (deployed per 12-11-SUMMARY.md but not re-UAT-tested)."
  - test: "On iOS, wait 60+ minutes after logging in, then scan a photo."
    expected: "Upload succeeds. DraftReview shows 'Processing your scan...' then loads the draft. No 'Not authenticated' error."
    why_human: "Token expiry + realtime subscription + edge function pipeline all require real device and elapsed session time."
  - test: "Submit a scan on web. Watch DraftReview until draft loads."
    expected: "Shows 'Processing your scan...' with 'This usually takes 10-30 seconds'. Draft loads automatically. If websocket fails silently, polling every 4s recovers."
    why_human: "Race condition fix (subscribe-then-retry + polling fallback) requires live edge function execution to verify timing."
  - test: "Toggle unit preference from Imperial to Metric on Profile screen. Navigate to a recipe with plain-text ingredients (e.g., '2 cups flour')."
    expected: "Recipe detail and cook mode both show metric amounts immediately without restart."
    why_human: "parseIngredient fallback correctness for diverse real ingredient text formats requires live data and visual confirmation."
  - test: "Enter a valid email on forgot password screen and submit."
    expected: "Success state shown with delivery note. Reset email arrives with a link pointing to production URL (not localhost:3000)."
    why_human: "Requires live Supabase email delivery and correct URL configuration (updated in Supabase Dashboard per 12-10-SUMMARY.md)."
  - test: "Open a family detail page on iOS. Try leave family, remove a member, and delete family."
    expected: "iOS shows native Alert.alert dialogs. Web shows window.confirm. Members show display names (not 'Not Found'). All destructive actions execute on confirm."
    why_human: "Cross-platform dialog behavior and remote DB migration application require live device testing."
  - test: "Open collection detail on web. Click Remove on a recipe."
    expected: "window.confirm prompt appears asking 'Remove Recipe — Remove this recipe from the collection?'. Confirm removes the recipe from the list."
    why_human: "window.confirm behavior and DOM mutation require browser interaction."
---

# Phase 12: Remaining Screens Verification Report (3rd Verification)

**Phase Goal:** Build remaining app screens (auth, collections, family, scan, profile/settings) matching cookbook.pen designs at all 3 breakpoints with responsive layouts and token-based styling.
**Verified:** 2026-03-10T23:30:00Z
**Status:** human_needed
**Re-verification:** Yes — after Plans 10-12 gap closures (UAT round 2 gaps addressed)

## Goal Achievement

### Observable Truths

This verification covers the 7 truths from the previous verification (all passing) plus 3 new truths from Plans 10-12.

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Collections list and detail screens render correctly at all breakpoints | VERIFIED | `collections/index.tsx` (218L), `[id].tsx` (499L+), `create.tsx` (298L) — unchanged from prior verification |
| 2 | Family management screens render correctly at all breakpoints | VERIFIED | `family/index.tsx`, `family/[id].tsx` with `confirmAction`/`showAlert` — unchanged from prior verification |
| 3 | Scan upload and DraftReview wait for job completion before showing error | VERIFIED | `DraftReview.tsx`: `subscribeToJob` imported (line 15), `jobStatus` state (line 121), subscribe-then-retry logic (lines 130-231), 4s polling fallback (lines 222-231), cleanup on unmount |
| 4 | Auth screens render correctly at all breakpoints | VERIFIED | `login.tsx`, `signup.tsx` (inline Sign In link at line 359-371), `forgot-password.tsx`, `reset-password.tsx` |
| 5 | Profile/Settings and Invite screens match cookbook.pen | VERIFIED | `profile.tsx` (590L), `invite/[token].tsx` (523L) — unchanged from prior verification |
| 6 | Scan upload auth uses local session (not server-side JWT) | VERIFIED | `scan-service.ts` — unchanged from prior verification (0 getUser() calls, 4 getSession() calls) |
| 7 | Collections screen reachable from web sidebar and mobile My Recipes | VERIFIED | `_layout.tsx` TabTrigger, `WebSidebar.tsx` TabTrigger, `recipes/index.tsx` router.navigate — unchanged from prior verification |
| 8 | Signup screen shows inline "Already have an account? Sign In" text link | VERIFIED | `signup.tsx` lines 359-371: `flexDirection:'row'`, textSecondary text, accentWarm "Sign In" in `fontFamilyBodyBold` via Link, matching login screen pattern |
| 9 | Collection detail remove/delete confirmations work on web | VERIFIED | `collections/[id].tsx` lines 48-67: `showAlert` and `confirmAction` helpers with `Platform.OS === 'web'` branch; `handleRemoveRecipe` (line 153), `handleAddRecipe` catch (line 174) use them |
| 10 | create_family_invite and accept_family_invite RPCs find pgcrypto functions | VERIFIED | `supabase/migrations/20260310100000_fix_rpc_search_path.sql`: `ALTER FUNCTION public.create_family_invite(uuid, text) SET search_path = public, extensions`; same for accept_family_invite; `NOTIFY pgrst, 'reload schema'` |
| 11 | Unit preference affects legacy plain-text ingredients on recipe detail and cook mode | VERIFIED | `recipes/[id].tsx` line 34: `parseIngredient` imported; lines 278-284: legacy fallback guard; `cook.tsx` lines 15, 122: same import and fallback |
| 12 | DraftReview shows "Processing your scan..." state while waiting | VERIFIED | `DraftReview.tsx` line 121: `jobStatus` state; line 187: `setJobStatus('processing')`; line 282: `isProcessing` flag drives alternate loading UI |

**Score:** 10/10 new truths verified (12/12 total truths across all plans)

### Required Artifacts

#### Plans 10-12 Gap Closure Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `app/(auth)/signup.tsx` | Inline "Already have an account? Sign In" text link using accentWarm | VERIFIED | Lines 359-371: row View, textSecondary prefix, accentWarm fontFamilyBodyBold "Sign In" via Link — bordered ghost button removed |
| `app/(tabs)/collections/[id].tsx` | confirmAction/showAlert helpers; no raw Alert.alert for destructive actions | VERIFIED | Lines 48-67: helpers defined with Platform.OS branch; lines 153, 158, 174: all call sites use helpers |
| `supabase/migrations/20260310100000_fix_rpc_search_path.sql` | ALTER FUNCTION with search_path = public, extensions | VERIFIED | Both RPCs altered; NOTIFY pgrst reload; deployed to remote per 12-11-SUMMARY.md |
| `app/(tabs)/recipes/[id].tsx` | parseIngredient import + legacy fallback in displayIngredient | VERIFIED | Line 34: import; lines 278-284: legacy fallback — only converts if parsed.amount, parsed.unit non-null and not ambiguous |
| `app/(tabs)/recipes/[id]/cook.tsx` | parseIngredient import + legacy fallback in displayIngredient | VERIFIED | Line 15: import; lines 122-128: same fallback logic |
| `src/features/scans/DraftReview.tsx` | subscribeToJob integration + processing state + polling fallback | VERIFIED | Line 15: subscribeToJob imported; lines 130-231: subscribe-then-retry with 4s polling fallback; lines 282+: processing UI copy |
| `src/features/scan/RecentScans.tsx` | New RecentScans component (234L) integrated into scan upload page | VERIFIED | 234 lines, no TODOs; imported at `app/scan/index.tsx` line 18; rendered at line 525 |

#### Original Screen Build Artifacts (Plans 01-09, all passing — no regressions detected)

| Artifact | Status | Details |
|----------|--------|---------|
| `app/(auth)/login.tsx` | VERIFIED | Unchanged; "Don't have an account? Sign Up" accentWarm link intact |
| `app/(auth)/forgot-password.tsx` | VERIFIED | `isSent` success state, delivery note, Supabase Site URL corrected (Dashboard config) |
| `app/(auth)/reset-password.tsx` | VERIFIED | `isSuccess` state, same-password detection |
| `app/(tabs)/collections/index.tsx` | VERIFIED | 218L, useBreakpoint, RecipeCard grid |
| `app/(tabs)/collections/create.tsx` | VERIFIED | 298L, centered form |
| `app/(tabs)/family/index.tsx` | VERIFIED | 372L |
| `app/(tabs)/family/[id].tsx` | VERIFIED | confirmAction/showAlert, null-safe profiles |
| `app/(tabs)/invite/[token].tsx` | VERIFIED | 523L, InviteState machine |
| `app/scan/index.tsx` | VERIFIED | subscribeToJob → DraftReview; RecentScans integrated |
| `app/(tabs)/profile.tsx` | VERIFIED | Sign-out reactive Redirect; unit preference toggle |
| `src/features/scan/scan-service.ts` | VERIFIED | 0 getUser() calls, 4 getSession() calls; subscribeToJob() exported |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `app/(tabs)/collections/[id].tsx` | `Platform.OS` → `window.confirm` / `Alert.alert` | `confirmAction` helper | VERIFIED | Lines 56-67: Platform.OS === 'web' branch; lines 153, 174: all destructive calls routed through helper |
| `app/(auth)/signup.tsx` | `/(auth)/login` | `Link href` in "Already have an account? Sign In" | VERIFIED | Lines 364-370: Link with pathname '/(auth)/login', params { next }; accentWarm Text "Sign In" |
| `supabase/migrations/20260310100000_fix_rpc_search_path.sql` | `public.create_family_invite` | `ALTER FUNCTION...SET search_path = public, extensions` | VERIFIED | Line 5: `ALTER FUNCTION public.create_family_invite(uuid, text) SET search_path = public, extensions` |
| `src/features/scans/DraftReview.tsx` | `src/features/scan/scan-service.ts` | `subscribeToJob` import and call | VERIFIED | Line 15: import; line 196: `subscribeToJob(draftId, async (job) => {...})` |
| `app/(tabs)/recipes/[id].tsx` | `src/features/units/parser.ts` | `parseIngredient` import + legacy fallback | VERIFIED | Line 34: import; lines 278-283: called when `ing.amount === undefined && ing.unit === undefined` |
| `app/(tabs)/recipes/[id]/cook.tsx` | `src/features/units/parser.ts` | `parseIngredient` import + legacy fallback | VERIFIED | Line 15: import; lines 122-127: same guard and call |
| `app/scan/index.tsx` | `src/features/scan/RecentScans.tsx` | import + render | VERIFIED | Line 18: import; line 525: `<RecentScans limit={5} />` |

### Requirements Coverage

| Requirement | Source Plans | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| SCREEN-05 | 02, 07, 10 | Collections screens at all 3 breakpoints | SATISFIED | Screens built (02) + nav wired (07) + web confirmations fixed (10) |
| SCREEN-06 | 03, 08, 11 | Family management screens at all 3 breakpoints | SATISFIED | Screens built (03) + FK fix + DELETE policy + web dialogs (08) + search_path migration for invite RPC (11) |
| SCREEN-07 | 04, 06, 12 | Scan/Draft screens with photo display | SATISFIED | DraftReview built (04) + getSession auth fix (06) + subscribe-then-retry + polling fallback (12) |
| SCREEN-08 | 01, 07, 09, 10 | Auth screens at all 3 breakpoints | SATISFIED | Screens built (01) + signup visibility (07) + forgot-password success state (09) + signup Sign In inline link (10) |
| SCREEN-09 | 05, 06, 09, 11 | Profile/Settings screen | SATISFIED | Profile built (05) + clean sign-out (06) + unit preference useFocusEffect (09) + legacy ingredient fallback (11) |
| SCREEN-10 | 03, 11 | Invite screen | SATISFIED | `invite/[token].tsx` 523L (03); accept_family_invite RPC search_path fixed (11) — invite acceptance now unblocked |

No orphaned requirements. All 6 IDs from REQUIREMENTS.md Phase 12 are satisfied and checked off.

### Unplanned Commit

Commit `4e4b90e` ("fix(scan): add polling fallback for draft review + Recent Scans list") was not captured in any plan summary but is a substantive improvement:

- **DraftReview polling:** 4s interval fallback alongside Supabase Realtime subscription — prevents silent websocket failures from causing indefinite "processing" state
- **RecentScans component:** 234-line component matching cookbook.pen design (thumbnail, recipe name, status dot), integrated into scan upload page with responsive layout

Both additions are production-quality (no TODOs, no stubs, proper cleanup with `clearInterval`). This commit strengthens SCREEN-07 coverage.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| None found in Plans 10-12 artifacts | — | — | — | — |

No TODO/FIXME/PLACEHOLDER patterns in any new or modified file from Plans 10-12 or commit `4e4b90e`.

### Commit Verification

All Plan 10-12 commits confirmed in git history:

| Commit | Plan | Change |
|--------|------|--------|
| `cb89bfd` | 10 | Signup inline text link + collection web-compatible alerts |
| `ec8d753` | 11 | RPC search_path migration + parseIngredient fallback for legacy ingredients |
| `cd7f91f` | 12 | DraftReview subscribe-then-retry for scan draft race condition |
| `4e4b90e` | (unplanned) | DraftReview polling fallback + RecentScans component |

### Human Verification Required

#### 1. Family Invite Creation (Post-Migration)

**Test:** Open a family detail page, tap "Invite Members", enter an email address and submit.
**Expected:** Invite creation succeeds (no "gen_random_bytes does not exist" error). Family invite email delivered to the address.
**Why human:** The search_path migration was deployed to remote Supabase per 12-11-SUMMARY.md, but this UAT test was not re-run after deployment. Needs a live device test to confirm the RPC now works end-to-end.

#### 2. Scan Upload Race Condition Fix (iOS, Extended Session)

**Test:** On iOS, wait 60+ minutes after logging in, then select a photo and upload a scan.
**Expected:** Upload succeeds (no "Not authenticated"). DraftReview shows "Processing your scan..." with "This usually takes 10-30 seconds". Draft loads automatically when the edge function completes.
**Why human:** Token expiry scenario + Realtime subscription + edge function pipeline all require real device with real elapsed session time. Cannot verify programmatically.

#### 3. Scan Draft Race Condition Fix (Web, Polling Fallback)

**Test:** Submit a scan on web and observe DraftReview. Optionally use browser devtools to block WebSocket connections to verify polling fallback.
**Expected:** Processing state shown. Draft loads automatically (via Realtime or 4s poll). 60s timeout shown if processing stalls.
**Why human:** Live edge function execution and Realtime/polling interaction require a running environment.

#### 4. Unit Preference on Legacy Ingredients

**Test:** Toggle unit preference from Imperial to Metric on Profile screen. Navigate to a recipe with ingredients stored as plain text (e.g., "2 cups flour"). Open cook mode.
**Expected:** Both recipe detail and cook mode show "473 ml flour" (or equivalent metric display), not "2 cups flour".
**Why human:** Correct parseIngredient output for diverse real ingredient text formats requires live data. Whether test recipes have parseable ingredients is a data concern, not a code concern.

#### 5. Forgot Password Production URL

**Test:** Enter a valid email on the forgot password screen and submit.
**Expected:** Success state shown with "may take a few minutes" note. Reset email arrives with a link pointing to the production URL (not localhost:3000).
**Why human:** Requires live Supabase email delivery and confirmation that the Dashboard Site URL was correctly updated (documented in 12-10-SUMMARY.md as a user action but not independently verifiable in code).

#### 6. Collection Detail Remove on Web

**Test:** Open a collection detail page on web. Click Remove next to a recipe.
**Expected:** `window.confirm` dialog appears ("Remove Recipe — Remove this recipe from the collection?"). Clicking OK removes the recipe from the list. No silent failure.
**Why human:** `window.confirm` dialog behavior and actual list update require browser interaction to confirm.

#### 7. Family Detail Destructive Actions (iOS and Web)

**Test:** Open a family detail page on iOS and web. Try leave family, remove a member, delete family.
**Expected:** iOS: native Alert.alert dialogs. Web: window.confirm dialogs. Members show display names (not "Not Found"). All actions execute correctly on confirm.
**Why human:** Requires the family_memberships FK migration to be confirmed applied to remote Supabase. Cross-platform dialog behavior needs live device testing.

### Gaps Summary

No code gaps remain. All UAT gaps from rounds 1 and 2 have been addressed:

**Round 1 (Plans 06-09):**
1. Scan auth "Not authenticated" — Fixed (getSession in scan-service.ts)
2. iOS sign-out double flash — Fixed (removed duplicate router.replace)
3. Forgot password CORS/404 — Fixed (edge function deployed; success state added)
4. Collections unreachable — Fixed (TabTrigger in _layout.tsx + WebSidebar)
5. Signup button not visible — Fixed (accentWarm text link on login screen)
6. Family detail failures — Fixed (FK migration, DELETE RLS, web-compatible dialogs)
7. Unit preference no effect — Fixed (useFocusEffect + cook.tsx displayIngredient)

**Round 2 (Plans 10-12 + commit 4e4b90e):**
8. Signup "Sign In Instead" unclear — Fixed (inline text link in accentWarm)
9. Collection remove no prompt on web — Fixed (confirmAction/showAlert in collections/[id].tsx)
10. Family invite gen_random_bytes error — Fixed (search_path migration adding extensions schema)
11. Unit preference ignores legacy ingredients — Fixed (parseIngredient fallback in displayIngredient)
12. Scan draft "Draft not found" race condition — Fixed (subscribe-then-retry + polling fallback in DraftReview)
13. Forgot password bad link URL — Fixed (Supabase Dashboard Site URL updated)

All code changes are substantive and wired. 7 human verification items cover flows that require live infrastructure, real devices, or actual Supabase data.

---

_Verified: 2026-03-10T23:30:00Z_
_Verifier: Claude (gsd-verifier)_
_Re-verification: Previous status: passed (7/7) on 2026-03-10T12:00:00Z; Plans 10-12 added 3 new must-haves + 5 additional supporting truths; all verified._
