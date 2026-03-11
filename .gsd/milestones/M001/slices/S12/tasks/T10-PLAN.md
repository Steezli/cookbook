# T10: 12-remaining-screens 10

**Slice:** S12 — **Milestone:** M001

## Description

Fix three UAT gaps: replace signup "Sign In Instead" bordered button with inline text link (Test 2), add web-compatible confirm dialogs to collection detail (Test 6), and configure Supabase Dashboard Site URL (Test 3). Also re-verify collections list on web after hard refresh (Test 7 — no code change needed).

Purpose: Close 4 UAT gaps (Tests 2, 3, 6, 7) with minimal targeted changes.
Output: Updated signup.tsx, collections/[id].tsx, and Supabase dashboard configuration.

## Must-Haves

- [ ] "Signup screen shows 'Already have an account? Sign In' as an inline text link, not a bordered button"
- [ ] "Collection detail remove/delete confirmations work on web via window.confirm"
- [ ] "Collections list screen is accessible on web with create button visible"

## Files

- `app/(auth)/signup.tsx`
- `app/(tabs)/collections/[id].tsx`
