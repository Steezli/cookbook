-- Phase 1: Foundation (Identity + Family + Privacy)
-- Date: 2026-02-03

begin;

-- Extensions
create extension if not exists pgcrypto;

-- Enums
do $$
begin
  if not exists (select 1 from pg_type where typname = 'family_role') then
    create type public.family_role as enum ('admin', 'member');
  end if;

  if not exists (select 1 from pg_type where typname = 'recipe_visibility') then
    create type public.recipe_visibility as enum ('private', 'family', 'public');
  end if;
end $$;

-- Profiles (mirrors auth.users basics for app use + reset-request existence checks)
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- Keep profiles in sync with auth.users on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, email, display_name)
  values (new.id, lower(new.email), null)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Families
create table if not exists public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by_user_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

-- Family memberships (role + boundaries)
create table if not exists public.family_memberships (
  family_id uuid not null references public.families(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.family_role not null default 'member',
  created_at timestamptz not null default now(),
  primary key (family_id, user_id)
);

create index if not exists family_memberships_user_id_idx on public.family_memberships(user_id);

-- Prevent removing the last admin (atomic, race-safe)
create or replace function public.prevent_last_admin_delete()
returns trigger
language plpgsql
as $$
declare
  remaining_admins int;
begin
  if old.role <> 'admin' then
    return old;
  end if;

  select count(*)
    into remaining_admins
    from public.family_memberships fm
   where fm.family_id = old.family_id
     and fm.role = 'admin'
     and fm.user_id <> old.user_id;

  if remaining_admins = 0 then
    raise exception 'cannot remove last admin'
      using errcode = '23514';
  end if;

  return old;
end;
$$;

drop trigger if exists family_memberships_prevent_last_admin on public.family_memberships;
create trigger family_memberships_prevent_last_admin
before delete on public.family_memberships
for each row execute function public.prevent_last_admin_delete();

-- Family invites (single-use token stored hashed only)
create table if not exists public.family_invites (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  email text not null,
  token_hash bytea not null,
  created_by_user_id uuid not null references auth.users(id) on delete restrict,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  accepted_at timestamptz,
  accepted_by_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists family_invites_family_id_idx on public.family_invites(family_id);
create index if not exists family_invites_email_idx on public.family_invites(lower(email));
create unique index if not exists family_invites_token_hash_uniq on public.family_invites(token_hash);

-- Recipes (visibility primitive; CRUD is later phases)
create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  family_id uuid references public.families(id) on delete set null,
  visibility public.recipe_visibility not null default 'private',
  title text,
  created_at timestamptz not null default now()
);

create index if not exists recipes_owner_user_id_idx on public.recipes(owner_user_id);
create index if not exists recipes_family_id_idx on public.recipes(family_id);

-- Helper: membership checks
create or replace function public.is_family_member(p_family_id uuid, p_user_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
      from public.family_memberships fm
     where fm.family_id = p_family_id
       and fm.user_id = p_user_id
  );
$$;

create or replace function public.is_family_admin(p_family_id uuid, p_user_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
      from public.family_memberships fm
     where fm.family_id = p_family_id
       and fm.user_id = p_user_id
       and fm.role = 'admin'
  );
$$;

-- RLS
alter table public.profiles enable row level security;
alter table public.families enable row level security;
alter table public.family_memberships enable row level security;
alter table public.family_invites enable row level security;
alter table public.recipes enable row level security;

-- profiles: users can read/update their own profile (email is still protected by RLS)
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own
on public.profiles
for select
using (user_id = auth.uid());

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own
on public.profiles
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- families: only members can read; any authed user can create; only admins can update
drop policy if exists families_select_member on public.families;
create policy families_select_member
on public.families
for select
using (public.is_family_member(id, auth.uid()));

drop policy if exists families_insert_authed on public.families;
create policy families_insert_authed
on public.families
for insert
with check (auth.uid() is not null and created_by_user_id = auth.uid());

drop policy if exists families_update_admin on public.families;
create policy families_update_admin
on public.families
for update
using (public.is_family_admin(id, auth.uid()))
with check (public.is_family_admin(id, auth.uid()));

-- family_memberships: members can list; admins can update roles/remove; users can delete their own row (leave)
drop policy if exists family_memberships_select_member on public.family_memberships;
create policy family_memberships_select_member
on public.family_memberships
for select
using (public.is_family_member(family_id, auth.uid()));

drop policy if exists family_memberships_update_admin on public.family_memberships;
create policy family_memberships_update_admin
on public.family_memberships
for update
using (public.is_family_admin(family_id, auth.uid()))
with check (public.is_family_admin(family_id, auth.uid()));

drop policy if exists family_memberships_delete_self_or_admin on public.family_memberships;
create policy family_memberships_delete_self_or_admin
on public.family_memberships
for delete
using (
  (user_id = auth.uid()) or public.is_family_admin(family_id, auth.uid())
);

-- family_invites: members can list invites in their family; modifications are handled through RPC/functions
drop policy if exists family_invites_select_member on public.family_invites;
create policy family_invites_select_member
on public.family_invites
for select
using (public.is_family_member(family_id, auth.uid()));

-- recipes: enforce visibility server-side
drop policy if exists recipes_select_visibility on public.recipes;
create policy recipes_select_visibility
on public.recipes
for select
using (
  visibility = 'public'
  or owner_user_id = auth.uid()
  or (
    visibility = 'family'
    and family_id is not null
    and public.is_family_member(family_id, auth.uid())
  )
);

drop policy if exists recipes_insert_owner on public.recipes;
create policy recipes_insert_owner
on public.recipes
for insert
with check (
  auth.uid() is not null
  and owner_user_id = auth.uid()
  and (
    family_id is null
    or public.is_family_member(family_id, auth.uid())
  )
);

drop policy if exists recipes_update_owner_or_admin on public.recipes;
create policy recipes_update_owner_or_admin
on public.recipes
for update
using (
  owner_user_id = auth.uid()
  or (family_id is not null and public.is_family_admin(family_id, auth.uid()))
)
with check (
  owner_user_id = owner_user_id
  and (
    owner_user_id = auth.uid()
    or (family_id is not null and public.is_family_admin(family_id, auth.uid()))
  )
);

drop policy if exists recipes_delete_owner_or_admin on public.recipes;
create policy recipes_delete_owner_or_admin
on public.recipes
for delete
using (
  owner_user_id = auth.uid()
  or (family_id is not null and public.is_family_admin(family_id, auth.uid()))
);

-- RPC: create family (creates membership as admin)
create or replace function public.create_family(p_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_family_id uuid;
  v_user_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  insert into public.families (name, created_by_user_id)
  values (p_name, v_user_id)
  returning id into v_family_id;

  insert into public.family_memberships (family_id, user_id, role)
  values (v_family_id, v_user_id, 'admin');

  return v_family_id;
end;
$$;

-- RPC: create invite (returns raw token; only hash is stored)
create or replace function public.create_family_invite(p_family_id uuid, p_email text)
returns table (invite_id uuid, token text, expires_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_token text;
  v_expires_at timestamptz;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  if not public.is_family_member(p_family_id, v_user_id) then
    -- match app's "404 for unauthorized-by-design"
    raise exception 'not found' using errcode = 'P0002';
  end if;

  v_token := encode(gen_random_bytes(32), 'hex');
  v_expires_at := now() + interval '7 days';

  insert into public.family_invites (family_id, email, token_hash, created_by_user_id, expires_at)
  values (p_family_id, lower(p_email), digest(v_token, 'sha256'), v_user_id, v_expires_at)
  returning id into invite_id;

  token := v_token;
  expires_at := v_expires_at;
  return next;
end;
$$;

-- RPC: accept invite (single-use)
create or replace function public.accept_family_invite(p_token text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_invite public.family_invites%rowtype;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  select *
    into v_invite
    from public.family_invites fi
   where fi.token_hash = digest(p_token, 'sha256')
     and fi.revoked_at is null
     and fi.accepted_at is null
     and fi.expires_at > now()
   limit 1;

  if v_invite.id is null then
    raise exception 'invalid invite' using errcode = 'P0002';
  end if;

  insert into public.family_memberships (family_id, user_id, role)
  values (v_invite.family_id, v_user_id, 'member')
  on conflict (family_id, user_id) do nothing;

  update public.family_invites
     set accepted_at = now(),
         accepted_by_user_id = v_user_id
   where id = v_invite.id
     and accepted_at is null;

  return v_invite.family_id;
end;
$$;

-- RPC: revoke invite (admin-only)
create or replace function public.revoke_family_invite(p_invite_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_family_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  select family_id into v_family_id
    from public.family_invites
   where id = p_invite_id;

  if v_family_id is null or not public.is_family_admin(v_family_id, v_user_id) then
    raise exception 'not found' using errcode = 'P0002';
  end if;

  update public.family_invites
     set revoked_at = now()
   where id = p_invite_id
     and revoked_at is null;
end;
$$;

commit;

