# Fix createFamily RPC Error

## Problem

When trying to create a family, you get this error:
```
Increase: configuration parameter "max_stack_depth" (currently 2048kB), after ensuring that platform's stack depth limit is adequate.
Searched for a foreign key relationship between 'family_memberships' and 'profiles' in schema 'public', but no matches were found.
details	"Searched for a foreign key relationship between 'family_memberships' and 'profiles' in schema 'public', but no matches were found."
hint	"Perhaps you meant 'families' instead of 'profiles'."
message	"Could not find a relationship between 'family_memberships' and 'profiles' in the schema cache"
```

## Root Cause

The `profiles` table's RLS policy had an ambiguous table relationship that confused Supabase's RLS system when the `create_family` RPC function tried to insert into `family_memberships`. The policy was directly joining `family_memberships` to `profiles` in a subquery, which created a circular dependency issue.

## Solution

Apply the migration file `supabase/migrations/20260203091000_profiles_shared_family_select.sql` to your remote Supabase database.

### Steps to Apply

1. **Open Supabase Dashboard**
   - Go to https://supabase.com/dashboard
   - Select your project

2. **Open SQL Editor**
   - In the left sidebar, click "SQL Editor"

3. **Apply the Migration**
   - Copy the entire contents of the migration file
   - Paste it into the SQL Editor
   - Click "RUN" to execute

4. **Verify Success**
   - You should see "Success" message with no errors

### What the Migration Does

1. Creates a helper function `shares_family_with()` that properly checks if two users share a family
2. Updates the `profiles` RLS policy to use this helper function instead of direct table joins
3. Eliminates the ambiguous relationship that was confusing the RLS system

## Test After Applying

1. Open the app and log in
2. Try to create a family:
   - Go to family screen
   - Tap "Create Family"
   - Enter a family name
   - Submit

3. Expected Result:
   - Family should be created successfully
   - You should be added as admin of the family
   - No more foreign key relationship errors

## If Issues Persist

If you still get errors after applying the migration:

1. **Check the SQL Editor output** for any execution errors
2. **Verify you're on the correct project** in Supabase Dashboard
3. **Try refreshing the schema** in Supabase Dashboard:
   - Settings → Database → Reset database schema cache
4. **Contact support** with the exact error message if it continues

## Technical Details

The `create_family` RPC function itself was correct - it inserts into both `families` and `family_memberships` tables properly. The issue was purely in the Row Level Security policy resolution system.