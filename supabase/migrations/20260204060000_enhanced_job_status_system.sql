-- Enhanced Job Status System - SCAN-04 Task 1
-- Add detailed status tracking, history, and error logging
-- Date: 2026-02-04

begin;

-- Add new columns to scan_jobs for enhanced tracking
alter table public.scan_jobs 
add column if not exists priority integer not null default 2 check (priority >= 1 and priority <= 4),
add column if not exists progress_percentage integer check (progress_percentage >= 0 and progress_percentage <= 100),
add column if not exists current_step text,
add column if not exists total_steps integer not null default 7,
add column if not exists estimated_minutes_remaining integer,
add column if not exists subscription_tier text not null default 'basic' check (subscription_tier in ('basic', 'premium', 'unlimited'));

-- Create job_status_history table for audit trail
create table if not exists public.job_status_history (
    id uuid primary key default gen_random_uuid(),
    job_id uuid not null references public.scan_jobs(id) on delete cascade,
    status text not null check (status in (
        'queued', 'validating', 'preprocessing', 'uploading', 
        'ocr_processing', 'ai_enhancing', 'finalizing', 
        'completed', 'failed', 'cancelled', 'retrying'
    )),
    message text,
    progress_percentage integer check (progress_percentage >= 0 and progress_percentage <= 100),
    current_step text,
    total_steps integer,
    estimated_minutes integer,
    metadata jsonb default '{}',
    created_at timestamptz not null default now()
);

-- Create job_errors table for detailed error tracking
create table if not exists public.job_errors (
    id uuid primary key default gen_random_uuid(),
    job_id uuid not null references public.scan_jobs(id) on delete cascade,
    category text not null check (category in (
        'user_error', 'system_error', 'api_failure', 'timeout', 'rate_limit', 'quota_exceeded'
    )),
    severity text not null check (severity in ('warning', 'error', 'critical')),
    message text not null,
    technical_details text,
    user_guidance text not null,
    can_retry boolean not null default true,
    retry_delay integer, -- minutes to wait before retry
    context jsonb default '{}',
    created_at timestamptz not null default now()
);

-- Create indexes for performance
create index if not exists job_status_history_job_id_idx on public.job_status_history(job_id);
create index if not exists job_status_history_created_at_idx on public.job_status_history(created_at);
create index if not exists job_status_history_job_created_idx on public.job_status_history(job_id, created_at);

create index if not exists job_errors_job_id_idx on public.job_errors(job_id);
create index if not exists job_errors_severity_idx on public.job_errors(severity);
create index if not exists job_errors_category_idx on public.job_errors(category);
create index if not exists job_errors_created_at_idx on public.job_errors(created_at);
create index if not exists job_errors_job_severity_idx on public.job_errors(job_id, severity);

create index if not exists scan_jobs_priority_idx on public.scan_jobs(priority);
create index if not exists scan_jobs_subscription_tier_idx on public.scan_jobs(subscription_tier);

-- Enable RLS for new tables
alter table public.job_status_history enable row level security;
alter table public.job_errors enable row level security;

-- RLS policies for job_status_history
create policy "Users can view own job status history"
on public.job_status_history
for select
using (exists (
    select 1 from public.scan_jobs 
    where scan_jobs.id = job_status_history.job_id 
    and scan_jobs.user_id = auth.uid()
));

create policy "System can insert job status history"
on public.job_status_history
for insert
with check (true); -- Service role will insert status updates

-- RLS policies for job_errors
create policy "Users can view own job errors"
on public.job_errors
for select
using (exists (
    select 1 from public.scan_jobs 
    where scan_jobs.id = job_errors.job_id 
    and scan_jobs.user_id = auth.uid()
));

create policy "System can insert job errors"
on public.job_errors
for insert
with check (true); -- Service role will insert errors

-- Enhanced function to update job status with progress tracking
create or replace function public.update_job_status_enhanced(
    job_id uuid,
    new_status text,
    progress_percentage integer default null,
    current_step text default null,
    total_steps integer default null,
    estimated_minutes integer default null,
    message text default null,
    metadata jsonb default '{}'
)
returns table (
    success boolean,
    result_message text
)
language plpgsql
security definer
set search_path = public
as $$
declare
    current_user_id uuid;
    job_exists boolean;
