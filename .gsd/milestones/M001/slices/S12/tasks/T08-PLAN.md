# T08: 12-remaining-screens 08

**Slice:** S12 — **Milestone:** M001

## Description

Fix family detail page failures: iOS "Not Found" error (caused by PostgREST failing to resolve profiles join), web leave button silently failing (Alert.alert unreliable on React Native Web), missing DELETE RLS policy on families table, and create_family_invite RPC 404.

Purpose: Unblock family management (blocker, Tests 8 and 9)
Output: Working family detail with member list, leave/delete actions, and invite creation

## Must-Haves

- [ ] "Family detail page loads members with display names on iOS and web"
- [ ] "Leave family button works on web"
- [ ] "Delete family works for admin members"
- [ ] "Invite creation succeeds (create_family_invite RPC accessible)"

## Files

- `supabase/migrations/20260310000000_fix_family_memberships.sql`
- `app/(tabs)/family/[id].tsx`
