-- Phase 4: Trust + Collaboration (Units + Social)
-- Date: 2026-02-16

begin;

-- 1. Extend profiles table with unit preference
alter table public.profiles
  add column if not exists unit_preference text
  check (unit_preference in ('metric', 'imperial'))
  default 'imperial';

-- 2. Extend recipes table with rating aggregates
alter table public.recipes
  add column if not exists rating_average numeric(2,1),
  add column if not exists rating_count int not null default 0;

-- 3. Create recipe_comments table
create table if not exists public.recipe_comments (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  parent_comment_id uuid references public.recipe_comments(id) on delete cascade,
  content text not null,
  is_edited boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists recipe_comments_recipe_id_idx on public.recipe_comments(recipe_id);
create index if not exists recipe_comments_parent_id_idx on public.recipe_comments(parent_comment_id);
create index if not exists recipe_comments_user_id_idx on public.recipe_comments(user_id);

-- Add set_updated_at trigger to recipe_comments
drop trigger if exists recipe_comments_set_updated_at on public.recipe_comments;
create trigger recipe_comments_set_updated_at
before update on public.recipe_comments
for each row execute function public.set_updated_at();

-- 4. Create recipe_ratings table
create table if not exists public.recipe_ratings (
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  rating numeric(2,1) not null check (rating >= 0.5 and rating <= 5 and (rating * 2)::int = (rating * 2)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (recipe_id, user_id)
);

create index if not exists recipe_ratings_recipe_id_idx on public.recipe_ratings(recipe_id);

-- Add set_updated_at trigger to recipe_ratings
drop trigger if exists recipe_ratings_set_updated_at on public.recipe_ratings;
create trigger recipe_ratings_set_updated_at
before update on public.recipe_ratings
for each row execute function public.set_updated_at();

-- 5. Enable RLS on both tables
alter table public.recipe_comments enable row level security;
alter table public.recipe_ratings enable row level security;

-- 6. RLS policies for recipe_comments

-- SELECT: User can read if they can access the recipe
drop policy if exists recipe_comments_select_recipe_access on public.recipe_comments;
create policy recipe_comments_select_recipe_access
on public.recipe_comments
for select
using (
  exists (
    select 1
    from public.recipes r
    where r.id = recipe_comments.recipe_id
    and (
      r.visibility = 'public'
      or r.owner_user_id = auth.uid()
      or (
        r.visibility = 'family'
        and r.family_id is not null
        and public.is_family_member(r.family_id, auth.uid())
      )
    )
  )
);

-- INSERT: user_id = auth.uid() AND recipe is accessible
drop policy if exists recipe_comments_insert_recipe_access on public.recipe_comments;
create policy recipe_comments_insert_recipe_access
on public.recipe_comments
for insert
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.recipes r
    where r.id = recipe_comments.recipe_id
    and (
      r.visibility = 'public'
      or r.owner_user_id = auth.uid()
      or (
        r.visibility = 'family'
        and r.family_id is not null
        and public.is_family_member(r.family_id, auth.uid())
      )
    )
  )
);

-- UPDATE: user_id = auth.uid() (own comments only)
drop policy if exists recipe_comments_update_own on public.recipe_comments;
create policy recipe_comments_update_own
on public.recipe_comments
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- DELETE: user_id = auth.uid() OR recipe owner OR family admin
drop policy if exists recipe_comments_delete_moderation on public.recipe_comments;
create policy recipe_comments_delete_moderation
on public.recipe_comments
for delete
using (
  user_id = auth.uid()
  or exists (
    select 1
    from public.recipes r
    where r.id = recipe_comments.recipe_id
    and (
      r.owner_user_id = auth.uid()
      or (r.family_id is not null and public.is_family_admin(r.family_id, auth.uid()))
    )
  )
);

-- 7. RLS policies for recipe_ratings

-- SELECT: User can read if they can access the recipe
drop policy if exists recipe_ratings_select_recipe_access on public.recipe_ratings;
create policy recipe_ratings_select_recipe_access
on public.recipe_ratings
for select
using (
  exists (
    select 1
    from public.recipes r
    where r.id = recipe_ratings.recipe_id
    and (
      r.visibility = 'public'
      or r.owner_user_id = auth.uid()
      or (
        r.visibility = 'family'
        and r.family_id is not null
        and public.is_family_member(r.family_id, auth.uid())
      )
    )
  )
);

