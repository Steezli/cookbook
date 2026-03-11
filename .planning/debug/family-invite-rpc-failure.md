---
status: diagnosed
trigger: "UAT Phase 12 test 9: Family invite creation fails with PostgreSQL error 42883: function gen_random_bytes(integer) does not exist. Family deletion also fails on web."
created: 2026-03-10T00:00:00Z
updated: 2026-03-10T00:00:00Z
---

## Current Focus

hypothesis: pgcrypto extension is installed in `extensions` schema (Supabase default) but the RPC function sets `search_path = public`, so gen_random_bytes() is not visible
test: check migration for schema-qualified extension creation and function search_path
expecting: migration creates pgcrypto without schema qualifier; function uses restricted search_path
next_action: return diagnosis with fix direction

## Symptoms

expected: POST /rpc/create_family_invite creates an invite token and returns it
actual: PostgreSQL error 42883 — "function gen_random_bytes(integer) does not exist"
errors: error code 42883 (undefined_function) from create_family_invite RPC
reproduction: call create_family_invite via Supabase client
started: likely always broken in production (pgcrypto in wrong schema)

## Eliminated

(none — first hypothesis confirmed)

## Evidence

- timestamp: 2026-03-10
  checked: supabase/migrations/20260203090000_phase1_foundation.sql line 7
  found: `create extension if not exists pgcrypto;` — no schema specified
  implication: On hosted Supabase, extensions are installed into the `extensions` schema by default (not `public`). The `CREATE EXTENSION` without `SCHEMA public` means pgcrypto lands in whatever the default schema is for extensions on that platform.

- timestamp: 2026-03-10
  checked: supabase/migrations/20260203090000_phase1_foundation.sql lines 327-359
  found: create_family_invite function uses `set search_path = public` and calls `gen_random_bytes(32)` on line 348 and `digest(v_token, 'sha256')` on line 352
  implication: With search_path restricted to `public`, PostgreSQL cannot find gen_random_bytes() or digest() if pgcrypto is installed in the `extensions` schema. Both calls will fail.

- timestamp: 2026-03-10
  checked: supabase/migrations/20260310000000_fix_family_memberships.sql
  found: Migration adds DELETE policy for families table (admin-only), adds FK from family_memberships.user_id to profiles(user_id), and issues NOTIFY pgrst reload
  implication: The DELETE policy fix for family deletion IS present in migrations. If family deletion still fails on web, either (a) this migration hasn't been applied to the remote database, or (b) the app-side code has a different issue (e.g., wrong HTTP method, missing auth header).

- timestamp: 2026-03-10
  checked: all migration files for other CREATE EXTENSION statements
  found: pgcrypto is the only extension, created only once in phase1_foundation
  implication: no other migration fixes or re-creates the extension in a different schema

## Resolution

root_cause: |
  **Two issues identified:**

  **Issue 1 (gen_random_bytes failure):** The `create_family_invite` RPC function is defined with
  `set search_path = public` (line 331), but on hosted Supabase the `pgcrypto` extension is
  installed in the `extensions` schema (Supabase's default behavior). The migration on line 7
  runs `create extension if not exists pgcrypto` without specifying `SCHEMA public`, so the
  extension ends up in `extensions`. When the function executes `gen_random_bytes(32)` and
  `digest(v_token, 'sha256')`, PostgreSQL cannot find these functions because `extensions`
  is not in the search_path. This produces error 42883.

  **Issue 2 (family deletion):** The DELETE RLS policy was added in migration
  `20260310000000_fix_family_memberships.sql` and looks correct. If deletion still fails,
  verify this migration has been applied to the remote database (`supabase migration list`).

fix: |
  **For Issue 1, two possible approaches (pick one):**

  Option A — Add `extensions` to the function's search_path:
  ```sql
  CREATE OR REPLACE FUNCTION public.create_family_invite(...)
  ...
  SET search_path = public, extensions
  ```

  Option B — Schema-qualify the pgcrypto calls inside the function:
  ```sql
  v_token := encode(extensions.gen_random_bytes(32), 'hex');
  ...
  values (..., extensions.digest(v_token, 'sha256'), ...);
  ```

  `accept_family_invite` (line 362) also uses `digest()` on line 380 with `search_path = public`
  — confirmed same bug. Both functions need the fix.

  **For Issue 2:** Run `supabase migration list` to confirm the fix_family_memberships
  migration has been applied remotely. If not, push it.

verification: not yet verified — needs migration update and deployment
files_changed: []
