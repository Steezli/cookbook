---
status: diagnosed
trigger: "forgot password failures on iOS (email not found) and web (CORS 404)"
created: 2026-03-10T00:00:00Z
updated: 2026-03-10T00:00:00Z
---

## Current Focus

hypothesis: The reset-request edge function exists in source but was never deployed to Supabase
test: Checked `supabase functions list` output
expecting: reset-request should appear in deployed functions
next_action: Report findings

## Symptoms

expected: Forgot password flow sends reset email on both iOS and web
actual: iOS shows "email not found" error; web gets CORS 404 on OPTIONS preflight to /functions/v1/reset-request
errors: "Email not found" (iOS), 404 on OPTIONS (web)
reproduction: Submit any email on forgot-password screen
started: Always broken (function never deployed)

## Eliminated

(none needed -- root cause is clear)

## Evidence

- timestamp: 2026-03-10
  checked: supabase functions list
  found: Only 3 functions deployed (process-scan-job, queue-worker, schedule-queue-processor). reset-request is NOT deployed.
  implication: All calls to /functions/v1/reset-request return 404 because the function does not exist on the server.

- timestamp: 2026-03-10
  checked: forgot-password.tsx line 38
  found: Uses `supabase.functions.invoke('reset-request', ...)` which hits the remote edge function endpoint
  implication: Client is correctly calling the function, but the function doesn't exist remotely.

- timestamp: 2026-03-10
  checked: supabase/functions/reset-request/index.ts
  found: Function source exists locally with proper CORS handling via _shared/cors.ts
  implication: Code was written but never deployed with `supabase functions deploy reset-request`.

- timestamp: 2026-03-10
  checked: Error handling in forgot-password.tsx lines 42-48
  found: When supabase.functions.invoke gets a 404 from the *server* (function not found), the client interprets the HTTP 404 status and shows "Email not found" alert.
  implication: The iOS "email not found" error is a misattribution -- the 404 is because the function endpoint itself doesn't exist, not because the email lookup returned 404.

- timestamp: 2026-03-10
  checked: Web CORS behavior
  found: Browser sends OPTIONS preflight to /functions/v1/reset-request. Since the function isn't deployed, Supabase returns 404 for the OPTIONS request itself. No CORS headers are sent back, so browser blocks with CORS error.
  implication: Web CORS error and iOS "email not found" have the same root cause -- undeployed function.

## Resolution

root_cause: The `reset-request` edge function was never deployed to Supabase. The source exists at `supabase/functions/reset-request/index.ts` but `supabase functions list` shows only 3 other functions. Both platform failures trace to the same cause -- a 404 from the Supabase functions gateway because the function doesn't exist.

fix: (research only -- no changes made)
verification: (research only)
files_changed: []
