---
status: diagnosed
phase: 12-remaining-screens
source: [12-01-SUMMARY.md, 12-02-SUMMARY.md, 12-03-SUMMARY.md, 12-04-SUMMARY.md, 12-05-SUMMARY.md, 12-06-SUMMARY.md, 12-07-SUMMARY.md, 12-08-SUMMARY.md, 12-09-SUMMARY.md]
started: 2026-03-10T12:00:00Z
updated: 2026-03-10T12:30:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Login Screen Layout & Social Buttons
expected: Login screen shows email/password fields and three social login buttons (Google, Apple, Facebook). Below the Sign In button, there's a "Don't have an account? Sign Up" text link with the "Sign Up" portion in warm/accent color. Responsive: mobile=full-screen, tablet=centered card, web=split hero+form.
result: pass

### 2. Signup Screen Fields & Visibility
expected: Tapping "Sign Up" link on login navigates to signup. Signup screen shows Full Name, Email, Password, and Confirm Password fields plus social login buttons. Responsive layout matches login screen pattern.
result: issue
reported: "mostly a pass but we have a similar ui concern with the 'sign in instead' as the previous sign up so we should make that a more clear option to switch back to sign in if someone wants"
severity: minor

### 3. Forgot Password with Success State
expected: Forgot password screen shows email field and submit button. After submitting a valid email, screen changes to success/confirmation state indicating email was sent with a "may take a few minutes" note.
result: issue
reported: "screen looks good on ios and web but requesting reset via ios email me a bad link which looks toward port 3000."
severity: major

### 4. Collections Accessible from Navigation
expected: On web, clicking "Collections" in sidebar navigates to collections screen (active state highlights). On mobile/iOS, "My Collections" row is visible on the My Recipes screen with a folder icon and chevron — tapping it navigates to collections. Mobile tab bar stays at 5 tabs.
result: pass

### 5. Collection List Responsive Grid
expected: Collections screen shows your collections in a grid. 1 column on mobile, 2 on tablet, 3 on web. Empty state shown if no collections exist.
result: pass

### 6. Collection Detail with Recipe Cards
expected: Tapping a collection shows its recipes as visual cards with thumbnail images in a responsive grid. Can add/remove recipes. Remove shows a confirmation dialog.
result: issue
reported: "pass on ios. on web, I can add but cannot seemingly when clicking remove, I get no are you sure prompt or see anything happen, including no logs"
severity: major

### 7. Create Collection Form
expected: Create collection screen shows a form. On mobile: full-width. On tablet/web: centered with max-width (~600px).
result: issue
reported: "pass on ios. on web, there is no create collection button or clicking on collections in the sidebar loads me straight into the first avail collection, I can not tell."
severity: major

### 8. Family List & Create Family
expected: Family screen shows families in a grid (2-column on tablet/web). Has a create family form (collapsible). Empty state with CTA if no families.
result: pass

### 9. Family Detail & Member Management
expected: Family detail loads and shows members with avatar initials (colored circles with letters) and role badges (admin=green pill, member=gray pill). Share/invite button opens native share sheet (or clipboard fallback). Destructive actions (remove member, leave, delete) show confirmation dialogs that work on both web (window.confirm) and iOS (Alert.alert).
result: issue
reported: "invite members and delete family still fails to work. invite returns 'invite failed. failed to create invite' error on ios. the response error on web is code 42883 details null hint 'No function matches the given name and argument types. You might need to add explicit type casts.' message 'function gen_random_bytes(integer) does not exist', from POST /rpc/create_family_invite. same delete failures on web as well"
severity: blocker

### 10. Invite Acceptance Screen
expected: Opening an invite link shows a centered card (on tablet/web). If logged in: can join directly. If not logged in: redirected to signup/login with invite token preserved.
result: skipped
reason: Invite system broken — create_family_invite RPC fails (blocked by Test 9)

