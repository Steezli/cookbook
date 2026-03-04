-- Migration: Collections and Collection Recipes for Phase 2
-- Plan: 02-03 (Collections)
-- Depends on: Phase 1 foundation and Phase 2 recipes

begin;

-- Create collections table
create table if not exists public.collections (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  family_id uuid references public.families(id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes for collections
create index if not exists collections_owner_user_id_idx on public.collections(owner_user_id);
create index if not exists collections_family_id_idx on public.collections(family_id);

-- Updated at trigger for collections
drop trigger if exists collections_set_updated_at on public.collections;
create trigger collections_set_updated_at
before update on public.collections
for each row execute function public.set_updated_at();

-- Create collection_recipes join table
create table if not exists public.collection_recipes (
  collection_id uuid not null references public.collections(id) on delete cascade,
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (collection_id, recipe_id)
);

-- Indexes for collection_recipes
create index if not exists collection_recipes_collection_id_idx on public.collection_recipes(collection_id);
create index if not exists collection_recipes_recipe_id_idx on public.collection_recipes(recipe_id);

-- RLS for collections
alter table collections enable row level security;

-- Select: owner or family member (if family collection)
create policy "collections_select" on collections
  for select using (
    owner_user_id = auth.uid()
    or (
      family_id is not null
      and is_family_member(family_id, auth.uid())
    )
  );

-- Insert: user can create own collections
create policy "collections_insert" on collections
  for insert with check (
    owner_user_id = auth.uid()
  );

-- Update: owner only
create policy "collections_update" on collections
  for update using (
    owner_user_id = auth.uid()
  ) with check (
    owner_user_id = auth.uid()
  );

-- Delete: owner only
create policy "collections_delete" on collections
  for delete using (
    owner_user_id = auth.uid()
  );

-- RLS for collection_recipes
alter table collection_recipes enable row level security;

-- Select: follow collection visibility
create policy "collection_recipes_select" on collection_recipes
  for select using (
    exists (
      select 1 from collections c
      where c.id = collection_recipes.collection_id
      -- RLS on collections handles visibility
    )
  );

-- Insert: must own collection AND have access to recipe
create policy "collection_recipes_insert" on collection_recipes
  for insert with check (
    exists (
      select 1 from collections c
      where c.id = collection_recipes.collection_id
      and c.owner_user_id = auth.uid()
    )
    and exists (
      select 1 from recipes r
      where r.id = collection_recipes.recipe_id
      -- RLS on recipes ensures user can see recipe
    )
  );

-- Delete: must own collection
create policy "collection_recipes_delete" on collection_recipes
  for delete using (
    exists (
      select 1 from collections c
      where c.id = collection_recipes.collection_id
      and c.owner_user_id = auth.uid()
    )
  );

commit;