---
status: diagnosed
trigger: "Investigate family detail page failures - iOS error modal, web leave button, member add 400/404"
created: 2026-03-10T00:00:00Z
updated: 2026-03-10T00:00:00Z
---

## Current Focus

hypothesis: Multiple independent root causes across 5 reported issues
test: Code and schema analysis
expecting: Identify each root cause
next_action: Report findings

## Symptoms

expected: Family detail page loads family data, leave button works, invite creation works
actual: iOS shows "Not Found" error modal; web leave does nothing; web add member gets 400 on memberships query and 404 on create_family_invite RPC
errors: GET family_memberships?select=user_id,role,profiles(email,display_name) -> 400; POST rpc/create_family_invite -> 404
reproduction: Load any family detail page on iOS; click leave on web; try to add member on web
started: Phase 12

## Eliminated

(none)

## Evidence

- timestamp: 2026-03-10T00:01:00Z
  checked: family_memberships table schema (phase1_foundation.sql)
  found: family_memberships.user_id references auth.users(id), NOT public.profiles(user_id). PostgREST cannot resolve `profiles(email,display_name)` as an embedded resource because there is no FK from family_memberships to profiles.
  implication: The 400 error on the memberships query is caused by PostgREST not finding a relationship path for the `profiles()` join.

- timestamp: 2026-03-10T00:02:00Z
  checked: create_family_invite RPC definition (phase1_foundation.sql lines 327-359)
  found: The function IS defined in the migration. It returns `table (invite_id uuid, token text, expires_at timestamptz)`. The 404 suggests PostgREST cannot find the function, which typically means (a) it was never applied to the remote Supabase instance, or (b) schema cache needs refresh, or (c) the function is not exposed via the API schema.
  implication: The RPC exists in migration code but likely was not applied to the running database, OR PostgREST schema cache is stale.

- timestamp: 2026-03-10T00:03:00Z
  checked: Family detail refresh() function ([id].tsx lines 91-142)
  found: The refresh function fetches families, family_memberships (with profiles join), and family_invites in parallel. If the family_memberships query returns a 400 error (due to the profiles join issue), memError is thrown. The catch block shows Alert.alert("Not found", msg). This is what causes the iOS error modal for ALL families, even newly created ones.
  implication: The iOS "Not Found" error is a DOWNSTREAM consequence of the 400 on the profiles join. Fix the join, fix the iOS error.

- timestamp: 2026-03-10T00:04:00Z
  checked: onLeave function ([id].tsx lines 261-286)
  found: onLeave uses Alert.alert with a confirmation dialog. On web, React Native's Alert.alert with button callbacks has known issues -- the destructive action callback may not fire. The leave logic itself (delete from family_memberships) is correct.
  implication: The web leave button silently fails because Alert.alert confirmation dialogs don't work reliably on React Native Web.

- timestamp: 2026-03-10T00:05:00Z
  checked: families table RLS policies (phase1_foundation.sql)
  found: There is NO DELETE policy on the families table. Only select, insert, and update policies exist. The onDeleteFamily function will silently fail (Supabase returns no error but deletes 0 rows when RLS blocks).
  implication: Family deletion by admin will also fail silently due to missing RLS delete policy.

## Resolution

root_cause: See detailed findings below (5 distinct issues)
fix: (research only, not applied)
verification: (not applicable)
files_changed: []
