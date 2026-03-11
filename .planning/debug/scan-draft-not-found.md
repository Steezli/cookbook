---
status: diagnosed
trigger: "After uploading a scan image, user sees 'Error Loading Draft Draft not found' on both web and iOS"
created: 2026-03-10T00:00:00Z
updated: 2026-03-10T00:00:00Z
---

## Current Focus

hypothesis: Race condition — app navigates to draft review screen immediately after upload, but the scan_drafts record doesn't exist yet because the edge function processing pipeline (queue-worker -> process-scan-job -> OCR -> AI parse -> insert scan_draft) hasn't completed.
test: Trace the timing of navigation vs draft creation
expecting: Navigation happens before draft exists in DB
next_action: Confirm root cause and suggest fix

## Symptoms

expected: After uploading a scan image, user should see the draft review screen with extracted recipe data
actual: User sees "Error Loading Draft" / "Draft not found" on both web and iOS
errors: "Draft not found" (set at DraftReview.tsx line 134 when scanDraftService.getDraftByJobId returns null)
reproduction: Upload any image via scan screen -> immediately redirected to /scan/draft/[jobId] -> error shown
started: After "Not authenticated" fix (getUser->getSession migration); the draft-not-found is a separate, pre-existing issue now unmasked

## Eliminated

- hypothesis: Authentication issue causing query failure
  evidence: The getUser->getSession fix resolved auth errors. The getDraftByJobId query itself succeeds (no thrown error), it simply returns null because no row exists yet.
  timestamp: 2026-03-10

## Evidence

- timestamp: 2026-03-10
  checked: app/scan/index.tsx handleUpload (line 114-144)
  found: After uploadScanPhotosWithValidation succeeds, immediately calls router.push(`/scan/draft/${result.jobId}`) on line 132
  implication: Navigation is SYNCHRONOUS with upload completion, not with processing completion

- timestamp: 2026-03-10
  checked: src/features/scan/scan-photos.ts uploadScanPhotos (line 132-138)
  found: Creates scan_job record (status='queued'), then triggers queue-worker as FIRE-AND-FORGET (line 136: supabase.functions.invoke('queue-worker').catch(...)). Returns jobId immediately.
  implication: The scan job is merely QUEUED when the jobId is returned to the caller. No draft exists yet.

- timestamp: 2026-03-10
  checked: supabase/functions/queue-worker/index.ts
  found: Queue worker fetches queued jobs, then calls process-scan-job for each one sequentially with 1-second delays between jobs
  implication: Processing is asynchronous and could take significant time (OCR + AI parsing)

- timestamp: 2026-03-10
  checked: supabase/functions/process-scan-job/index.ts (lines 82-201)
  found: This is where the scan_drafts record is actually created (line 194-196). The flow is: fetch job -> update status to 'processing' -> run OCR (Google Vision or mock) -> optionally run AI parsing (OpenAI) -> insert scan_draft -> update job to 'completed'
  implication: The draft record only exists AFTER all processing is complete. This is an async pipeline that takes seconds to minutes.

- timestamp: 2026-03-10
  checked: src/features/scans/DraftReview.tsx (lines 127-136)
  found: useEffect calls scanDraftService.getDraftByJobId(draftId, userId) exactly once on mount. If it returns null, sets error='Draft not found'. There is NO polling, NO retry, NO realtime subscription to wait for the draft to be created.
  implication: Single-shot query at mount time. If draft doesn't exist yet, it fails permanently with no recovery.

- timestamp: 2026-03-10
  checked: src/lib/scan/scan-draft-service.ts getDraftByJobId (lines 167-206)
  found: Queries scan_drafts WHERE job_id=jobId AND user_id=userId. Returns null if PGRST116 (not found). This is correct behavior — the draft simply doesn't exist yet.
  implication: The service is working correctly; the problem is the caller's assumption that the draft exists at navigation time.

- timestamp: 2026-03-10
  checked: src/features/scan/scan-service.ts subscribeToJob (lines 179-208)
  found: A realtime subscription function EXISTS for scan_jobs table updates (watches for status changes). However, it is NOT used in the DraftReview flow.
  implication: The infrastructure for waiting on job completion exists but isn't wired into the draft review screen.

## Resolution

root_cause: |
  RACE CONDITION between navigation and async processing pipeline.

  The upload flow works as follows:
  1. User uploads photo(s) -> photos stored in Supabase storage
  2. scan_jobs record created with status='queued'
  3. queue-worker edge function triggered (fire-and-forget)
  4. jobId returned to caller
  5. App IMMEDIATELY navigates to /scan/draft/{jobId}  <-- HERE IS THE BUG
  6. DraftReview mounts, queries scan_drafts WHERE job_id={jobId}
  7. Returns null because the edge function pipeline hasn't created the draft yet
  8. Shows "Draft not found" error

  Meanwhile, the async pipeline (queue-worker -> process-scan-job) is still running:
  - Fetching the queued job
  - Running OCR (Google Vision API or mock)
  - Optionally running AI parsing (OpenAI)
  - THEN inserting the scan_drafts record
  - THEN updating scan_jobs.status to 'completed'

  The draft review screen does a single query on mount with NO polling and NO retry.
  The subscribeToJob() realtime function exists but isn't used here.

fix: |
  Two-part fix needed:

  OPTION A (recommended): Add a processing/polling screen
  1. After upload, navigate to a "processing" screen (or keep /scan/draft/[id] but add a processing state)
  2. Use subscribeToJob() to listen for scan_jobs status change from 'queued'/'processing' to 'completed'
  3. Once job status is 'completed', THEN query for the draft
  4. Show progress indicator while waiting, error if job fails

  OPTION B (simpler but less robust): Add polling to DraftReview
  1. In DraftReview.tsx, if getDraftByJobId returns null, don't immediately show error
  2. Instead, check scan_jobs status for the jobId
  3. If status is 'queued' or 'processing', poll every 2-3 seconds
  4. If status is 'completed', retry getDraftByJobId
  5. If status is 'failed', show appropriate error
  6. Add a timeout (e.g., 2 minutes) to avoid infinite polling

verification: Not yet applied — diagnosis only
files_changed: []

### Files Involved

| File | Role | Issue |
|------|------|-------|
| `app/scan/index.tsx:132` | Navigation trigger | Navigates immediately after upload, before processing completes |
| `src/features/scan/scan-photos.ts:136` | Queue trigger | Fire-and-forget invocation of queue-worker |
| `src/features/scans/DraftReview.tsx:127-136` | Draft loader | Single-shot query with no polling/retry/wait logic |
| `supabase/functions/process-scan-job/index.ts:194` | Draft creator | Creates scan_drafts record only after full OCR+AI pipeline |
| `src/features/scan/scan-service.ts:179` | Realtime sub | subscribeToJob() exists but unused in draft review flow |
