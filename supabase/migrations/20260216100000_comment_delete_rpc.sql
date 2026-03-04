-- Fix: comment deletion via security definer RPC
-- PostgREST DELETE goes through nested RLS (recipe_comments SELECT policy
-- queries recipes table which has its own RLS). This can silently fail.
-- Use the same security definer pattern as get_recipe_comments.

create or replace function public.delete_recipe_comment(p_comment_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_comment record;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  -- Fetch the comment
  select c.id, c.user_id, c.recipe_id
  into v_comment
  from public.recipe_comments c
  where c.id = p_comment_id;

  if v_comment is null then
    raise exception 'Comment not found' using errcode = 'P0002';
  end if;

  -- Authorization: comment author, recipe owner, or family admin
  if v_comment.user_id = v_user_id then
    -- Comment author can delete their own comment
    null;
  elsif exists (
    select 1 from public.recipes r
    where r.id = v_comment.recipe_id
    and (
      r.owner_user_id = v_user_id
      or (r.family_id is not null and public.is_family_admin(r.family_id, v_user_id))
    )
  ) then
    -- Recipe owner or family admin can delete any comment
    null;
  else
    raise exception 'Not authorized to delete this comment' using errcode = '42501';
  end if;

  -- Perform the delete (cascade handles child comments)
  delete from public.recipe_comments where id = p_comment_id;
end;
$$;
