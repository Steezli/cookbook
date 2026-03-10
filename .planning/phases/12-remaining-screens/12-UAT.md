---
status: complete
phase: 12-remaining-screens
source: [12-01-SUMMARY.md, 12-02-SUMMARY.md, 12-03-SUMMARY.md, 12-04-SUMMARY.md, 12-05-SUMMARY.md]
started: 2026-03-08T23:10:00Z
updated: 2026-03-10T00:00:00Z
---

## Current Test
<!-- OVERWRITE each test - shows where we are -->

[testing complete]

## Tests

### 1. Login Screen Layout & Social Buttons
expected: Login screen shows email/password fields and three social login buttons (Google, Apple, Facebook). On mobile: full-screen layout. On tablet: centered card. On web: split hero+form layout.
result: pass

### 2. Signup Screen Fields
expected: Signup screen shows Full Name, Email, Password, and Confirm Password fields plus social login buttons. Responsive layout matches login screen pattern.
result: issue
reported: "on ios the sign up button is exceptionally difficult to identify, needs to be more visible/obvious/clear. Same on web."
severity: minor

### 3. Forgot Password with Success State
expected: Forgot password screen shows email field and submit button. After submitting, screen changes to a success/confirmation state indicating email was sent.
result: issue
reported: "iOS fails with 'email not found'. Web returns CORS errors: OPTIONS https://ugixgcbysrwabwzbsjxr.supabase.co/functions/v1/reset-request - CORS Preflight Did Not Succeed, status 404."
severity: blocker

### 4. Collection List Responsive Grid
expected: Collections screen shows your collections in a grid. 1 column on mobile, 2 on tablet, 3 on web. Empty state shown if no collections exist.
result: issue
reported: "On web, clicking collections in sidebar does nothing. Going directly to /collections redirects to home tab. On iOS, no way to access collections either. My Recipes page does show grid layout as described."
severity: major

### 5. Collection Detail with Recipe Cards
expected: Tapping a collection shows its recipes as visual cards with thumbnail images in a responsive grid. Can add/remove recipes. Remove shows a confirmation dialog.
result: skipped
reason: Collections screen unreachable (blocked by Test 4)

### 6. Create Collection Form
expected: Create collection screen shows a form. On mobile: full-width. On tablet/web: centered with max-width (~600px).
result: skipped
reason: Collections screen unreachable (blocked by Test 4)

### 7. Family List & Create Family
expected: Family screen shows families in a grid (2-column on tablet/web). Has a create family form (collapsible). Empty state with CTA if no families.
result: pass

### 8. Family Detail & Invite Sharing
expected: Family detail shows members with avatar initials (colored circles with letters) and role badges (admin=green pill, member=gray pill). Share/invite button opens native share sheet. Destructive actions (remove member, leave, delete) show confirmation alerts.
result: issue
reported: "iOS: loading family details shows error modal 'Not Found, Failed to load family' — even for newly created families. Web: family does get created, but leave button does nothing (no error). Adding member fails — family_memberships query returns 400, create_family_invite RPC returns 404."
severity: blocker

### 9. Invite Acceptance Screen
expected: Opening an invite link shows a centered card (on tablet/web). If logged in: can join directly. If not logged in: redirected to signup/login with invite token preserved.
result: skipped
reason: Invite system broken — create_family_invite RPC 404 (blocked by Test 8)

### 10. Scan Upload Screen
expected: Scan screen shows camera and photo library options for uploading. Camera option hidden on web. After selecting a photo, shows preview and upload progress.
result: pass

### 11. Draft Review - Mobile Collapsible Photo
expected: On mobile, draft review shows the scanned photo at the top (~300px). When scrolling down through recipe fields, photo collapses to a small thumbnail (~60px).
result: issue
reported: "iOS: selecting scan throws 'Multi-scan upload error: Not authenticated' at scan-service.ts:212 checkJobLimit. Cannot reach draft review screen."
severity: blocker

### 12. Draft Review - Tablet/Web Side-by-Side
expected: On tablet/web, draft review shows photo panel on the left (~40% width) and recipe fields on the right (~60% width) in a side-by-side layout.
result: skipped
reason: Scan upload fails with auth error — cannot reach draft review (blocked by Test 11)

### 13. Profile Avatar & Display Name Editing
expected: Profile screen shows avatar with initials derived from display name. Tapping edit on the name opens inline text input with save/cancel buttons. Saving persists the new name.
result: pass

### 14. Unit Preference Toggle
expected: Profile screen has a segmented control to switch between Imperial and Metric units. Selection updates immediately (optimistic).
result: issue
reported: "while it does work and persists, it does not affect existing recipes"
severity: minor

### 15. Sign Out
expected: Profile screen has a sign-out button with destructive styling (coral/red tone). Tapping it signs out and redirects to auth/login screen.
result: issue
reported: "pass on web. Partial pass on iOS: double render flash of the signin/up screen before landing on it after signing out"
severity: cosmetic

## Summary

total: 15
passed: 4
issues: 7
pending: 0
skipped: 4
skipped: 0

## Gaps

- truth: "Signup screen fields and social buttons visible with responsive layout matching login"
  status: failed
  reason: "User reported: on ios the sign up button is exceptionally difficult to identify, needs to be more visible/obvious/clear. Same on web."
  severity: minor
  test: 2
  artifacts: []
  missing: []

- truth: "Forgot password submits and shows success/confirmation state"
  status: failed
  reason: "User reported: iOS fails with 'email not found'. Web returns CORS errors on /functions/v1/reset-request (404, preflight failed)."
  severity: blocker
  test: 3
  artifacts: []
  missing: []

- truth: "Collections screen accessible and shows grid layout"
  status: failed
  reason: "User reported: On web, clicking collections in sidebar does nothing. /collections redirects to home tab. On iOS, no way to access collections. My Recipes page does show grid as described."
  severity: major
  test: 4
  artifacts: []
  missing: []

- truth: "Family detail shows members with avatars, role badges, share/invite, and destructive action confirmations"
  status: failed
  reason: "User reported: iOS shows 'Not Found, Failed to load family' error on detail page. Web: leave button does nothing. Add member fails — family_memberships 400, create_family_invite RPC 404."
  severity: blocker
  test: 8
  artifacts: []
  missing: []

- truth: "Draft review shows collapsible photo on mobile"
  status: failed
  reason: "User reported: iOS scan throws 'Multi-scan upload error: Not authenticated' at scan-service.ts:212 checkJobLimit. Cannot reach draft review."
  severity: blocker
  test: 11
  artifacts: []
  missing: []

- truth: "Unit preference toggle updates displayed units across the app"
  status: failed
  reason: "User reported: while it does work and persists, it does not affect existing recipes"
  severity: minor
  test: 14
  artifacts: []
  missing: []

- truth: "Sign out redirects cleanly to auth/login screen"
  status: failed
  reason: "User reported: pass on web. iOS has double render flash of signin/up screen before landing on it after signing out"
  severity: cosmetic
  test: 15
  artifacts: []
  missing: []