### 11. Scan Upload Screen
expected: Scan screen shows camera and photo library options for uploading. Camera option hidden on web. After selecting a photo, shows preview and upload progress. No "Not authenticated" errors even after extended sessions.
result: issue
reported: "when submitting a scan i am see 'Error Loading Draft Draft not found'. Same error on both web and ios"
severity: blocker

### 12. Draft Review - Mobile Collapsible Photo
expected: On mobile, draft review shows the scanned photo at the top (~300px). When scrolling down through recipe fields, photo collapses to a small thumbnail (~60px).
result: skipped
reason: Scan upload leads to draft not found error (blocked by Test 11)

### 13. Draft Review - Tablet/Web Side-by-Side
expected: On tablet/web, draft review shows photo panel on the left (~40% width) and recipe fields on the right (~60% width) in a side-by-side layout.
result: skipped
reason: Scan upload leads to draft not found error (blocked by Test 11)

### 14. Profile Avatar & Display Name Editing
expected: Profile screen shows avatar with initials derived from display name. Tapping edit on the name opens inline text input with save/cancel buttons. Saving persists the new name.
result: pass

### 15. Unit Preference Affects Recipes
expected: Profile screen has a segmented control to switch between Imperial and Metric units. After toggling, navigate to a recipe detail — ingredients should display in the newly selected unit system. Cook mode also shows converted units.
result: issue
reported: "unit preference is still saving in the settings but have 0 effect on the actual recipe displays"
severity: major

### 16. Sign Out (Clean Transition)
expected: Profile screen has a sign-out button with destructive styling (coral/red tone). Tapping it signs out and redirects to auth/login screen with a single clean transition (no double-flash on iOS).
result: pass

## Summary

total: 16
passed: 6
issues: 7
pending: 0
skipped: 3

## Gaps

- truth: "Signup screen has clear 'Sign In Instead' link matching login screen pattern"
  status: failed
  reason: "User reported: sign in instead link not visible/clear enough, same issue as previous sign up button"
  severity: minor
  test: 2
  root_cause: "Signup screen uses full-width bordered secondary button at bottom of form for 'Sign In Instead'. Login screen already fixed to use inline text link with accentWarm. Signup needs same pattern."
  artifacts:
    - path: "app/(auth)/signup.tsx"
      issue: "Lines 359-377: bordered button at bottom; needs inline text link after Create Account button"
  missing:
    - "Replace bordered button with 'Already have an account? Sign In' text link using accentWarm, placed after Create Account button and before divider"
  debug_session: ".planning/debug/signup-signin-link-visibility.md"

- truth: "Forgot password reset link points to correct URL"
  status: failed
  reason: "User reported: requesting reset via iOS emails a bad link which points to port 3000"
  severity: major
  test: 3
  root_cause: "Supabase dashboard Site URL is set to http://localhost:3000. Supabase Auth uses this to construct all email links. Not a code bug."
  artifacts: []
  missing:
    - "Update Supabase Dashboard > Authentication > URL Configuration > Site URL to production app URL"
    - "Add berven://** and production URL to Redirect URLs allowlist"
  debug_session: ".planning/debug/forgot-password-bad-link.md"

- truth: "Collection detail remove recipe shows confirmation and works on web"
  status: failed
  reason: "User reported: on web, clicking remove shows no prompt and nothing happens, no logs"
  severity: major
  test: 6
  root_cause: "collections/[id].tsx uses Alert.alert() for confirmation which is a no-op on React Native Web. Same issue that was fixed in family/[id].tsx with confirmAction/showAlert helpers."
  artifacts:
    - path: "app/(tabs)/collections/[id].tsx"
      issue: "Lines 131, 163, 175: Alert.alert calls silently fail on web"
    - path: "app/(tabs)/family/[id].tsx"
      issue: "Lines 67-90: contains proven fix pattern (confirmAction/showAlert helpers)"
  missing:
    - "Add Platform import and confirmAction/showAlert helpers to collections/[id].tsx (or extract to shared lib/alert.ts)"
    - "Replace all Alert.alert call sites in collections/[id].tsx"
  debug_session: ".planning/debug/collection-remove-web.md"

