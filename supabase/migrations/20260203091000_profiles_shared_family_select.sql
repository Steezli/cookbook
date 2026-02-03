-- Phase 1: allow reading profiles for shared families
-- Date: 2026-02-03

begin;

alter table public.profiles enable row level security;

drop policy if exists profiles_select_self_or_shared_family on public.profiles;
create policy profiles_select_self_or_shared_family
on public.profiles
for select
using (
  user_id = auth.uid()
  or exists (
    select 1
      from public.family_memberships self_m
      join public.family_memberships other_m
        on other_m.family_id = self_m.family_id
     where self_m.user_id = auth.uid()
       and other_m.user_id = profiles.user_id
  )
);

commit;

