-- Track per-user scan counts by year-month for subscription limit enforcement.
create table public.user_scan_counts (
  user_id    uuid    not null references auth.users(id) on delete cascade,
  year_month text    not null,
  count      integer not null default 0,
  primary key (user_id, year_month)
);

alter table public.user_scan_counts enable row level security;

create policy "Users can view own scan counts"
  on public.user_scan_counts
  for select
  using (auth.uid() = user_id);

create policy "Users can update own scan counts"
  on public.user_scan_counts
  for update
  using (auth.uid() = user_id);

-- Atomically increment the scan count for the current month and return the new count.
create or replace function increment_scan_count(
  p_user_id uuid
)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_count integer;
  v_year_month text;
begin
  v_year_month := to_char(now(), 'YYYY-MM');

  insert into public.user_scan_counts (user_id, year_month, count)
  values (p_user_id, v_year_month, 1)
  on conflict (user_id, year_month)
  do update set count = user_scan_counts.count + 1
  returning count into v_count;

  return v_count;
end;
$$;
