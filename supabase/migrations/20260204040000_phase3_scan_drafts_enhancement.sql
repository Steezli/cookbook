-- Phase 3 SCAN-02: Enhanced Scan Drafts for Structured Extraction
-- Update scan_drafts table to support confidence scoring and structured data
-- Date: 2026-02-04

begin;

-- Add scan_job_id column if not exists (fix from SCAN-01)
do $$
begin
    if not exists (
        select 1 from information_schema.columns 
        where table_name = 'scan_drafts' 
        and column_name = 'scan_job_id'
    ) then
        alter table public.scan_drafts add column scan_job_id uuid references public.scan_jobs(id) on delete cascade;
    end if;
end $$;

-- Add confidence fields if not exist
do $$
begin
    if not exists (
        select 1 from information_schema.columns 
        where table_name = 'scan_drafts' 
        and column_name = 'ocr_confidence'
    ) then
        alter table public.scan_drafts add column ocr_confidence decimal(3,2);
    end if;
end $$;

-- Add structured data fields if not exist
do $$
begin
    if not exists (
        select 1 from information_schema.columns 
        where table_name = 'scan_drafts' 
        and column_name = 'structured_data'
    ) then
        alter table public.scan_drafts add column structured_data jsonb default '{}';
    end if;
end $$;

-- Add field-level confidence scores
do $$
begin
    if not exists (
        select 1 from information_schema.columns 
        where table_name = 'scan_drafts' 
        and column_name = 'field_confidence'
    ) then
        alter table public.scan_drafts add column field_confidence jsonb default '{}';
    end if;
end $$;

-- Update status enum to match SCAN-02 requirements
do $$
begin
    if not exists (
        select 1 from information_schema.columns 
        where table_name = 'scan_drafts' 
        and column_name = 'status'
    ) then
        alter table public.scan_drafts add column status text not null default 'ready' check (status in ('ready', 'needs_review', 'enhanced'));
    else
        -- Update existing status constraint if it has different values
        alter table public.scan_drafts drop constraint if exists scan_drafts_status_check;
        alter table public.scan_drafts 
            add constraint scan_drafts_status_check 
            check (status in ('ready', 'needs_review', 'enhanced'));
    end if;
end $$;

-- Add processing metadata
alter table public.scan_drafts add column if not exists ai_model_version text default '1.0';
alter table public.scan_drafts add column if not exists processing_time_ms integer;

-- Create indexes for new fields
create index if not exists scan_drafts_ocr_confidence_idx on public.scan_drafts(ocr_confidence);
create index if not exists scan_drafts_status_updated_at_idx on public.scan_drafts(status, updated_at);
create index if not exists scan_drafts_scan_job_id_idx on public.scan_drafts(scan_job_id);

-- Update existing policies to handle new status values
drop policy if exists "Users can view own scan drafts" on public.scan_drafts;
create policy "Users can view own scan drafts"
on public.scan_drafts
for select
using (user_id = auth.uid());

drop policy if exists "Users can insert own scan drafts" on public.scan_drafts;
create policy "Users can insert own scan drafts"
on public.scan_drafts
for insert
with check (user_id = auth.uid());

drop policy if exists "Users can update own scan drafts" on public.scan_drafts;
create policy "Users can update own scan drafts"
on public.scan_drafts
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Users can delete own scan drafts" on public.scan_drafts;
create policy "Users can delete own scan drafts"
on public.scan_drafts
for delete
using (user_id = auth.uid());

-- Function to calculate overall draft confidence
create or replace function public.calculate_draft_confidence(
    draft_id uuid
)
returns table (
    overall_confidence decimal(3,2),
    field_confidence jsonb,
    status text,
    needs_review boolean
)
language sql
security definer
set search_path = public
as $$
    with field_scores as (
        select 
            coalesce((field_confidence->>'title')::decimal, 0) as title_confidence,
            coalesce((field_confidence->>'ingredients')::decimal, 0) as ingredients_confidence,
            coalesce((field_confidence->>'instructions')::decimal, 0) as instructions_confidence,
            coalesce((field_confidence->>'prep_time')::decimal, 0) as prep_time_confidence,
            coalesce((field_confidence->>'cook_time')::decimal, 0) as cook_time_confidence,
            coalesce((field_confidence->>'servings')::decimal, 0) as servings_confidence
        from public.scan_drafts
        where id = calculate_draft_confidence.draft_id
          and user_id = auth.uid()
    )
    select 
        (fs.title_confidence + fs.ingredients_confidence + fs.instructions_confidence + 
         fs.prep_time_confidence + fs.cook_time_confidence + fs.servings_confidence) / 6.0 as overall_confidence,
        jsonb_build_object(
            'title', fs.title_confidence,
            'ingredients', fs.ingredients_confidence,
            'instructions', fs.instructions_confidence,
            'prep_time', fs.prep_time_confidence,
            'cook_time', fs.cook_time_confidence,
            'servings', fs.servings_confidence
        ) as field_confidence,
        case 
            when (fs.title_confidence + fs.ingredients_confidence + fs.instructions_confidence) / 3.0 >= 0.8 then 'ready'
            when (fs.title_confidence + fs.ingredients_confidence + fs.instructions_confidence) / 3.0 >= 0.5 then 'needs_review'
            else 'enhanced'
        end as status,
        (fs.title_confidence < 0.7 or fs.ingredients_confidence < 0.7 or fs.instructions_confidence < 0.7) as needs_review
    from field_scores fs
$$;

-- Function to enhance low-confidence fields with AI
create or replace function public.enhance_draft_field(
    draft_id uuid,
    field_name text,
    original_text text
)
returns table (
    enhanced_text text,
    confidence decimal(3,2),
    ai_suggestions jsonb
)
language plpgsql
security definer
set search_path = public
as $$
declare
    enhanced_result jsonb;
begin
    -- This function will be called by Edge Functions
    -- For now, return placeholder data
    return query
    select 
        original_text as enhanced_text,
        0.8 as confidence,
        jsonb_build_object(
            'original', original_text,
            'suggestions', jsonb_build_array(
                jsonb_build_object('text', original_text, 'confidence', 0.8),
                jsonb_build_object('text', 'Suggestion 1', 'confidence', 0.6),
                jsonb_build_object('text', 'Suggestion 2', 'confidence', 0.4)
            )
        ) as ai_suggestions;
end;
$$;

commit;