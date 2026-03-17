---
estimated_steps: 4
estimated_files: 2
---

# T02: Implement ScanLimitError and scan-count client wrappers

**Slice:** S01 — Supabase Scan Count Infrastructure
**Milestone:** M006

## Description

Create the two concrete deliverables that S02 and S03 will import: `ScanLimitError` typed class and the `getScanCount` / `incrementScanCount` client wrappers. After this task, TypeScript compiles and tests reach assertion failures (not import errors).

## Steps

1. Create `src/features/scan/errors.ts`: export `ScanLimitError extends Error` with `name = 'ScanLimitError'` and `constructor(public readonly currentCount: number)` that calls `super(\`Scan limit reached: \${currentCount} scans used this month\`)`.
2. Create `src/features/subscriptions/scan-count.ts`: import `supabase` from `@/lib/supabase` and `ScanLimitError` from `@/features/scan/errors`. Implement private `currentYearMonth(): string` returning `new Date().toISOString().slice(0, 7)`. Implement `getScanCount(userId: string): Promise<number>` — query `user_scan_counts` for current month via `supabase.from('user_scan_counts').select('count').eq('user_id', userId).eq('year_month', currentYearMonth()).maybeSingle()`; return `data?.count ?? 0`. Implement `incrementScanCount(userId: string): Promise<number>` — call `(supabase.rpc as Function)('increment_scan_count', { p_user_id: userId })`; if `error` throw it; if `data > 3` throw `new ScanLimitError(data)`; return `data`.
3. Run `npx tsc --noEmit` and fix any type errors.
4. Run `npx jest src/features/subscriptions/__tests__/scan-count.test.ts` — tests should now fail with assertion errors (not import errors).

## Must-Haves

- [ ] `ScanLimitError` extends `Error` with `currentCount: number` property
- [ ] `ScanLimitError` has `name = 'ScanLimitError'` for reliable `instanceof` checks
- [ ] `getScanCount` queries current month only (uses `currentYearMonth()`)
- [ ] `getScanCount` returns 0 when no row exists (handles `null` from `maybeSingle`)
- [ ] `incrementScanCount` uses `(supabase.rpc as Function)` cast per DECISIONS.md
- [ ] `incrementScanCount` throws `ScanLimitError` when returned count > 3
- [ ] `ScanLimitError` exported as named export from `src/features/scan/errors.ts`
- [ ] `npx tsc --noEmit` exits 0

## Verification

- `npx tsc --noEmit` exits 0
- `npx jest src/features/subscriptions/__tests__/scan-count.test.ts` — tests fail with assertion errors (correct — mocks not yet wired)

## Observability Impact

- Signals added/changed: `ScanLimitError` with `currentCount` property — callers can inspect the count at limit-reached time
- How a future agent inspects this: `instanceof ScanLimitError` check at catch sites; `error.currentCount` gives the exact count
- Failure state exposed: `ScanLimitError.currentCount` is the observable failure state for limit-reached scenarios

## Inputs

- `supabase/migrations/20260317000000_add_scan_counts.sql` (from T01) — defines RPC name `increment_scan_count` and param `p_user_id`
- `src/features/scan/__tests__/scan-service.test.ts` — confirms `(supabase.rpc as Function)` cast pattern is established
- `.gsd/DECISIONS.md` M006 section — confirms limit is 3 free scans

## Expected Output

- `src/features/scan/errors.ts` — `ScanLimitError` class, named export
- `src/features/subscriptions/scan-count.ts` — `getScanCount`, `incrementScanCount`, `currentYearMonth` (private)
