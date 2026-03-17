# S01: Supabase Scan Count Infrastructure — UAT

**Milestone:** M006
**Written:** 2026-03-17

## UAT Type

- UAT mode: artifact-driven
- Why this mode is sufficient: S01 proves a contract — the Postgres migration is schema-only and the client wrappers are pure async functions. Jest tests with mocked Supabase client cover all business rules (count increment, limit detection, month key, error propagation). No live runtime is needed to prove the contract; runtime proof deferred to S03 (scan gating) and milestone DoD (remote migration deployment).

## Preconditions

- Node modules installed (`npm install`)
- Jest configured (existing project setup)
- No Supabase connection required — all tests use mocked client

## Smoke Test

```
npx jest src/features/subscriptions/__tests__/scan-count.test.ts --no-coverage
```

Expected: 5 tests pass, 0 failures.

## Test Cases

### 1. getScanCount returns 0 for new user

1. Mock `supabase.from('user_scan_counts')` → `.eq().eq().maybeSingle()` returns `{ data: null, error: null }`
2. Call `getScanCount('user-123')`
3. **Expected:** Returns `0`

### 2. getScanCount returns stored count

1. Mock maybeSingle returns `{ data: { count: 2 }, error: null }`
2. Call `getScanCount('user-123')`
3. **Expected:** Returns `2`

### 3. incrementScanCount returns new count from RPC

1. Mock `supabase.rpc('increment_scan_count', { p_user_id: 'user-123' })` returns `{ data: 2, error: null }`
2. Call `incrementScanCount('user-123')`
3. **Expected:** Returns `2`

### 4. incrementScanCount throws ScanLimitError when count exceeds 3

1. Mock RPC returns `{ data: 4, error: null }`
2. Call `incrementScanCount('user-123')`
3. **Expected:** Throws `ScanLimitError` with `currentCount === 4`; `instanceof ScanLimitError` is `true`

### 5. incrementScanCount propagates RPC errors

1. Mock RPC returns `{ data: null, error: { message: 'db error' } }`
2. Call `incrementScanCount('user-123')`
3. **Expected:** Throws `Error` with message containing 'db error'; NOT a `ScanLimitError`

## Edge Cases

### ScanLimitError identity

1. Import `ScanLimitError` from `@/features/scan/errors`
2. Catch an error thrown by `incrementScanCount` at the limit
3. **Expected:** `error instanceof ScanLimitError === true`; `error.name === 'ScanLimitError'`; `error.currentCount` is a number

### Month key rollover (implicit)

The RPC computes `year_month` server-side via `TO_CHAR(NOW(), 'YYYY-MM')` — client never sends a timestamp. A new calendar month automatically starts a fresh row via `ON CONFLICT DO UPDATE` (new row = new year_month). No explicit test needed; the Postgres upsert logic handles this structurally.

## Failure Signals

- Any test import failure → implementation file missing or wrong path
- `ScanLimitError` not thrown at count=4 → limit threshold off-by-one in `incrementScanCount`
- `getScanCount` returns wrong value → `.eq()` chain mock not set up for two calls
- `npx tsc --noEmit` errors → `(supabase.from as Function)` cast removed or type conflict introduced

## Requirements Proved By This UAT

- SUB-05 (partial) — Server-side scan count infrastructure is correct: count increments atomically, limit is detectable at count=4, month key is server-computed. Client wrapper contract proven.
- SUB-06 (partial) — `getScanCount(userId)` returns current month count, enabling remaining-scans display (`3 - count`).

## Not Proven By This UAT

- End-to-end scan gating in `createMultiPhotoScanJob` — proven in S03
- Actual Supabase remote behavior (RLS, ON CONFLICT atomicity under concurrent writes) — proven at milestone DoD via remote migration deployment
- Remaining scan count display on scan upload screen — proven in S03
- Month rollover in production (real calendar boundary) — structural proof only; live proof at milestone DoD

## Notes for Tester

- All tests run fully offline against mocked Supabase — no credentials or network needed
- The migration file (`supabase/migrations/20260317000000_add_scan_counts.sql`) must be manually deployed to remote Supabase before S03 end-to-end gating works; this is tracked as a milestone DoD step, not a slice requirement
- `(supabase.from as Function)` cast is intentional until `database.types.ts` is regenerated post-migration
