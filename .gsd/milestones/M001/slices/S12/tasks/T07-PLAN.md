# T07: 12-remaining-screens 07

**Slice:** S12 — **Milestone:** M001

## Description

Fix collections routing (unreachable on all platforms) and signup button visibility. Collections screens exist but were never wired into navigation. Signup button blends into background.

Purpose: Make collections accessible (unblocks Tests 4, 5, 6) and improve auth UX (Test 2)
Output: Working collections navigation + visible signup prompt

## Must-Haves

- [ ] "Collections screen is reachable from web sidebar"
- [ ] "Collections screen is reachable from mobile via My Recipes screen"
- [ ] "Signup button is clearly visible on both iOS and web"

## Files

- `app/(tabs)/_layout.tsx`
- `src/components/nav/WebSidebar.tsx`
- `app/(tabs)/recipes/index.tsx`
- `app/(auth)/login.tsx`
