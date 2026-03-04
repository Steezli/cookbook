-- Phase 3 Plan 07: Add multi-photo support to scan_jobs table
-- Add photo_urls and photo_count columns for multi-image scanning
-- Date: 2026-02-06

begin;

-- Add photo_urls column to store array of photo URLs
alter table public.scan_jobs
add column if not exists photo_urls text[];

-- Add photo_count column for quick reference
alter table public.scan_jobs
add column if not exists photo_count integer not null default 1;

-- Backfill existing jobs: populate photo_urls from photo_url
update public.scan_jobs
set photo_urls = array[photo_url]
where photo_urls is null;

-- Add check constraint to ensure at least one photo
alter table public.scan_jobs
add constraint check_photo_count check (photo_count > 0 and photo_count <= 10);

-- Create index for photo_count queries
create index if not exists scan_jobs_photo_count_idx on public.scan_jobs(photo_count);

commit;
