-- Additional tables for retry and recovery tracking - SCAN-04 Task 3
-- Add retry attempt tracking and user feedback collection
-- Date: 2026-02-04

begin;

-- Create job_retry_attempts table for tracking retry history
create table if not exists public.job_retry_attempts (
    id uuid primary key default gen_random_uuid(),
    job_id uuid not null references public.scan_jobs(id) on delete cascade,
    attempt_number integer not null,
    error_category text not null check (error_category in (
        'user_error', 'system_error', 'api_failure', 'timeout', 'rate_limit', 'quota_exceeded'
    )),
    error_severity text not null check (error_severity in ('warning', 'error', 'critical')),
    error_message text not null,
    delay_minutes integer not null,
    success boolean not null default false,
    retry_strategy jsonb default '{}',
    created_at timestamptz not null default now()
);

-- Create error_feedback table for user feedback on errors
create table if not exists public.error_feedback (
    id uuid primary key default gen_random_uuid(),
    job_id uuid references public.scan_jobs(id) on delete cascade,
    error_id uuid references public.job_errors(id) on delete cascade,
    user_id uuid not null references public.profiles(user_id) on delete cascade,
    feedback_type text not null check (feedback_type in (
        'helpful', 'not_helpful', 'confusing', 'wrong', 'other'
    )),
    feedback_text text,
    rating integer check (rating >= 1 and rating <= 5),
    was_resolved boolean default false,
    resolution_method text,
    created_at timestamptz not null default now()
);

