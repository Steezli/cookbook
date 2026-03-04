---
status: resolved
trigger: "POST https://...supabase.co/rest/v1/rpc/create_family returned HTTP 404"
created: 2026-02-03T20:34:52Z
resolved: 2026-02-03T20:45:00Z
---

## Resolution

root_cause: Database migrations existed locally but were never applied to remote Supabase database
fix: Applied migrations to remote database using Supabase CLI (`supabase db push`)
verification: Family creation now works successfully
files_changed: []

## Symptoms

expected: Family creation succeeds and returns new family object
actual: POST to `/rest/v1/rpc/create_family` returned 404 with error PGRST202
errors: "Could not find the function `create_family`"
reproduction: Click "Create family" button in family list screen
started: During Phase 1 human verification testing

## Evidence

- timestamp: 2026-02-03T20:34:52Z
  checked: Network request to Supabase RPC endpoint
  found: 404 response with proxy-status header containing "PGRST202"
  implication: PostgREST could not find the RPC function in remote database

- timestamp: 2026-02-03T20:35:00Z
  checked: Local migration files
  found: `supabase/migrations/20260203090000_phase1_foundation.sql` contains `create_family` RPC definition at line ~300
  implication: Migration exists locally but wasn't applied to remote

- timestamp: 2026-02-03T20:36:00Z
  checked: Supabase project configuration
  found: User authenticated successfully (valid JWT token), project-ref correct
  implication: Auth working, database connection working, but schema missing

## Resolution Steps Taken

1. Confirmed migrations exist locally
2. Instructed user to apply migrations via Supabase CLI:
   ```bash
   supabase link --project-ref ugixgcbysrwabwzbsjxr
   supabase db push
   ```
3. User applied migrations successfully
4. Verified family creation now works

## Documentation Updates

- Updated `.planning/phases/01-foundation-identity-family-privacy/01-VERIFICATION.md`
- Added "Critical Deployment Requirement" section
- Documented resolution and lesson learned
- Added reminder for Phase 2 to deploy migrations immediately after local testing
