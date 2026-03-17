# S01: Supabase Scan Count Infrastructure

**Goal:** Track per-user scan counts server-side with an atomic Postgres RPC, typed client wrappers, a `ScanLimitError` class, and passing Jest tests that prove the business contract.
**Demo:** `npx jest src/features/subscriptions/__tests__/scan-count.test.ts src/features/scan/__tests__/scan-limit-error.test.ts` passes; migration file is well-formed; `ScanLimitError` is exported and typed.

## Must-Haves

- `supabase/migrations/20260317000000_add_scan_counts.sql` — `user_scan_counts` table with RLS + `increment_scan_count` RPC
- `src/features/subscriptions/scan-count.ts` — `getScanCount(userId)` and `incrementScanCount(userId)` client wrappers
- `src/features/scan/errors.ts` — `ScanLimitError` typed class, named export
- Jest tests: count increments from 0 → 1 → 3; fourth call from count=3 triggers `ScanLimitError`; `getScanCount` returns current-month value; `incrementScanCount` throws `ScanLimitError` when count would reach 4
- `npx tsc --noEmit` exits 0
- `npx jest` passes with no regressions

## Proof Level

- This slice proves: contract
- Real runtime required: no (Postgres migration must be deployed to remote before milestone DoD, but Jest proves the client contract)
- Human/UAT required: no

## Verification

- `npx jest src/features/subscriptions/__tests__/scan-count.test.ts --no-coverage` — all tests pass
- `npx tsc --noEmit` — exits 0
- `cat supabase/migrations/20260317000000_add_scan_counts.sql` — file exists, contains `user_scan_counts` table and `increment_scan_count` function with `ON CONFLICT DO UPDATE`
- `npx jest` — full suite passes (no regressions, 602+ tests)

## Observability / Diagnostics

- Runtime signals: `ScanLimitError` is a named typed class — callers can `instanceof` check to distinguish limit-reached from other errors
- Inspection surfaces: `user_scan_counts` table directly queryable in Supabase dashboard; `getScanCount(userId)` returns current count for any user
- Failure visibility: `incrementScanCount` throws `ScanLimitError` with `currentCount` property visible at throw site; Supabase RPC errors propagate as thrown Error objects
- Redaction constraints: `user_id` is a UUID — not PII; no secrets in scan count logic

## Integration Closure

- Upstream surfaces consumed: none (first slice)
- New wiring introduced in this slice: none — client wrappers are pure modules; no app-level wiring until S02/S03
- What remains before the milestone is truly usable end-to-end: S02 (RevenueCat SDK + SubscriptionContext), S03 (scan gating in createMultiPhotoScanJob), remote migration deployment + type regeneration

## Tasks

- [x] **T01: Write Supabase migration and Jest test skeletons** `est:30m`
  - Why: Migration defines the schema contract; failing tests define acceptance criteria before any implementation
  - Files: `supabase/migrations/20260317000000_add_scan_counts.sql`, `src/features/subscriptions/__tests__/scan-count.test.ts`
  - Do: Write migration with `user_scan_counts` table (user_id uuid, year_month text, count integer, primary key, unique(user_id,year_month), RLS enabled, select/update policy for auth.uid()). Write `increment_scan_count(p_user_id uuid)` RPC: `security invoker`, `set search_path = ''`, `language plpgsql`, upsert with `ON CONFLICT (user_id, year_month) DO UPDATE SET count = user_scan_counts.count + 1`, return new count. Write test file with `jest.mock('@/lib/supabase')` following scan-service.test.ts pattern; define `mockRpc`; write 5 tests (all initially failing): getScanCount returns 0 for new user, getScanCount returns current month count, incrementScanCount returns new count, incrementScanCount throws ScanLimitError when rpc returns count=4, incrementScanCount propagates rpc errors.
  - Verify: `npx jest src/features/subscriptions/__tests__/scan-count.test.ts` — tests fail with "Cannot find module" (expected at this stage)
  - Done when: Migration file is syntactically complete; test file exists with 5 named test cases that reference the not-yet-created module

- [x] **T02: Implement ScanLimitError and scan-count client wrappers** `est:45m`
  - Why: These are the two concrete deliverables that S02 and S03 will import
  - Files: `src/features/scan/errors.ts`, `src/features/subscriptions/scan-count.ts`
  - Do: Create `src/features/scan/errors.ts` exporting `ScanLimitError extends Error` with `name = 'ScanLimitError'` and `currentCount: number` property in constructor. Create `src/features/subscriptions/scan-count.ts` with `getScanCount(userId: string): Promise<number>` (calls `supabase.rpc('increment_scan_count')` — actually no: getScanCount should query `user_scan_counts` table directly for current month; use `supabase.from('user_scan_counts').select('count').eq('user_id', userId).eq('year_month', currentYearMonth()).maybeSingle()`) and `incrementScanCount(userId: string): Promise<number>` (calls `supabase.rpc('increment_scan_count', { p_user_id: userId })`, throws `ScanLimitError` when returned count > 3). Use `(supabase.rpc as Function)` cast per DECISIONS.md until types are regenerated. Export a private `currentYearMonth()` helper computing `new Date().toISOString().slice(0,7)` (YYYY-MM).
  - Verify: `npx tsc --noEmit` exits 0; `npx jest src/features/subscriptions/__tests__/scan-count.test.ts` — tests now fail with assertion errors (not import errors)
  - Done when: Both files exist, TypeScript compiles, mock-based tests reach the assertion stage

- [x] **T03: Wire Jest mocks and make all scan-count tests pass** `est:30m`
  - Why: Tests must pass to prove the business contract is correctly implemented
  - Files: `src/features/subscriptions/__tests__/scan-count.test.ts`
  - Do: Update the test file to properly mock `supabase.rpc` and `supabase.from` chains matching the actual implementation. Verify: (1) getScanCount returns 0 when no row exists (maybeSingle returns null), (2) getScanCount returns count from row, (3) incrementScanCount returns new_count from rpc, (4) incrementScanCount throws ScanLimitError with currentCount=4 when rpc returns 4, (5) incrementScanCount propagates non-limit errors. Run full suite to confirm no regressions.
  - Verify: `npx jest src/features/subscriptions/__tests__/scan-count.test.ts` — 5 tests pass; `npx jest` — full suite passes
  - Done when: All 5 scan-count tests green; zero regressions in full suite; `npx tsc --noEmit` exits 0

## Files Likely Touched

- `supabase/migrations/20260317000000_add_scan_counts.sql` (new)
- `src/features/scan/errors.ts` (new)
- `src/features/subscriptions/scan-count.ts` (new)
- `src/features/subscriptions/__tests__/scan-count.test.ts` (new)
