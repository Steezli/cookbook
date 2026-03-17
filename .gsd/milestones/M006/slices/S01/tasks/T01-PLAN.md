---
estimated_steps: 4
estimated_files: 2
---

# T01: Write Supabase migration and Jest test skeletons

**Slice:** S01 — Supabase Scan Count Infrastructure
**Milestone:** M006

## Description

Write the `user_scan_counts` migration and a Jest test file with 5 failing tests that define the acceptance criteria for the client wrappers. Tests should fail at import (module not found) — this is the correct red state before T02 implements the modules.

## Steps

1. Write `supabase/migrations/20260317000000_add_scan_counts.sql`: create `user_scan_counts` table (`user_id uuid not null references auth.users(id) on delete cascade`, `year_month text not null`, `count integer not null default 0`, `primary key (user_id, year_month)`), enable RLS, add select policy `using (auth.uid() = user_id)`, add update policy `using (auth.uid() = user_id)`. Create `increment_scan_count(p_user_id uuid) returns integer` RPC: `security invoker`, `set search_path = ''`, `language plpgsql`, upsert via `INSERT INTO public.user_scan_counts ... ON CONFLICT (user_id, year_month) DO UPDATE SET count = user_scan_counts.count + 1 RETURNING count INTO v_count`, return `v_count`.
2. Create `src/features/subscriptions/__tests__/` directory; write `scan-count.test.ts` with `jest.mock('@/lib/supabase', ...)` stub matching scan-service.test.ts pattern (mockRpc, mockFrom, mockMaybeSingle, mockEq).
3. Write 5 test cases (all will fail at import — correct): `getScanCount returns 0 when no row exists`, `getScanCount returns stored count`, `incrementScanCount returns new count from RPC`, `incrementScanCount throws ScanLimitError when count exceeds 3`, `incrementScanCount propagates RPC errors`.
4. Run `npx jest src/features/subscriptions/__tests__/scan-count.test.ts` and confirm it fails with "Cannot find module `@/features/subscriptions/scan-count`".

## Must-Haves

- [ ] Migration file exists at correct timestamp path
- [ ] `ON CONFLICT (user_id, year_month) DO UPDATE` atomic upsert in RPC
- [ ] `security invoker` (not definer) on RPC
- [ ] `set search_path = ''` on RPC
- [ ] RLS enabled on table with per-user policies
- [ ] Test file references `getScanCount` and `incrementScanCount` from `@/features/subscriptions/scan-count`
- [ ] Test file references `ScanLimitError` from `@/features/scan/errors`
- [ ] 5 distinct test cases present

## Verification

- `ls supabase/migrations/20260317000000_add_scan_counts.sql` exits 0
- `npx jest src/features/subscriptions/__tests__/scan-count.test.ts` fails with "Cannot find module" (expected)

## Observability Impact

- Signals added/changed: None at this task — migration defines the table; observability comes from the table itself being queryable
- How a future agent inspects this: `supabase/migrations/20260317000000_add_scan_counts.sql` is the schema source of truth
- Failure state exposed: None yet

## Inputs

- `supabase/migrations/20260314000000_reorder_recipe_photos_rpc.sql` — RPC structure template (security invoker, set search_path, language plpgsql)
- `src/features/scan/__tests__/scan-service.test.ts` — jest.mock pattern for supabase

## Expected Output

- `supabase/migrations/20260317000000_add_scan_counts.sql` — complete, deployable migration
- `src/features/subscriptions/__tests__/scan-count.test.ts` — 5 failing test cases (expected red state)
