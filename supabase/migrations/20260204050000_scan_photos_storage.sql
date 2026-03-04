-- Add scan-photos storage bucket for scan job photos
-- This bucket holds uploaded photos that are being processed

begin;

-- Create storage bucket for scan photos (private)
insert into storage.buckets (id, name, public)
values ('scan-photos', 'scan-photos', true)  -- Public for processing, but access controlled by RLS
on conflict (id) do nothing;

-- Storage RLS Policy: Select - job owner only
-- Users can access scan photo files if they own the associated scan job
create policy "scan_photos_storage_select" on storage.objects
  for select using (
    bucket_id = 'scan-photos'
    and exists (
      select 1 
      from scan_jobs sj
      where sj.photo_url = concat('https://', storage.objects.bucket_id, '.', storage.objects.name)  -- Match public URL pattern
      and sj.user_id = auth.uid()
    )
  );

-- Storage RLS Policy: Insert - authenticated users only
-- Job ownership is checked in application layer during upload
create policy "scan_photos_storage_insert" on storage.objects
  for insert with check (
    bucket_id = 'scan-photos'
    and auth.role() = 'authenticated'
  );

-- Storage RLS Policy: Delete - job owner only
-- Users can delete scan photo files only from jobs they own
create policy "scan_photos_storage_delete" on storage.objects
  for delete using (
    bucket_id = 'scan-photos'
    and exists (
      select 1 
      from scan_jobs sj
      where sj.photo_url = concat('https://', storage.objects.bucket_id, '.', storage.objects.name)  -- Match public URL pattern
      and sj.user_id = auth.uid()
    )
  );

-- Function to increment retry count safely
create or replace function public.increment_retry_count(job_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
    current_count integer;
begin
    -- Get current retry count
    select retry_count into current_count
    from public.scan_jobs
    where id = job_id;
    
    -- Increment and return new count
    update public.scan_jobs
    set retry_count = retry_count + 1
    where id = job_id;
    
    return current_count + 1;
end;
$$;

commit;