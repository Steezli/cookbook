-- Fix remaining RLS recursion in family_memberships
-- Previous fix was incomplete - direct query in policy still triggers RLS
-- Date: 2026-02-03

begin;

-- Create secure versions of other helper functions that might have similar issues
create or replace function public.is_family_admin_secure(p_family_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.family_memberships fm
     where fm.family_id = p_family_id
       and fm.user_id = p_user_id
       and fm.role = 'admin'
  );
$$;

-- Drop and recreate the family_memberships policy to use the secure function
drop policy if exists family_memberships_select_member on public.family_memberships;

-- Use the secure version that bypasses RLS completely
create policy family_memberships_select_member
on public.family_memberships
for select
using (
  public.is_family_member_secure(family_id, auth.uid())
);

-- Also update the families policy to use the secure version for consistency
drop policy if exists families_select_member on public.families;
create policy families_select_member
on public.families
for select
using (
  public.is_family_member_secure(id, auth.uid())
);

-- Update other policies that use is_family_member to use the secure version
drop policy if exists families_update_admin on public.families;
create policy families_update_admin
on public.families
for update
using (public.is_family_admin_secure(id, auth.uid()))
with check (public.is_family_admin_secure(id, auth.uid()));

-- Update other policies to use secure versions
drop policy if exists family_memberships_update_admin on public.family_memberships;
create policy family_memberships_update_admin
on public.family_memberships
for update
using (public.is_family_admin_secure(family_id, auth.uid()))
with check (public.is_family_admin_secure(family_id, auth.uid()));

drop policy if exists family_memberships_delete_self_or_admin on public.family_memberships;
create policy family_memberships_delete_self_or_admin
on public.family_memberships
for delete
using (
  (user_id = auth.uid()) or public.is_family_admin_secure(family_id, auth.uid())
);

-- Update shares_family_with function to use secure version
-- Note: we keep the original function as it doesn't cause recursion itself
-- The recursion was only in the RLS policies, not this helper function

commit;