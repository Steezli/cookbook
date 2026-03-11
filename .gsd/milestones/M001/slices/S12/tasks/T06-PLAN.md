# T06: 12-remaining-screens 06

**Slice:** S12 — **Milestone:** M001

## Description

Fix two auth/session-related UAT failures: (1) scan upload "Not authenticated" blocker caused by getUser() server calls failing on expired tokens, and (2) iOS sign-out double render flash caused by competing navigation paths.

Purpose: Unblock scan-to-draft flow (blocker) and fix sign-out UX (cosmetic)
Output: Working scan auth + clean sign-out transition

## Must-Haves

- [ ] "Scan upload works for logged-in users even after 1+ hour session"
- [ ] "Sign out on iOS transitions cleanly to login without double flash"

## Files

- `src/features/scan/scan-service.ts`
- `app/(tabs)/profile.tsx`
- `app/(auth)/logout.tsx`
