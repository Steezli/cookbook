-- RPC: return the first photo per recipe (by sort_order, then created_at).
-- Uses DISTINCT ON to return exactly one row per recipe_id, avoiding
-- transferring all photos and deduplicating client-side.
create or replace function get_first_recipe_photos(recipe_ids uuid[])
returns table (
  id uuid,
  recipe_id uuid,
  storage_path text,
  sort_order integer,
  created_at timestamptz
)
language sql
stable
set search_path = ''
as $$
  select distinct on (rp.recipe_id)
    rp.id,
    rp.recipe_id,
    rp.storage_path,
    rp.sort_order,
    rp.created_at
  from public.recipe_photos rp
  where rp.recipe_id = any(recipe_ids)
  order by rp.recipe_id, rp.sort_order asc, rp.created_at asc;
$$;