-- INSERT: user_id = auth.uid() AND recipe is accessible
drop policy if exists recipe_ratings_insert_recipe_access on public.recipe_ratings;
create policy recipe_ratings_insert_recipe_access
on public.recipe_ratings
for insert
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.recipes r
    where r.id = recipe_ratings.recipe_id
    and (
      r.visibility = 'public'
      or r.owner_user_id = auth.uid()
      or (
        r.visibility = 'family'
        and r.family_id is not null
        and public.is_family_member(r.family_id, auth.uid())
      )
    )
  )
);

-- UPDATE: user_id = auth.uid() (own rating only)
drop policy if exists recipe_ratings_update_own on public.recipe_ratings;
create policy recipe_ratings_update_own
on public.recipe_ratings
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- DELETE: user_id = auth.uid() (own rating only)
drop policy if exists recipe_ratings_delete_own on public.recipe_ratings;
create policy recipe_ratings_delete_own
on public.recipe_ratings
for delete
using (user_id = auth.uid());

-- 8. Create get_recipe_comments function (security definer to avoid recursive RLS)
create or replace function public.get_recipe_comments(p_recipe_id uuid)
returns table (
  id uuid,
  recipe_id uuid,
  user_id uuid,
  parent_comment_id uuid,
  content text,
  is_edited boolean,
  created_at timestamptz,
  updated_at timestamptz,
  depth int,
  path text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_can_access boolean;
begin
  v_user_id := auth.uid();

  -- First, validate the caller can access the recipe
  select exists (
    select 1
    from public.recipes r
    where r.id = p_recipe_id
    and (
      r.visibility = 'public'
      or r.owner_user_id = v_user_id
      or (
        r.visibility = 'family'
        and r.family_id is not null
        and public.is_family_member(r.family_id, v_user_id)
      )
    )
  ) into v_can_access;

  if not v_can_access then
    raise exception 'not found' using errcode = 'P0002';
  end if;

  -- Fetch comments with recursive CTE
  return query
  with recursive comment_tree as (
    -- Base case: top-level comments (no parent)
    select
      c.id,
      c.recipe_id,
      c.user_id,
      c.parent_comment_id,
      c.content,
      c.is_edited,
      c.created_at,
      c.updated_at,
      0 as depth,
      c.id::text as path
    from public.recipe_comments c
    where c.recipe_id = p_recipe_id
      and c.parent_comment_id is null

    union all

    -- Recursive case: child comments
    select
      c.id,
      c.recipe_id,
      c.user_id,
      c.parent_comment_id,
      c.content,
      c.is_edited,
      c.created_at,
      c.updated_at,
      ct.depth + 1,
      ct.path || '/' || c.id::text
    from public.recipe_comments c
    join comment_tree ct on c.parent_comment_id = ct.id
  )
  select * from comment_tree
  order by path;
end;
$$;

-- 9. Create rating aggregate trigger
create or replace function public.update_recipe_rating()
returns trigger
language plpgsql
as $$
begin
  -- Handle both INSERT/UPDATE (NEW) and DELETE (OLD)
  if TG_OP = 'DELETE' then
    update public.recipes set
      rating_average = (select round(avg(rating), 1) from public.recipe_ratings where recipe_id = old.recipe_id),
      rating_count = (select count(*) from public.recipe_ratings where recipe_id = old.recipe_id)
    where id = old.recipe_id;
    return old;
  else
    update public.recipes set
      rating_average = (select round(avg(rating), 1) from public.recipe_ratings where recipe_id = new.recipe_id),
      rating_count = (select count(*) from public.recipe_ratings where recipe_id = new.recipe_id)
    where id = new.recipe_id;
    return new;
  end if;
end;
$$;

drop trigger if exists recipe_ratings_update_aggregate on public.recipe_ratings;
create trigger recipe_ratings_update_aggregate
after insert or update or delete on public.recipe_ratings
for each row execute function public.update_recipe_rating();

commit;