begin
    -- Verify job exists and get user_id for logging
    select user_id, (id is not null) into current_user_id, job_exists
    from public.scan_jobs
    where id = update_job_status_enhanced.job_id;
    
    if not job_exists then
        return query select false, 'Job not found'::text;
    end if;
    
    -- Update the job
    update public.scan_jobs
    set 
        status = new_status,
        progress_percentage = coalesce(progress_percentage, progress_percentage),
        current_step = coalesce(current_step, current_step),
        total_steps = coalesce(total_steps, total_steps),
        estimated_minutes_remaining = coalesce(estimated_minutes, estimated_minutes_remaining),
        updated_at = now()
    where id = update_job_status_enhanced.job_id
      and user_id = current_user_id; -- Security: only update user's own jobs
    
    -- Add to history
    insert into public.job_status_history (
        job_id,
        status,
        message,
        progress_percentage,
        current_step,
        total_steps,
        estimated_minutes,
        metadata
    ) values (
        update_job_status_enhanced.job_id,
        new_status,
        message,
        progress_percentage,
        current_step,
        total_steps,
        estimated_minutes,
        metadata
    );
    
    return query select true, 'Status updated successfully'::text;
end;
$$;

-- Function to get enhanced job status with all details
create or replace function public.get_enhanced_job_status(job_id uuid)
returns table (
    id uuid,
    user_id uuid,
    photo_url text,
    status text,
    progress_percentage integer,
    current_step text,
    total_steps integer,
    estimated_minutes_remaining integer,
    priority integer,
    subscription_tier text,
    retry_count integer,
    max_retries integer,
    can_retry boolean,
    can_cancel boolean,
    created_at timestamptz,
    updated_at timestamptz,
    latest_error text,
    error_severity text,
    error_guidance text,
    status_history jsonb,
    error_count bigint
)
language sql
security definer
set search_path = public
as $$
    with latest_error as (
        select distinct on (job_id) 
            job_id,
            message,
            severity,
            user_guidance,
            created_at
        from public.job_errors
        where job_id = get_enhanced_job_status.job_id
        order by job_id, created_at desc
    ),
    status_history as (
        select jsonb_agg(
            jsonb_build_object(
                'status', status,
                'message', message,
                'progress', progress_percentage,
                'step', current_step,
                'timestamp', created_at
            ) order by created_at asc
        ) as history
        from public.job_status_history
        where job_id = get_enhanced_job_status.job_id
    ),
    error_count as (
        select count(*) as cnt
        from public.job_errors
        where job_id = get_enhanced_job_status.job_id
    )
    select 
        j.id,
        j.user_id,
        j.photo_url,
        j.status,
        j.progress_percentage,
        j.current_step,
        j.total_steps,
        j.estimated_minutes_remaining,
        j.priority,
        j.subscription_tier,
        j.retry_count,
        j.max_retries,
        (j.status = 'failed' and j.retry_count < j.max_retries) as can_retry,
        (j.status in ('queued', 'validating', 'preprocessing')) as can_cancel,
        j.created_at,
        j.updated_at,
        le.message as latest_error,
        le.severity as error_severity,
        le.user_guidance as error_guidance,
        sh.history as status_history,
        ec.cnt as error_count
    from public.scan_jobs j
    left join latest_error le on j.id = le.job_id
    left join status_history sh on true
    left join error_count ec on true
    where j.id = get_enhanced_job_status.job_id
      and j.user_id = auth.uid();
$$;

-- Function to log job errors with classification
create or replace function public.log_job_error(
    job_id uuid,
    error_category text,
    error_severity text,
    error_message text,
    technical_details text default null,
    user_guidance text default null,
    can_retry boolean default true,
    retry_delay integer default null,
    error_context jsonb default '{}'
)
returns table (
    success boolean,
    message text
)
language plpgsql
security definer
set search_path = public
as $$
declare
    current_user_id uuid;
    job_exists boolean;
