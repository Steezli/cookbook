-- Fix: prevent_last_admin_delete blocks family deletion
--
-- The cascade from families → family_memberships fires this trigger,
-- which rejects the membership delete because there are no remaining admins.
-- Skip the check when the family itself is being deleted (no row in families).

create or replace function public.prevent_last_admin_delete()
returns trigger
language plpgsql
as $$
declare
  remaining_admins int;
  family_exists boolean;
begin
  if old.role <> 'admin' then
    return old;
  end if;

  -- If the family itself is being deleted (cascade), allow the membership removal.
  select exists(select 1 from public.families where id = old.family_id)
    into family_exists;
  if not family_exists then
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
