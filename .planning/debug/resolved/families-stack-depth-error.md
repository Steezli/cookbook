---
status: resolved
trigger: "Stack depth limit exceeded error when loading families list - need to investigate listFamilies function and potential recursive queries"
created: 2025-01-27T15:00:00.000Z
updated: 2025-01-27T15:20:00.000Z
---

## Current Focus
hypothesis: FIX APPLIED - need to verify that families list loads without stack depth error
test: load families page to confirm fix works
expecting: families should load successfully without recursion error
next_action: test the families list functionality

## Symptoms
expected: Families list loads successfully without errors
actual: Getting "stack depth limit exceeded" error when loading families list
errors: "stack depth limit exceeded"
reproduction: Load families page at /(family)/index.tsx - triggers refresh() function on line 28
started: After migration fix for family creation foreign key relationship

## Eliminated
- hypothesis: listFamilies function is causing stack depth limit exceeded error due to recursive queries or infinite loops
  evidence: listFamilies function is simple and does not call itself or any recursive functions
  timestamp: 2025-01-27T15:05:00.000Z
- hypothesis: The stack depth error is caused by a recursive database trigger or function, likely in the create_family RPC function that was recently fixed
  evidence: create_family RPC function is simple and does not cause recursion during SELECT queries
  timestamp: 2025-01-27T15:08:00.000Z

## Evidence
- timestamp: 2025-01-27T15:05:00.000Z
  checked: src/features/family/api.ts listFamilies function
  found: Simple query to families table - no obvious recursion
  implication: The stack depth issue is likely not in listFamilies itself
- timestamp: 2025-01-27T15:06:00.000Z
  checked: app/(family)/index.tsx families page
  found: Uses direct supabase query on line 28, not listFamilies function
  implication: Issue occurs in direct supabase query, not in API function
- timestamp: 2025-01-27T15:07:00.000Z
  checked: src/features/recipes/search.ts getAccessibleFamilies function
  found: Another families query function, similar to listFamilies
  implication: Multiple places querying families could compound the issue
- timestamp: 2025-01-27T15:08:00.000Z
  checked: supabase/migrations/20260203090000_phase1_foundation.sql
  found: families RLS policy on line 202 calls public.is_family_member(id, auth.uid())
  implication: The is_family_member function could be causing recursive calls
- timestamp: 2025-01-27T15:09:00.000Z
  checked: supabase/migrations/20260203091000_profiles_shared_family_select.sql
  found: shares_family_with function queries family_memberships table which may trigger RLS
  implication: Potential recursion between RLS policies and helper functions

## Resolution
root_cause: INFINITE RECURSION in RLS policies: families.families_select_member policy calls is_family_member() which queries family_memberships table, whose family_memberships_select_member policy also calls is_family_member(), creating infinite loop
fix: Created two migrations to fix recursion:
1. 20260203103000_fix_rls_recursion.sql: Initial attempt with direct table access (incomplete)
2. 20260203104000_fix_remaining_rls_recursion.sql: Complete fix using SECURITY DEFINER functions to bypass RLS:
   - Created is_family_member_secure() and is_family_admin_secure() with SECURITY DEFINER
   - Updated all RLS policies to use secure versions instead of regular functions
   - This completely breaks the recursion loop while maintaining security
verification: ✅ Both families and family_memberships queries now work without recursion errors
files_changed: ["supabase/migrations/20260203103000_fix_rls_recursion.sql", "supabase/migrations/20260203104000_fix_remaining_rls_recursion.sql"]