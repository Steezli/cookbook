-- Fix scan_jobs status CHECK constraint to include retrying and cancelled
-- These statuses are used by retry-recovery-service and job-status-service
-- but were only added to job_status_history, not scan_jobs itself.
-- Date: 2026-03-02

begin;

-- Drop existing constraint
alter table public.scan_jobs drop constraint if exists scan_jobs_status_check;

-- Add updated constraint with all valid statuses
alter table public.scan_jobs
  add constraint scan_jobs_status_check
  check (status in ('queued', 'processing', 'completed', 'failed', 'retrying', 'cancelled'));

commit;
