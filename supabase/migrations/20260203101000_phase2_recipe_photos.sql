-- Phase 2 Recipe Photos: Add photo attachments with RLS-protected storage
-- This migration adds photo storage infrastructure following recipe visibility rules

begin;

-- Create recipe_photos table for storing photo metadata
create table if not exists public.recipe_photos (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  storage_path text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- Create indexes for efficient queries
create index if not exists recipe_photos_recipe_id_idx on public.recipe_photos(recipe_id);
create index if not exists recipe_photos_sort_order_idx on public.recipe_photos(recipe_id, sort_order);

-- Enable Row Level Security on recipe_photos
alter table recipe_photos enable row level security;

-- RLS Policy: Select - follow recipe visibility
-- Users can see photos if they can see the associated recipe
create policy "recipe_photos_select" on recipe_photos
  for select using (
    exists (
      select 1 from recipes r
      where r.id = recipe_photos.recipe_id
      -- RLS on recipes table handles visibility automatically
    )
  );

-- RLS Policy: Insert - owner of recipe only
-- Users can add photos only to recipes they own
create policy "recipe_photos_insert" on recipe_photos
  for insert with check (
    exists (
      select 1 from recipes r
      where r.id = recipe_photos.recipe_id
      and r.owner_user_id = auth.uid()
    )
  );

-- RLS Policy: Delete - owner of recipe only
-- Users can delete photos only from recipes they own
create policy "recipe_photos_delete" on recipe_photos
  for delete using (
    exists (
      select 1 from recipes r
      where r.id = recipe_photos.recipe_id
      and r.owner_user_id = auth.uid()
    )
  );

-- Create storage bucket for recipe photos (if not exists)
-- Note: Bucket must be created manually in Supabase Dashboard first
insert into storage.buckets (id, name, public)
values ('recipe-photos', 'recipe-photos', true)
on conflict (id) do nothing;

-- Storage RLS Policy: Select - follow recipe visibility via recipe_photos join
-- Users can access photo files if they can see the associated recipe
create policy "recipe_photos_storage_select" on storage.objects
  for select using (
    bucket_id = 'recipe-photos'
    and exists (
      select 1 
      from recipe_photos rp
      join recipes r on r.id = rp.recipe_id
      where rp.storage_path = storage.objects.name
      -- RLS on recipes enforces visibility
    )
  );

-- Storage RLS Policy: Insert - authenticated users only
-- Recipe ownership is checked in the application layer during upload
create policy "recipe_photos_storage_insert" on storage.objects
  for insert with check (
    bucket_id = 'recipe-photos'
    and auth.role() = 'authenticated'
  );

-- Storage RLS Policy: Delete - must own the recipe
-- Users can delete photo files only from recipes they own
create policy "recipe_photos_storage_delete" on storage.objects
  for delete using (
    bucket_id = 'recipe-photos'
    and exists (
      select 1 
      from recipe_photos rp
      join recipes r on r.id = rp.recipe_id
      where rp.storage_path = storage.objects.name
      and r.owner_user_id = auth.uid()
    )
  );

commit;