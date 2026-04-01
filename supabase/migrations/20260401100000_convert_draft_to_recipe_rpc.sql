-- Atomic RPC: insert recipe + delete draft in a single transaction.
-- Prevents orphaned drafts if the client crashes between the two operations,
-- and prevents duplicate recipes if the user retries after a partial failure.
create or replace function convert_draft_to_recipe(
  p_draft_id uuid,
  p_user_id uuid,
  p_title text,
  p_description text default null,
  p_ingredients jsonb default '[]'::jsonb,
  p_steps jsonb default '[]'::jsonb,
  p_prep_time_minutes integer default null,
  p_cook_time_minutes integer default null,
  p_servings integer default null,
  p_tags text[] default '{}'
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_recipe_id uuid;
begin
  -- Verify draft exists and belongs to user
  if not exists (
    select 1 from public.scan_drafts
    where id = p_draft_id and user_id = p_user_id
  ) then
    raise exception 'Draft not found or not owned by user';
  end if;

  -- Insert recipe
  insert into public.recipes (
    owner_user_id, title, description, ingredients, steps,
    prep_time_minutes, cook_time_minutes, servings, tags,
    visibility, family_id, source_story
  ) values (
    p_user_id, p_title, p_description, p_ingredients, p_steps,
    p_prep_time_minutes, p_cook_time_minutes, p_servings, p_tags,
    'private', null, null
  )
  returning id into v_recipe_id;

  -- Delete draft (same transaction — atomic)
  delete from public.scan_drafts
  where id = p_draft_id and user_id = p_user_id;

  return v_recipe_id;
end;
$$;