- truth: "Collections list screen accessible on web with create collection option"
  status: failed
  reason: "User reported: on web, no create collection button visible, or sidebar loads straight into first collection instead of list"
  severity: major
  test: 7
  root_cause: "No code defect found. All routing and layout files are correctly wired. Likely stale browser cache from before 12-07 fixes were applied."
  artifacts: []
  missing:
    - "Re-verify after hard refresh (Cmd+Shift+R) or incognito window"
  debug_session: ".planning/debug/collections-web-list.md"

- truth: "Family invite creation and family deletion work on all platforms"
  status: failed
  reason: "User reported: create_family_invite RPC returns 42883 'function gen_random_bytes(integer) does not exist'. Delete family also fails on web."
  severity: blocker
  test: 9
  root_cause: "create_family_invite and accept_family_invite RPCs use 'set search_path = public' but pgcrypto extension is installed in 'extensions' schema (Supabase default). gen_random_bytes() and digest() are not findable."
  artifacts:
    - path: "supabase/migrations/20260203090000_phase1_foundation.sql"
      issue: "Lines 331, 366: set search_path = public — missing extensions schema"
  missing:
    - "Create migration to ALTER FUNCTION create_family_invite and accept_family_invite SET search_path = public, extensions"
    - "Verify DELETE RLS policy on families was applied to remote DB"
  debug_session: ".planning/debug/family-invite-rpc-failure.md"

- truth: "Scan upload completes and navigates to draft review"
  status: failed
  reason: "User reported: submitting scan shows 'Error Loading Draft Draft not found' on both web and iOS"
  severity: blocker
  test: 11
  root_cause: "Race condition: app navigates to /scan/draft/{jobId} immediately after upload creates scan_jobs record (status: queued), but scan_drafts row is created asynchronously by edge function pipeline (queue-worker -> process-scan-job -> OCR -> AI parse -> INSERT). DraftReview queries once on mount with no polling/retry/realtime subscription."
  artifacts:
    - path: "app/scan/index.tsx"
      issue: "Line 132: navigates to draft screen immediately after upload, before processing"
    - path: "src/features/scans/DraftReview.tsx"
      issue: "Lines 127-136: single-shot query, no wait/poll/retry logic"
    - path: "src/features/scan/scan-service.ts"
      issue: "Line 179: subscribeToJob() exists but is unused in draft review flow"
  missing:
    - "Add processing/waiting state to DraftReview that uses subscribeToJob() to wait for job completion before querying draft"
  debug_session: ".planning/debug/scan-draft-not-found.md"

- truth: "Unit preference toggle affects recipe ingredient display"
  status: failed
  reason: "User reported: unit preference saves in settings but has zero effect on actual recipe displays"
  severity: major
  test: 15
  root_cause: "Data gap: useFocusEffect and displayIngredient wiring is correct, but legacy recipes store ingredients as bare {text, sort_order} JSONB with no amount/unit fields. displayIngredient guard (ing.amount !== undefined) fails for these, so displayAmount is never called."
  artifacts:
    - path: "app/(tabs)/recipes/[id].tsx"
      issue: "Lines 261-278: displayIngredient skips legacy ingredients with no amount/unit"
    - path: "app/(tabs)/recipes/[id]/cook.tsx"
      issue: "Lines 114-120: same guard, same skip"
    - path: "src/features/recipes/types.ts"
      issue: "Lines 7-10: amount/unit/original_text/is_ambiguous all optional"
  missing:
    - "Add runtime fallback in displayIngredient: when amount/unit undefined, call parseIngredient(ing.text) on the fly for conversion"
    - "Apply same change to both [id].tsx and cook.tsx"
  debug_session: ".planning/debug/unit-preference-no-effect-v2.md"
