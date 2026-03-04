-- Phase 2 Recipe CRUD Migration
-- Adds ingredients, steps, metadata fields to recipes table
-- Adds RLS policies for CRUD operations

begin;

-- Add new fields to recipes table
alter table recipes 
  add column description text,
  add column ingredients jsonb not null default '[]'::jsonb,
  add column steps jsonb not null default '[]'::jsonb,
  add column servings int,
  add column prep_time_minutes int,
  add column cook_time_minutes int,
  add column source_story text,
  add column tags text[] default '{}'::text[],
  add column updated_at timestamptz not null default now();

-- Create GIN index for tags array
create index recipes_tags_idx on recipes using gin(tags);

-- Create trigger to automatically update updated_at
create trigger recipes_set_updated_at
  before update on recipes
  for each row execute function set_updated_at();

-- RLS policies for recipe CRUD operations
-- Insert: Users can create recipes for themselves
create policy "recipes_insert" on recipes
  for insert with check (owner_user_id = auth.uid());

-- Update: Users can only update their own recipes
create policy "recipes_update" on recipes
  for update using (owner_user_id = auth.uid()) with check (owner_user_id = auth.uid());

-- Delete: Users can only delete their own recipes
create policy "recipes_delete" on recipes
  for delete using (owner_user_id = auth.uid());

commit;