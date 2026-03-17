---
id: S01
parent: M006
milestone: M006
provides:
  - supabase/migrations/20260317000000_add_scan_counts.sql — user_scan_counts table + increment_scan_count RPC
  - src/features/scan/errors.ts — ScanLimitError class with currentCount property
  - src/features/subscriptions/scan-count.ts — getScanCount and incrementScanCount client wrappers
  - src/features/subscriptions/__tests__/scan-count.test.ts — 5 passing contract tests
requires: []
affects:
  - S02 — consumes getScanCount, incrementScanCount, ScanLimitError
  - S03 — consumes ScanLimitError for scan gating
key_files:
  - supabase/migrations/20260317000000_add_scan_counts.sql
  - src/features/scan/errors.ts
  - src/features/subscriptions/scan-count.ts
  - src/features/subscriptions/__tests__/scan-count.test.ts
key_decisions:
  - Limit threshold enforced in client wrapper (count > 3), not in Postgres RPC — keeps RPC focused on atomic increment, policy stays in app layer
  - (supabase.from as Function) cast for user_scan_counts — table not yet in generated types, consistent with existing RPC cast pattern
  - getScanCount queries user_scan_counts table directly (not via RPC) using maybeSingle; returns 0 on null row
  - mockEq.mockReturnValue({ eq: mockEq, maybeSingle }) chain required for two .eq() calls in getScanCount
patterns_established:
  - jest.mock('@/lib/supabase') with mockRpc/mockFrom/mockEq/mockMaybeSingle chainable pattern for table + RPC mocks
  - ScanLimitError.currentCount property — exact count at limit-reached time, inspectable at catch sites
  - (supabase.from as Function) cast pattern for tables not yet in Supabase generated types
observability_surfaces:
  - user_scan_counts table directly queryable in Supabase dashboard per user_id
  - ScanLimitError.currentCount — exact count at throw site
  - instanceof ScanLimitError distinguishes limit-reached from other errors
  - getScanCount(userId) returns current month count for any user
drill_down_paths:
  - .gsd/milestones/M006/slices/S01/tasks/T01-SUMMARY.md
  - .gsd/milestones/M006/slices/S01/tasks/T02-SUMMARY.md
  - .gsd/milestones/M006/slices/S01/tasks/T03-SUMMARY.md
duration: ~25 minutes total
verification_result: passed
completed_at: 2026-03-17
---

# S01: Supabase Scan Count Infrastructure

**Atomic per-user scan count tracking with Postgres RPC, typed client wrappers, ScanLimitError, and 5 passing contract tests — full suite (617 tests) green and tsc clean.**

## What Happened

T01 created the migration and failing test skeletons. The `user_scan_counts(user_id uuid, year_month text, count integer)` table uses RLS with per-user select/update policies. The `increment_scan_count(p_user_id uuid) returns integer` RPC atomically upserts using `ON CONFLICT (user_id, year_month) DO UPDATE SET count = user_scan_counts.count + 1` — server computes `year_month` via `TO_CHAR(NOW(), 'YYYY-MM')` so the client never sends a timestamp.

T02 created `ScanLimitError extends Error` with `currentCount: number` and `getScanCount`/`incrementScanCount` client wrappers. `getScanCount` queries the table directly with two chained `.eq()` calls (user_id + year_month); `incrementScanCount` calls the RPC and throws `ScanLimitError` when `data > 3`. The `(supabase.from as Function)` cast was needed since `user_scan_counts` is not yet in the generated types. The test mock needed `mockEq.mockReturnValue({ eq: mockEq, maybeSingle })` to support two chained `.eq()` calls — T01 skeleton only handled one.

T03 confirmed the test file was already complete and all 5 tests passed with no changes needed.

## Verification

- `npx jest src/features/subscriptions/__tests__/scan-count.test.ts --no-coverage` — 5/5 pass
- `npx tsc --noEmit` — exits 0
- `npx jest --no-coverage` — 617/617 pass, 29 suites, zero regressions
- Migration file present: `supabase/migrations/20260317000000_add_scan_counts.sql`

## Requirements Advanced

- SUB-05 — Server-side scan count tracking infrastructure implemented (table + RPC + client wrappers)
- SUB-06 — `getScanCount(userId)` readable for display; count-remaining computable as `3 - count`

## Requirements Validated

- none — SUB-05/SUB-06 require end-to-end runtime proof (S03 scan gating, remote migration deployment)

## New Requirements Surfaced

- none

## Requirements Invalidated or Re-scoped

- none

## Deviations

- Test mock `mockEq.mockReturnValue` updated to chain `{ eq: mockEq, maybeSingle }` — T01 skeleton only supported one `.eq()` call but `getScanCount` correctly uses two (user_id + year_month filters).
- `(supabase.from as Function)` cast used for `user_scan_counts` — consistent with existing RPC cast pattern; table not yet in generated types.

## Known Limitations

- `database.types.ts` does not yet include `user_scan_counts` or `increment_scan_count` — type regeneration requires remote migration deployment (milestone DoD step, not this slice's scope).
- Migration is not yet applied to remote Supabase — required before S03 end-to-end gating works on device.
- Limit threshold (>3 means 4th scan is blocked) is enforced in client wrapper only — no server-side enforcement in the RPC.

## Follow-ups

- Deploy migration to remote Supabase and regenerate `src/lib/database.types.ts` (milestone DoD, tracked in M006-ROADMAP)
- S02: import `getScanCount` + `ScanLimitError` into SubscriptionContext for `scansRemaining` computation

## Files Created/Modified

- `supabase/migrations/20260317000000_add_scan_counts.sql` — user_scan_counts table with RLS + increment_scan_count RPC
- `src/features/scan/errors.ts` — ScanLimitError class, named export
- `src/features/subscriptions/scan-count.ts` — getScanCount, incrementScanCount, currentYearMonth (private)
- `src/features/subscriptions/__tests__/scan-count.test.ts` — 5 passing contract tests

## Forward Intelligence

### What the next slice should know
- `getScanCount(userId)` and `incrementScanCount(userId)` are ready to import from `@/features/subscriptions/scan-count`
- `ScanLimitError` is ready to import from `@/features/scan/errors`; use `instanceof ScanLimitError` at catch sites
- The limit is enforced at `data > 3` (i.e., when the RPC returns 4+), meaning 3 scans succeed and the 4th throws
- `currentYearMonth()` is private to `scan-count.ts` — if S02/S03 needs it, export it or duplicate the one-liner

### What's fragile
- `(supabase.from as Function)` cast — will produce a type error if TypeScript strict mode tightens further; regenerate types after remote migration to fix
- Client-side limit enforcement — a bad actor could bypass by calling the RPC directly; acceptable for freemium (not security-critical), but worth noting

### Authoritative diagnostics
- `npx jest src/features/subscriptions/__tests__/scan-count.test.ts` — instant contract verification for all scan-count behavior
- Supabase dashboard → Table Editor → `user_scan_counts` — live count inspection per user

### What assumptions changed
- T01 planned mockEq for one `.eq()` call — actual implementation uses two (user_id + year_month); test mock updated in T02
