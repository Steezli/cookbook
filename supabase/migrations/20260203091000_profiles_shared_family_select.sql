-- Phase 1: allow reading profiles for shared families
-- Date: 2026-02-03

begin;

-- Helper function to check if two users are in the same family
create or replace function public.shares_family_with(p_target_user_id uuid, p_current_user_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
      from public.family_memberships self_m
      join public.family_memberships other_m
        on other_m.family_id = self_m.family_id
     where self_m.user_id = p_current_user_id
       and other_m.user_id = p_target_user_id
  );
$$;

alter table public.profiles enable row level security;

drop policy if exists profiles_select_self_or_shared_family on public.profiles;
create policy profiles_select_self_or_shared_family
on public.profiles
for select
using (
  user_id = auth.uid()
  or public.shares_family_with(profiles.user_id, auth.uid())
);

commit;

