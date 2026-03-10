---
status: testing
phase: 12-remaining-screens
source: [12-01-SUMMARY.md, 12-02-SUMMARY.md, 12-03-SUMMARY.md, 12-04-SUMMARY.md, 12-05-SUMMARY.md]
started: 2026-03-08T23:10:00Z
updated: 2026-03-09T00:00:00Z
---

## Current Test
<!-- OVERWRITE each test - shows where we are -->

number: 2
name: Signup Screen Fields
expected: |
  Signup screen shows Full Name, Email, Password, and Confirm Password fields plus social login buttons. Responsive layout matches login screen pattern.
awaiting: user response (paused)

## Tests

### 1. Login Screen Layout & Social Buttons
expected: Login screen shows email/password fields and three social login buttons (Google, Apple, Facebook). On mobile: full-screen layout. On tablet: centered card. On web: split hero+form layout.
result: pass

### 2. Signup Screen Fields
expected: Signup screen shows Full Name, Email, Password, and Confirm Password fields plus social login buttons. Responsive layout matches login screen pattern.
result: [pending]

### 3. Forgot Password with Success State
expected: Forgot password screen shows email field and submit button. After submitting, screen changes to a success/confirmation state indicating email was sent.
result: [pending]

### 4. Collection List Responsive Grid
expected: Collections screen shows your collections in a grid. 1 column on mobile, 2 on tablet, 3 on web. Empty state shown if no collections exist.
result: [pending]

### 5. Collection Detail with Recipe Cards
expected: Tapping a collection shows its recipes as visual cards with thumbnail images in a responsive grid. Can add/remove recipes. Remove shows a confirmation dialog.
result: [pending]

### 6. Create Collection Form
expected: Create collection screen shows a form. On mobile: full-width. On tablet/web: centered with max-width (~600px).
result: [pending]

### 7. Family List & Create Family
expected: Family screen shows families in a grid (2-column on tablet/web). Has a create family form (collapsible). Empty state with CTA if no families.
result: [pending]

### 8. Family Detail & Invite Sharing
expected: Family detail shows members with avatar initials (colored circles with letters) and role badges (admin=green pill, member=gray pill). Share/invite button opens native share sheet. Destructive actions (remove member, leave, delete) show confirmation alerts.
result: [pending]

### 9. Invite Acceptance Screen
expected: Opening an invite link shows a centered card (on tablet/web). If logged in: can join directly. If not logged in: redirected to signup/login with invite token preserved.
result: [pending]

### 10. Scan Upload Screen
expected: Scan screen shows camera and photo library options for uploading. Camera option hidden on web. After selecting a photo, shows preview and upload progress.
result: [pending]

### 11. Draft Review - Mobile Collapsible Photo
expected: On mobile, draft review shows the scanned photo at the top (~300px). When scrolling down through recipe fields, photo collapses to a small thumbnail (~60px).
result: [pending]

### 12. Draft Review - Tablet/Web Side-by-Side
expected: On tablet/web, draft review shows photo panel on the left (~40% width) and recipe fields on the right (~60% width) in a side-by-side layout.
result: [pending]

### 13. Profile Avatar & Display Name Editing
expected: Profile screen shows avatar with initials derived from display name. Tapping edit on the name opens inline text input with save/cancel buttons. Saving persists the new name.
result: [pending]

### 14. Unit Preference Toggle
expected: Profile screen has a segmented control to switch between Imperial and Metric units. Selection updates immediately (optimistic).
result: [pending]

### 15. Sign Out
expected: Profile screen has a sign-out button with destructive styling (coral/red tone). Tapping it signs out and redirects to auth/login screen.
result: [pending]

## Summary

total: 15
passed: 1
issues: 0
pending: 14
skipped: 0

## Gaps

[none yet]
