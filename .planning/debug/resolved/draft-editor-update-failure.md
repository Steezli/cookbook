---
status: resolved
trigger: "DraftEditor shows 'Failed to update draft recipe' when editing any field"
created: 2026-03-03T00:00:00Z
updated: 2026-03-04T04:00:00Z
---

## Current Focus

hypothesis: ID type mismatch -- DraftEditor passes a job ID to updateDraftRecipe, which internally looks up by draft ID
test: Trace the ID flow from route param through load vs save paths
expecting: Load uses getDraftByJobId (queries job_id column), save uses getDraft (queries id column) with the same value
next_action: Return root cause diagnosis

## Symptoms

expected: Editing fields in DraftEditor should auto-save (or manual save) the updated recipe data to Supabase
actual: Every edit triggers "Failed to update draft recipe" error on save
errors: "Failed to update draft recipe" (from scan-draft-service.ts line 349)
reproduction: Open any draft from scan job list, edit any field, wait for auto-save or press Save Now
started: After RN conversion (component uses job ID as draftId prop)

## Eliminated

(none needed -- root cause found on first hypothesis)

## Evidence

- timestamp: 2026-03-03T00:00:01Z
  checked: ScanJobList.tsx navigation to draft route
  found: Line 303 navigates with `router.push('/(scan)/draft/${job.id}')` where job.id is a scan_jobs table primary key
  implication: The route parameter [id] is always a scan job ID, never a scan draft ID

- timestamp: 2026-03-03T00:00:02Z
  checked: DraftEditor.tsx load path (line 49)
  found: Uses `scanDraftService.getDraftByJobId(draftId, userId)` which queries `.eq('job_id', jobId)` -- correctly finds the draft
  implication: Loading works because it queries the job_id column

- timestamp: 2026-03-03T00:00:03Z
  checked: DraftEditor.tsx save path (line 83)
  found: Calls `scanDraftService.updateDraftRecipe(draftId, userId, recipeToSave)` passing the SAME draftId prop (which is actually a job ID)
  implication: The save function receives a job ID but expects a draft ID

- timestamp: 2026-03-03T00:00:04Z
  checked: scanDraftService.updateDraftRecipe (line 298)
  found: First thing it does is `this.getDraft(draftId, userId)` which queries `.eq('id', draftId)` -- but the value is a job ID, not a draft ID
  implication: getDraft returns null because no scan_drafts row has id = {job_id_value}, then throws "Draft not found"

- timestamp: 2026-03-03T00:00:05Z
  checked: The error propagation chain
  found: getDraft returns null -> line 300 throws "Draft not found" -> caught at line 347 -> re-thrown as "Failed to update draft recipe: Draft not found"
  implication: Confirms the exact error message users see

## Resolution

root_cause: ID type mismatch between load and save paths. DraftEditor receives a scan job ID as its `draftId` prop (from route param). The load path correctly uses `getDraftByJobId()` which queries the `job_id` column, but the save path passes that same job ID to `updateDraftRecipe()`, which internally calls `getDraft()` querying the `id` column. Since no draft has `id` equal to the job ID, `getDraft` returns null, and `updateDraftRecipe` throws "Draft not found", which surfaces as "Failed to update draft recipe".

fix: (not applied -- diagnosis only)
verification: (not applied -- diagnosis only)
files_changed: []
