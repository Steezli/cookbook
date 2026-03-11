-- Add draft_index column to scan_drafts for multi-recipe support.
-- When a single photo contains multiple recipes, each recipe produces a
-- separate scan_drafts row. draft_index orders them (0-based) within a job.
-- Existing single-recipe rows keep the default of 0.

ALTER TABLE public.scan_drafts
  ADD COLUMN draft_index INTEGER NOT NULL DEFAULT 0;

-- Composite index for efficient ordered retrieval of all drafts for a job
CREATE INDEX IF NOT EXISTS scan_drafts_job_draft_idx
  ON public.scan_drafts(job_id, draft_index);
