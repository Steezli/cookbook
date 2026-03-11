# T12: 12-remaining-screens 12

**Slice:** S12 — **Milestone:** M001

## Description

Fix the scan draft race condition (UAT Test 11 — blocker). DraftReview currently queries the draft once on mount, but the draft row is created asynchronously by the edge function pipeline after the scan job is uploaded. Add a processing/waiting state that uses the existing subscribeToJob() function to wait for job completion before querying the draft.

Purpose: Eliminate "Draft not found" error that blocks all scan-to-draft flow (also unblocks Tests 12 and 13 which are skipped due to this).
Output: Updated DraftReview.tsx with job status subscription and waiting UI.

## Must-Haves

- [ ] "After uploading a scan, DraftReview waits for job processing to complete before querying the draft"
- [ ] "User sees a loading/processing state while waiting for the scan job to finish"
- [ ] "Once processing completes, the draft loads and displays correctly"

## Files

- `src/features/scans/DraftReview.tsx`
