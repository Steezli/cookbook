-- Atomic photo reorder: update all sort_order values in a single transaction.
-- Accepts a JSON array of {id, sort_order} objects.
-- RLS is enforced via the per-row UPDATE check on recipe_photos.
create or replace function reorder_recipe_photos(
  updates jsonb
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  item jsonb;
begin
  for item in select * from jsonb_array_elements(updates)
  loop
    update public.recipe_photos
    set sort_order = (item ->> 'sort_order')::int
    where id = (item ->> 'id')::uuid;
  end loop;
end;
$$;
