-- Fix: profiles PK is user_id, not id
-- The original RPCs joined on p.id which doesn't exist

create or replace function get_public_recipe_author(p_recipe_id uuid)
returns table(display_name text, initials text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_display_name text;
  v_initials text;
begin
  select p.display_name into v_display_name
  from recipes r
  join profiles p on p.user_id = r.owner_user_id
  where r.id = p_recipe_id
    and r.visibility = 'public';

  if v_display_name is not null then
    v_initials := upper(left(split_part(v_display_name, ' ', 1), 1));
    if split_part(v_display_name, ' ', 2) <> '' then
      v_initials := v_initials || upper(left(split_part(v_display_name, ' ', 2), 1));
    end if;
  else
    v_initials := 'U';
  end if;

  return query select v_display_name, v_initials;
end;
$$;

create or replace function get_public_recipe_authors(p_recipe_ids uuid[])
returns table(recipe_id uuid, display_name text, initials text)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select
    r.id as recipe_id,
    p.display_name,
    case
      when p.display_name is not null and split_part(p.display_name, ' ', 2) <> '' then
        upper(left(split_part(p.display_name, ' ', 1), 1)) || upper(left(split_part(p.display_name, ' ', 2), 1))
      when p.display_name is not null then
        upper(left(split_part(p.display_name, ' ', 1), 1))
      else
        'U'
    end as initials
  from recipes r
  join profiles p on p.user_id = r.owner_user_id
  where r.id = any(p_recipe_ids)
    and r.visibility = 'public';
end;
$$;