begin
    -- Verify job exists
    select user_id, (id is not null) into current_user_id, job_exists
    from public.scan_jobs
    where id = log_job_error.job_id;
    
    if not job_exists then
        return query select false, 'Job not found'::text;
    end if;
    
    -- Insert error record
    insert into public.job_errors (
        job_id,
        category,
        severity,
        message,
        technical_details,
        user_guidance,
        can_retry,
        retry_delay,
        context
    ) values (
        job_id,
        error_category,
        error_severity,
        error_message,
        technical_details,
        coalesce(user_guidance, 'An error occurred. Please try again.'),
        can_retry,
        retry_delay,
        error_context
    );
    
    -- Update job status to failed if it's a critical error
    if error_severity = 'critical' then
        update public.scan_jobs
        set status = 'failed',
            updated_at = now()
        where id = log_job_error.job_id;
    end if;
    
    return query select true, 'Error logged successfully'::text;
end;
$$;

-- Function to get job statistics for dashboard
create or replace function public.get_job_statistics(
    user_id_param uuid default null,
    start_date date default null,
    end_date date default null
)
returns table (
    total_jobs bigint,
    completed_jobs bigint,
    failed_jobs bigint,
    success_rate numeric(5,2),
    avg_processing_minutes numeric,
    errors_by_severity jsonb,
    errors_by_category jsonb,
    jobs_by_status jsonb
)
language sql
security definer
set search_path = public
as $$
    with job_stats as (
        select 
            count(*) as total,
            count(*) filter (where status = 'completed') as completed,
            count(*) filter (where status = 'failed') as failed,
            round(
                count(*) filter (where status = 'completed')::numeric / 
                nullif(count(*), 0) * 100, 2
            ) as success_rate,
            avg(
                case 
                    when status = 'completed' 
                    then extract(epoch from (updated_at - created_at)) / 60 
                    else null 
                end
            ) as avg_processing_minutes
        from public.scan_jobs
        where (user_id_param is null or user_id = user_id_param)
          and (start_date is null or date(created_at) >= start_date)
          and (end_date is null or date(created_at) <= end_date)
    ),
    error_severity as (
        select jsonb_object_agg(severity, cnt) as data
        from (
            select severity, count(*) as cnt
            from public.job_errors je
            join public.scan_jobs sj on je.job_id = sj.id
            where (user_id_param is null or sj.user_id = user_id_param)
              and (start_date is null or date(je.created_at) >= start_date)
              and (end_date is null or date(je.created_at) <= end_date)
            group by severity
        ) t
    ),
    error_category as (
        select jsonb_object_agg(category, cnt) as data
        from (
            select category, count(*) as cnt
            from public.job_errors je
            join public.scan_jobs sj on je.job_id = sj.id
            where (user_id_param is null or sj.user_id = user_id_param)
              and (start_date is null or date(je.created_at) >= start_date)
              and (end_date is null or date(je.created_at) <= end_date)
            group by category
        ) t
    ),
    job_status as (
        select jsonb_object_agg(status, cnt) as data
        from (
            select status, count(*) as cnt
            from public.scan_jobs
            where (user_id_param is null or user_id = user_id_param)
              and (start_date is null or date(created_at) >= start_date)
              and (end_date is null or date(created_at) <= end_date)
            group by status
        ) t
    )
    select 
        js.total,
        js.completed,
        js.failed,
        js.success_rate,
        js.avg_processing_minutes,
        coalesce(es.data, '{}') as errors_by_severity,
        coalesce(ec.data, '{}') as errors_by_category,
        coalesce(jso.data, '{}') as jobs_by_status
    from job_stats js
    left join error_severity es on true
    left join error_category ec on true
    left join job_status jso on true;
$$;

-- Create trigger to automatically add initial status history when job is created
create or replace function public.add_initial_job_history()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    -- Add initial status to history
    insert into public.job_status_history (
        job_id,
        status,
        message,
        progress_percentage,
        current_step,
        total_steps,
        metadata
    ) values (
        NEW.id,
        'queued',
        'Job created and queued for processing',
        5,
        'Waiting in queue',
        7,
        jsonb_build_object('initial', true)
    );
    
    return NEW;
end;
$$;

-- Create trigger for initial history
drop trigger if exists add_initial_job_history_trigger on public.scan_jobs;
create trigger add_initial_job_history_trigger
after insert on public.scan_jobs
for each row
execute function public.add_initial_job_history();

commit;