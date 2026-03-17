---
id: T01
parent: S01
milestone: M006
provides:
  - supabase/migrations/20260317000000_add_scan_counts.sql — user_scan_counts table + increment_scan_count RPC
  - src/features/subscriptions/__tests__/scan-count.test.ts — 5 failing test cases (expected red state)
key_files:
  - supabase/migrations/20260317000000_add_scan_counts.sql
  - src/features/subscriptions/__tests__/scan-count.test.ts
key_decisions:
  - RPC uses security invoker + set search_path = '' (consistent with existing RPCs)
  - Limit threshold (>3) enforced in client wrapper, not in Postgres RPC, for flexibility
patterns_established:
  - jest.mock('@/lib/supabase') with mockRpc/mockFrom/mockEq/mockMaybeSingle chainable pattern
observability_surfaces:
  - user_scan_counts table directly queryable in Supabase dashboard per user_id
duration: ~5 minutes
verification_result: passed
completed_at: 2026-03-17
blocker_discovered: false
---

# T01: Write Supabase migration and Jest test skeletons

**Migration and 5-test failing skeleton written; red state confirmed with "Cannot find module" errors.**

## What Happened

Created the `user_scan_counts` table migration with RLS + per-user select/update policies, and an `increment_scan_count(p_user_id uuid) returns integer` RPC using `ON CONFLICT DO UPDATE` for atomic upserts. The RPC follows the project's existing pattern: `security invoker`, `set search_path = ''`, `language plpgsql`.

Created the test file at `src/features/subscriptions/__tests__/scan-count.test.ts` with 5 test cases covering: `getScanCount` returning 0 for missing rows, `getScanCount` returning stored count, `incrementScanCount` returning the new count from RPC, `incrementScanCount` throwing `ScanLimitError` when count > 3, and `incrementScanCount` propagating RPC errors.

## Verification

```
npx jest src/features/subscriptions/__tests__/scan-count.test.ts
```

Fails with:
- `Cannot find module '@/features/subscriptions/scan-count'`
- `Cannot find module '@/features/scan/errors'`

This is the expected red state — both modules are implemented in T02.

Migration file confirmed present:
```
ls supabase/migrations/20260317000000_add_scan_counts.sql  # exits 0
```

## Diagnostics

- Migration: `supabase/migrations/20260317000000_add_scan_counts.sql` is the schema source of truth
- Tests define the acceptance contract for T02 (client wrapper + ScanLimitError implementation)

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `supabase/migrations/20260317000000_add_scan_counts.sql` — creates `user_scan_counts` table with RLS + `increment_scan_count` RPC
- `src/features/subscriptions/__tests__/scan-count.test.ts` — 5 failing test skeletons (expected red state)
