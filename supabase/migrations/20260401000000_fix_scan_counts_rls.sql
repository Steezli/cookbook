-- The increment_scan_count function uses INSERT ... ON CONFLICT DO UPDATE
-- but runs as security invoker, so the calling user needs an insert policy.
create policy "Users can insert own scan counts"
  on public.user_scan_counts
  for insert
  with check (auth.uid() = user_id);