-- Create error_trends table for analytics
create table if not exists public.error_trends (
    id uuid primary key default gen_random_uuid(),
    error_category text not null,
    error_severity text not null,
    error_pattern text not null,
    occurrence_count integer not null default 1,
    last_occurrence timestamptz not null default now(),
    resolution_rate numeric(5,2) default 0,
    avg_retry_attempts numeric(5,2) default 0,
    user_impact_score numeric(5,2) default 0,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Create error_alerts table for critical error notifications
create table if not exists public.error_alerts (
    id uuid primary key default gen_random_uuid(),
    alert_type text not null check (alert_type in (
        'critical_error', 'escalation_required', 'pattern_detected', 'performance_issue'
    )),
    severity text not null check (severity in ('low', 'medium', 'high', 'critical')),
    title text not null,
    description text,
    error_pattern text,
    affected_jobs text[], -- array of job IDs
    threshold_exceeded jsonb,
    auto_resolve boolean default false,
    resolved boolean default false,
    resolved_at timestamptz,
    resolved_by uuid references public.profiles(user_id),
    resolution_notes text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Create admin_error_investigation table for manual investigation tracking
create table if not exists public.admin_error_investigation (
    id uuid primary key default gen_random_uuid(),
    error_id uuid references public.job_errors(id) on delete cascade,
    investigator_id uuid references public.profiles(user_id),
    status text not null check (status in ('open', 'investigating', 'resolved', 'closed')),
    priority text not null check (priority in ('low', 'medium', 'high', 'critical')),
    findings text,
    root_cause text,
    corrective_action text,
    prevention_action text,
    estimated_impact text,
    affected_users integer,
    investigation_notes jsonb default '{}',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    resolved_at timestamptz
);

-- Create indexes for performance
create index if not exists job_retry_attempts_job_id_idx on public.job_retry_attempts(job_id);
create index if not exists job_retry_attempts_created_at_idx on public.job_retry_attempts(created_at);
create index if not exists job_retry_attempts_success_idx on public.job_retry_attempts(success);

create index if not exists error_feedback_job_id_idx on public.error_feedback(job_id);
create index if not exists error_feedback_user_id_idx on public.error_feedback(user_id);
create index if not exists error_feedback_feedback_type_idx on public.error_feedback(feedback_type);
create index if not exists error_feedback_created_at_idx on public.error_feedback(created_at);

create index if not exists error_trends_category_idx on public.error_trends(error_category);
create index if not exists error_trends_severity_idx on public.error_trends(error_severity);
create index if not exists error_trends_last_occurrence_idx on public.error_trends(last_occurrence);

create index if not exists error_alerts_type_idx on public.error_alerts(alert_type);
create index if not exists error_alerts_severity_idx on public.error_alerts(severity);
create index if not exists error_alerts_resolved_idx on public.error_alerts(resolved);
create index if not exists error_alerts_created_at_idx on public.error_alerts(created_at);

create index if not exists admin_error_investigation_error_id_idx on public.admin_error_investigation(error_id);
create index if not exists admin_error_investigation_investigator_idx on public.admin_error_investigation(investigator_id);
create index if not exists admin_error_investigation_status_idx on public.admin_error_investigation(status);
create index if not exists admin_error_investigation_priority_idx on public.admin_error_investigation(priority);

-- Enable RLS for new tables
alter table public.job_retry_attempts enable row level security;
alter table public.error_feedback enable row level security;
alter table public.error_trends enable row level security;
alter table public.error_alerts enable row level security;
alter table public.admin_error_investigation enable row level security;

-- RLS policies for job_retry_attempts
create policy "Users can view own retry attempts"
on public.job_retry_attempts
for select
using (exists (
    select 1 from public.scan_jobs 
    where scan_jobs.id = job_retry_attempts.job_id 
    and scan_jobs.user_id = auth.uid()
));

create policy "System can insert retry attempts"
on public.job_retry_attempts
for insert
with check (true);

-- RLS policies for error_feedback
create policy "Users can view own feedback"
on public.error_feedback
for select
using (user_id = auth.uid());

create policy "Users can insert own feedback"
on public.error_feedback
for insert
with check (user_id = auth.uid());

-- RLS policies for error_trends (read-only for users, write-only for system)
create policy "Users can view error trends"
on public.error_trends
for select
using (true); -- Error trends are aggregated/anonymized

create policy "System can update error trends"
on public.error_trends
for all
using (false) -- No direct access, only through functions
with check (false);

-- RLS policies for error_alerts (no direct access — managed via service-role functions)
create policy "No direct access to error alerts"
on public.error_alerts
for all
using (false)
with check (false);

-- RLS policies for admin_error_investigation (no direct access — managed via service-role functions)
create policy "No direct access to error investigations"
on public.admin_error_investigation
for all
using (false)
with check (false);

-- Function to track error trends automatically
create or replace function public.update_error_trends()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    trend_record record;
begin
    -- Check if trend already exists for this error pattern
    select * into trend_record
    from public.error_trends
    where error_category = NEW.category
      and error_severity = NEW.severity
      and error_pattern = substring(NEW.message, 1, 200); -- First 200 chars as pattern
    
    if found then
        -- Update existing trend
        update public.error_trends
        set 
            occurrence_count = occurrence_count + 1,
            last_occurrence = NEW.created_at,
            updated_at = now()
        where id = trend_record.id;
    else
        -- Create new trend
        insert into public.error_trends (
            error_category,
            error_severity,
            error_pattern,
            occurrence_count,
            last_occurrence
        ) values (
            NEW.category,
            NEW.severity,
            substring(NEW.message, 1, 200),
            1,
            NEW.created_at
        );
    end if;
    
    return NEW;
end;
$$;

-- Create trigger for error trend tracking
drop trigger if exists update_error_trends_trigger on public.job_errors;
create trigger update_error_trends_trigger
after insert on public.job_errors
for each row
execute function public.update_error_trends();

-- Function to get comprehensive error analytics
-- Simplified: returns aggregate stats rather than per-day breakdown
create or replace function public.get_error_analytics_dashboard(
    start_date date default null,
    end_date date default null,
    user_id_filter uuid default null
)
returns table (
    period_start date,
    period_end date,
    total_jobs bigint,
    total_errors bigint,
    error_rate numeric(5,2),
    top_error_categories jsonb,
    top_error_messages jsonb,
    retry_rate numeric(5,2),
    recovery_rate numeric(5,2),
    user_satisfaction_score numeric(5,2),
    critical_alerts_count bigint,
    open_investigations_count bigint
)
language sql
security definer
set search_path = public
as $$
    with job_stats as (
        select count(*) as total_jobs
        from public.scan_jobs
        where (start_date is null or date(created_at) >= start_date)
          and (end_date is null or date(created_at) <= end_date)
          and (user_id_filter is null or user_id = user_id_filter)
    ),
    error_stats as (
        select count(*) as total_errors
        from public.job_errors je
        join public.scan_jobs sj on je.job_id = sj.id
        where (start_date is null or date(je.created_at) >= start_date)
          and (end_date is null or date(je.created_at) <= end_date)
          and (user_id_filter is null or sj.user_id = user_id_filter)
    ),
    error_categories as (
        select coalesce(jsonb_object_agg(cat, cnt), '{}') as data
        from (
            select je.category as cat, count(*) as cnt
            from public.job_errors je
            join public.scan_jobs sj on je.job_id = sj.id
            where (start_date is null or date(je.created_at) >= start_date)
              and (end_date is null or date(je.created_at) <= end_date)
              and (user_id_filter is null or sj.user_id = user_id_filter)
            group by je.category
        ) t
    ),
    retry_stats as (
        select
            count(*) filter (where success = true) as successful_retries,
            count(*) as total_retries
        from public.job_retry_attempts
        where (start_date is null or date(created_at) >= start_date)
          and (end_date is null or date(created_at) <= end_date)
    ),
    feedback_stats as (
        select avg(rating) as avg_rating
        from public.error_feedback
        where (start_date is null or date(created_at) >= start_date)
          and (end_date is null or date(created_at) <= end_date)
          and (user_id_filter is null or user_id = user_id_filter)
    ),
    alert_stats as (
        select count(*) filter (where severity = 'critical' and resolved = false) as critical_alerts
        from public.error_alerts
        where (start_date is null or date(created_at) >= start_date)
          and (end_date is null or date(created_at) <= end_date)
    ),
    investigation_stats as (
        select count(*) filter (where status in ('open', 'investigating')) as open_investigations
        from public.admin_error_investigation
        where (start_date is null or date(created_at) >= start_date)
          and (end_date is null or date(created_at) <= end_date)
    )
    select
        coalesce(start_date, current_date) as period_start,
        coalesce(end_date, current_date) as period_end,
        coalesce(js.total_jobs, 0) as total_jobs,
        coalesce(es.total_errors, 0) as total_errors,
        case
            when js.total_jobs > 0 then
                round((coalesce(es.total_errors, 0)::numeric / js.total_jobs::numeric) * 100, 2)
            else 0
        end as error_rate,
        ec.data as top_error_categories,
        '{}'::jsonb as top_error_messages,
        case
            when rs.total_retries > 0 then
                round((coalesce(rs.successful_retries, 0)::numeric / rs.total_retries::numeric) * 100, 2)
            else 0
        end as retry_rate,
        0 as recovery_rate,
        coalesce(fs.avg_rating, 0) as user_satisfaction_score,
        coalesce(als.critical_alerts, 0) as critical_alerts_count,
        coalesce(ins.open_investigations, 0) as open_investigations_count
    from job_stats js
    cross join error_stats es
    cross join error_categories ec
    cross join retry_stats rs
    cross join feedback_stats fs
    cross join alert_stats als
    cross join investigation_stats ins;
$$;

-- Function to submit user feedback on errors
create or replace function public.submit_error_feedback(
    job_id uuid,
    error_id uuid,
    feedback_type text,
    feedback_text text default null,
    rating integer default null
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
    error_exists boolean;
begin
    -- Get current user
    current_user_id := auth.uid();
    
    -- Verify job exists and belongs to user
    select (id is not null) into job_exists
    from public.scan_jobs
    where id = submit_error_feedback.job_id
      and user_id = current_user_id;
    
    if not job_exists then
        return query select false, 'Job not found or access denied'::text;
    end if;
    
    -- Verify error exists (or allow null if error_id is null)
    if error_id is not null then
        select (id is not null) into error_exists
        from public.job_errors
        where id = submit_error_feedback.error_id;
        
        if not error_exists then
            return query select false, 'Error not found'::text;
        end if;
    end if;
    
    -- Insert feedback
    insert into public.error_feedback (
        job_id,
        error_id,
        user_id,
        feedback_type,
        feedback_text,
        rating
    ) values (
        job_id,
        error_id,
        current_user_id,
        feedback_type,
        feedback_text,
        rating
    );
    
    return query select true, 'Feedback submitted successfully'::text;
end;
$$;

-- Function to get user error history with feedback options
create or replace function public.get_user_error_history(
    limit_count integer default 20,
    offset_count integer default 0
)
returns table (
    job_id uuid,
    error_id uuid,
    error_message text,
    error_category text,
    error_severity text,
    user_guidance text,
    can_retry boolean,
    feedback_given boolean,
    feedback_type text,
    feedback_rating integer,
    occurred_at timestamptz
)
language sql
security definer
set search_path = public
as $$
    select 
        sj.id as job_id,
        je.id as error_id,
        je.message as error_message,
        je.category as error_category,
        je.severity as error_severity,
        je.user_guidance,
        je.can_retry,
        (ef.id is not null) as feedback_given,
        ef.feedback_type,
        ef.rating as feedback_rating,
        je.created_at as occurred_at
    from public.scan_jobs sj
    left join public.job_errors je on sj.id = je.job_id
    left join public.error_feedback ef on je.id = ef.error_id and ef.user_id = auth.uid()
    where sj.user_id = auth.uid()
      and je.id is not null
    order by je.created_at desc
    limit limit_count
    offset offset_count;
$$;

commit;