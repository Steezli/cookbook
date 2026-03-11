# T09: 12-remaining-screens 09

**Slice:** S12 — **Milestone:** M001

## Description

Fix forgot password flow (blocker -- edge function deployment) and unit preference reactivity (minor -- stale preference on recipe detail, missing conversion in cook mode).

Purpose: Unblock password reset (Test 3) and fix unit preference across recipe displays (Test 14)
Output: Working forgot password + reactive unit conversion

## Must-Haves

- [ ] "Forgot password submits successfully and shows confirmation state"
- [ ] "Unit preference changes take effect when navigating to a recipe"
- [ ] "Cook mode displays ingredients with unit conversion"

## Files

- `app/(auth)/forgot-password.tsx`
- `app/(tabs)/recipes/[id].tsx`
- `app/(tabs)/recipes/[id]/cook.tsx`
