-- Phase 3 SCAN-01: Database Schema for Scan System
-- Add scan_jobs and scan_drafts tables with RLS policies
-- Date: 2026-02-04

begin;

-- Create scan_jobs table
create table if not exists public.scan_jobs (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.profiles(user_id) on delete cascade,
    photo_url text not null,
    status text not null check (status in ('queued', 'processing', 'completed', 'failed')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    error_message text,
    retry_count integer not null default 0,
    max_retries integer not null default 3,
    
    -- User can only have 3 concurrent jobs (enforced via trigger)
    constraint check_retry_count check (retry_count <= max_retries)
);

-- Create scan_drafts table (placeholder for future task)
create table if not exists public.scan_drafts (
    id uuid primary key default gen_random_uuid(),
    job_id uuid not null references public.scan_jobs(id) on delete cascade,
    user_id uuid not null references public.profiles(user_id) on delete cascade,
    
    -- Raw OCR results
    raw_text text,
    ocr_confidence_score decimal(3,2),
    
    -- Structured extraction
    title text,
    ingredients jsonb,
    instructions jsonb,
    prep_time_minutes integer,
    cook_time_minutes integer,
    servings integer,
    
    -- Metadata
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    
    -- Status and confidence
    status text not null default 'draft' check (status in ('draft', 'reviewed', 'approved')),
    confidence_level text not null default 'medium' check (confidence_level in ('low', 'medium', 'high'))
);

-- Create indexes for performance
create index if not exists scan_jobs_user_id_idx on public.scan_jobs(user_id);
create index if not exists scan_jobs_status_idx on public.scan_jobs(status);
create index if not exists scan_jobs_created_at_idx on public.scan_jobs(created_at);
create index if not exists scan_jobs_user_status_idx on public.scan_jobs(user_id, status);

create index if not exists scan_drafts_job_id_idx on public.scan_drafts(job_id);
create index if not exists scan_drafts_user_id_idx on public.scan_drafts(user_id);
create index if not exists scan_drafts_status_idx on public.scan_drafts(status);

-- Enable RLS
alter table public.scan_jobs enable row level security;
alter table public.scan_drafts enable row level security;

-- RLS policies for scan_jobs
-- Users can only see their own jobs
create policy "Users can view own scan jobs"
on public.scan_jobs
for select
using (user_id = auth.uid());

-- Users can insert their own jobs
create policy "Users can insert own scan jobs"
on public.scan_jobs
for insert
with check (user_id = auth.uid());

-- Users can update their own jobs (for cancellation)
create policy "Users can update own scan jobs"
on public.scan_jobs
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- Users can delete their own jobs
create policy "Users can delete own scan jobs"
on public.scan_jobs
for delete
using (user_id = auth.uid());

-- RLS policies for scan_drafts
-- Users can only see their own drafts
create policy "Users can view own scan drafts"
on public.scan_drafts
for select
using (user_id = auth.uid());

-- Users can insert their own drafts
create policy "Users can insert own scan drafts"
on public.scan_drafts
for insert
with check (user_id = auth.uid());

-- Users can update their own drafts
create policy "Users can update own scan drafts"
on public.scan_drafts
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- Users can delete their own drafts
create policy "Users can delete own scan drafts"
on public.scan_drafts
for delete
using (user_id = auth.uid());

-- Function to enforce rate limiting (3 concurrent jobs per user)
create or replace function public.enforce_user_job_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    job_count integer;
begin
    -- Count existing active jobs for this user
    select count(*)
    into job_count
    from public.scan_jobs
    where user_id = NEW.user_id
      and status in ('queued', 'processing');
    
    -- Enforce limit of 3 concurrent jobs
    if job_count >= 3 then
        raise exception 'User has reached maximum of 3 concurrent scan jobs';
    end if;
    
    return NEW;
end;
$$;

-- Trigger to enforce rate limiting on insert
create trigger enforce_user_job_limit_trigger
before insert on public.scan_jobs
for each row
execute function public.enforce_user_job_limit();

-- Function to automatically update updated_at timestamp
create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
set search_path = public
as $$
begin
    NEW.updated_at = now();
    return NEW;
end;
$$;

-- Add updated_at triggers
create trigger scan_jobs_updated_at
before update on public.scan_jobs
for each row
execute function public.update_updated_at_column();

create trigger scan_drafts_updated_at
before update on public.scan_drafts
for each row
execute function public.update_updated_at_column();

-- Function to get job status with user-friendly message
create or replace function public.get_job_status(job_id uuid)
returns table (
    id uuid,
    status text,
    created_at timestamptz,
    updated_at timestamptz,
    error_message text,
    retry_count integer,
    max_retries integer,
    can_retry boolean,
    can_cancel boolean
)
language sql
security definer
set search_path = public
as $$
    select 
        j.id,
        j.status,
        j.created_at,
        j.updated_at,
        j.error_message,
        j.retry_count,
        j.max_retries,
        (j.status = 'failed' and j.retry_count < j.max_retries) as can_retry,
        (j.status = 'queued') as can_cancel
    from public.scan_jobs j
    where j.id = get_job_status.job_id
      and j.user_id = auth.uid();
$$;

commit;