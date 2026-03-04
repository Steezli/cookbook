---
status: testing
phase: 03-scan-to-draft-photo-to-structured
source: [03-01-SUMMARY.md, 03-02-SUMMARY.md, 03-03-SUMMARY.md, 03-04-SUMMARY.md, 03-scan-to-draft-photo-to-structured-05-SUMMARY.md, 03-06-SUMMARY.md, 03-07-SUMMARY.md]
started: 2026-02-06T20:00:00Z
updated: 2026-02-06T20:00:00Z
---

## Current Test
<!-- OVERWRITE each test - shows where we are -->

number: 2
name: Single Photo Upload and Scan Job
expected: |
  On the scan hub, tap to select a single photo from your library. The photo appears as a preview. Tap upload — the photo uploads, a scan job is created, and appears in the job list with "queued" status.
awaiting: user response

## Tests

### 1. App Loads and Scan Navigation
expected: App starts without errors. After logging in, you see a "Scan Recipes" link in the main navigation. Tapping it navigates to the Recipe Scanner hub page with a header, photo upload section, and job list section.
result: pass

### 2. Single Photo Upload and Scan Job
expected: On the scan hub, tap to select a single photo from your library. The photo appears as a preview. Tap upload — the photo uploads, a scan job is created, and appears in the job list with "queued" status.
result: pass

### 3. Multi-Image Selection and Gallery
expected: On the scan hub, select multiple photos (2+). All selected images appear in a horizontal gallery with thumbnails, image count, and total size displayed. You can remove individual images with an X button and reorder them.
result: [pending]

### 4. Multi-Image Upload as Single Job
expected: With multiple photos selected, tap upload. All photos upload together as a single scan job. Progress is shown during upload. The job appears in the list with the correct photo count.
result: [pending]

### 5. Job Status Tracking
expected: After creating a scan job, you can see its status update in real-time (queued → processing → completed or failed). The job list shows current status for each job.
result: pass

### 6. OCR and Draft Creation
expected: After a scan job completes successfully, it produces a structured draft with extracted ingredients (quantity/unit/name), steps, and metadata. Raw extracted text is preserved alongside the structured data.
result: [pending]

### 7. Draft Review with Confidence Indicators
expected: Navigate to review a completed draft. You see the extracted data with confidence indicators — green for high confidence, yellow for medium, red for low. Low-confidence fields are prioritized for review.
result: [pending]

### 8. Field Editing and Auto-Save
expected: In the draft editor, you can edit any field (ingredients, steps, metadata). Changes auto-save with a brief delay. You can add/remove/reorder ingredients and steps.
result: [pending]

### 9. Save Draft as Recipe
expected: From the draft review, you can save the draft as a normal recipe. The recipe appears in your recipe list with all the structured data from the draft.
result: [pending]

### 10. Failed Scan Error Handling
expected: If a scan fails (bad image, service error), you see a clear error message explaining what went wrong and a retry button. Retrying re-submits the job without re-uploading.
result: [pending]

### 11. Authentication Enforcement
expected: All scan features require authentication. If not logged in and attempting to access scan features, you see "Please log in" messaging. Each user only sees their own scan jobs and drafts.
result: [pending]

### 12. End-to-End Workflow
expected: Complete the full flow: upload photo(s) → wait for processing → review draft → edit fields if needed → save as recipe → find recipe in your recipe list. No data loss between steps.
result: [pending]

## Summary

total: 12
passed: 5
issues: 0
pending: 7
skipped: 0

## Gaps

[none yet]
