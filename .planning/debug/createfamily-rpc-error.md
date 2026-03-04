---
status: checkpoint_reached
trigger: "Fix the createFamily RPC function error that's preventing family creation - foreign key relationship error between 'family_memberships' and 'profiles'"
created: 2026-02-03T20:36:00Z
updated: 2026-02-04T01:25:00Z
---

## Current Focus

hypothesis: FIXED - profiles RLS policy with family_memberships join was causing RLS system confusion
test: Applied fix by creating helper function shares_family_with() to eliminate direct table relationship ambiguity
expecting: Migration needs to be applied to remote Supabase to resolve the foreign key relationship error
next_action: CREATE CHECKPOINT - User must apply migration to remote Supabase

## Symptoms

expected: Family creation succeeds, returns family object
actual: "Searched for a foreign key relationship between 'family_memberships' and 'profiles' in schema 'public', but no matches were found."
errors: 
- "Searched for a foreign key relationship between 'family_memberships' and 'profiles' in schema 'public', but no matches were found."
- "Perhaps you meant 'families' instead of 'profiles'."
reproduction: Call createFamily API function
started: When RPC function was fixed but now throwing different error

## Eliminated

## Evidence

- timestamp: 2026-02-03T20:36:00Z
  checked: create_family RPC function implementation
  found: Function inserts into families table (line 315-316) and family_memberships table (line 319-320) - no references to profiles table
  implication: RPC function is correct, error is elsewhere

- timestamp: 2026-02-03T20:38:00Z
  checked: family_memberships table definition
  found: user_id column references auth.users(id), NOT profiles table
  implication: Error message about 'profiles' table is misleading - the issue is in RLS policy resolution

- timestamp: 2026-02-03T20:38:00Z
  checked: createFamily API function
  found: Minimal error handling - just throws raw error from supabase.rpc()
  implication: Need better error handling to surface the real issue

- timestamp: 2026-02-03T20:40:00Z
  checked: profiles RLS policy in migration 20260203091000_profiles_shared_family_select.sql
  found: Policy joins family_memberships to itself and references profiles.user_id in subquery (line 20)
  implication: When RPC inserts into family_memberships, RLS system tries to evaluate this policy but can't resolve relationship between family_memberships and profiles tables

- timestamp: 2026-02-03T20:40:00Z
  checked: Added enhanced error logging to createFamily API
  found: Better error handling implemented to capture full error details
  implication: Will help verify the exact error after fixing the RLS policy

## Resolution

root_cause: profiles RLS policy with family_memberships join created ambiguous table relationship reference for RLS system when create_family RPC inserted into family_memberships table
fix: Created helper function shares_family_with() to eliminate direct table relationship ambiguity in profiles policy
verification: User needs to apply migration to remote Supabase, then test family creation
files_changed: 
- src/features/family/api.ts: Added enhanced error logging for better debugging
- supabase/migrations/20260203091000_profiles_shared_family_select.sql: Fixed RLS policy using helper function

## Checkpoint Required

**Type:** human-action (apply database migration)
**Progress:** 3 evidence entries, root cause identified and fixed
**Migration file:** supabase/migrations/20260203091000_profiles_shared_family_select.sql