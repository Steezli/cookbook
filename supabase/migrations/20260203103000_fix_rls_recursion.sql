-- Fix RLS recursion in family_memberships policy
-- The family_memberships_select_member policy was calling is_family_member()
-- which queries family_memberships table, creating infinite recursion
-- Date: 2026-02-03

begin;

-- Fix the recursive RLS policy by using direct table access
-- Bypass RLS for membership checks by using SECURITY DEFINER
drop policy if exists family_memberships_select_member on public.family_memberships;

create policy family_memberships_select_member
on public.family_memberships
for select
using (
  -- Direct check without calling is_family_member to avoid recursion
  exists (
    select 1
    from public.family_memberships fm
    where fm.family_id = family_memberships.family_id
      and fm.user_id = auth.uid()
  )
);

-- Alternatively, we could fix this by making is_family_member bypass RLS:
-- Create a security definer version that bypasses RLS for membership checks
create or replace function public.is_family_member_secure(p_family_id uuid, p_user_id uuid)
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
  );
$$;

-- Update any remaining references to use the secure version
-- (keeping old function for backward compatibility in case it's used elsewhere)
create or replace function public.is_family_member(p_family_id uuid, p_user_id uuid)
returns boolean
language sql
stable
as $$
  -- Delegate to the secure version to avoid recursion
  select public.is_family_member_secure(p_family_id, p_user_id);
$$;

commit;