# M006/S01: Supabase Scan Count Infrastructure — Research

**Date:** 2026-03-17

## Summary

S01 is a pure Supabase + Jest slice with zero native build requirements. The deliverables are: a migration adding `user_scan_counts` table + `increment_scan_count` RPC, regenerated `database.types.ts`, two client wrapper functions, a typed `ScanLimitError` class, and Jest tests covering the core contract. Nothing in this slice requires RevenueCat, EAS builds, or any UI change.

The Postgres RPC pattern is already established in the project — `increment_retry_count` (scan_photos_storage migration) and `reorder_recipe_photos` are direct models to follow. The key design decision (already locked in DECISIONS.md) is: `ON CONFLICT DO UPDATE` for atomic upsert, `year_month TEXT` computed server-side via `TO_CHAR(NOW(), 'YYYY-MM')`, and counting at job-insert time (not recipe extraction). The gate insertion point in `createMultiPhotoScanJob` is clear — before the `scan_jobs` insert.

The client wrapper functions live in a new `src/features/subscriptions/` directory (the boundary map specifies `src/features/subscriptions/scan-count.ts`). `ScanLimitError` goes in `src/features/scan/errors.ts` alongside the existing scan feature. Jest tests mock `supabase.rpc()` following the same mock pattern already used in `scan-service` tests.

## Recommendation

Write the migration first, then the client wrappers, then `ScanLimitError`, then the Jest tests. The migration sets the schema contract everything else depends on. Use `security invoker` + `set search_path = ''` (matching `reorder_recipe_photos` pattern) for the RPC rather than `security definer` — RLS handles row-level access, the RPC just provides atomicity. The RPC accepts only `p_user_id uuid` and computes `year_month` server-side; reject any design that accepts a client-supplied month string.

For Jest tests, mock `supabase.rpc` to return controlled counts and verify: first scan returns 1, third scan returns 3, fourth scan triggers `ScanLimitError`, month change (different `year_month` key) resets count. The tests prove the client-side logic around the RPC — not the Postgres function itself (that's verified by the migration being deployable).

## Don't Hand-Roll

| Problem | Existing Solution | Why Use It |
|---------|------------------|------------|
| Atomic increment without read-then-write race | `ON CONFLICT DO UPDATE SET count = user_scan_counts.count + 1` in Postgres RPC | Client-side read-then-update has TOCTOU race; two simultaneous uploads both read count=2 and both succeed at count=3 limit |
| Month rollover without cron jobs | `year_month TEXT` computed via `TO_CHAR(NOW(), 'YYYY-MM')` | No reset logic, no cron, no migration needed on month boundary; new month auto-starts at 0 |
| RPC calling pattern | `supabase.rpc('increment_scan_count', { p_user_id })` | Supabase JS client `.rpc()` is the established call pattern; typed via generated `database.types.ts` |

## Existing Code and Patterns

- `supabase/migrations/20260314000000_reorder_recipe_photos_rpc.sql` — **primary RPC template**: `security invoker`, `set search_path = ''`, `language plpgsql`. Mirror this structure for `increment_scan_count`.
- `supabase/migrations/20260204050000_scan_photos_storage.sql` (lines 46–71) — `increment_retry_count` RPC using `UPDATE ... RETURNING` pattern — reference for counter increment; note it uses `security definer` which is less preferred; use `security invoker` instead.
- `src/features/scan/__tests__/` — existing test files show the `jest.mock('@/lib/supabase', ...)` mock pattern with chainable mocks for `.from()`. The `.rpc()` mock follows the same structure: `mockRpc.mockResolvedValue({ data: <value>, error: null })`.
- `src/features/scan/scan-service.ts` `createMultiPhotoScanJob()` — **gate insertion point**: after `getUser()` call, before `supabase.from('scan_jobs').insert(...)`. This is lines 20–38; the scan count check + increment goes here.
- `src/lib/database.types.ts` — 1820-line generated file; after migration, regenerate with `supabase gen types typescript --project-id <id> > src/lib/database.types.ts`. The new `user_scan_counts` table and `increment_scan_count` function will appear in the `public` schema section.
- `supabase/migrations/20260314300000_simplified_family_invites.sql` — shows `ON CONFLICT ... DO NOTHING` upsert pattern; `increment_scan_count` needs `ON CONFLICT DO UPDATE SET count = ... + 1` (not DO NOTHING).

## Constraints

- The RPC must compute `year_month` server-side — no client-provided date/month parameter. Prevents client clock spoofing.
- `ScanLimitError` must be a typed class (not a string throw) so `createMultiPhotoScanJob` callers and the scan UI can `instanceof` check it to distinguish limit-reached from other errors.
- `src/features/subscriptions/` directory does not exist yet — create it. `scan-count.ts` is the first file in this feature directory.
- Migration timestamp: `20260317000000_add_scan_counts.sql` (per roadmap boundary map).
- RLS policy: users can read and update only their own rows (`user_id = auth.uid()`). The RPC runs as invoker, so RLS is automatically enforced.
- `database.types.ts` regeneration requires remote Supabase access — document the regeneration command but the actual regeneration against remote is a deployment step. For local development, the types can be manually extended or the `rpc` call cast with `(supabase.rpc as Function)` per the established pattern in DECISIONS.md.
- Jest tests run in Node.js environment — mock `supabase.rpc` entirely, do not attempt real DB calls.

## Common Pitfalls

- **`security definer` on the RPC** — Using `security definer` (like `increment_retry_count`) bypasses RLS and runs as the function owner. For `increment_scan_count`, use `security invoker` so RLS naturally restricts users to their own rows. The RPC only provides atomicity, not privilege escalation.
- **Accepting `p_year_month` as a parameter** — Even if convenient for testing, accepting the month from the client enables spoofing historical months to reset the counter. Compute it server-side only.
- **`getScanCount` returning stale data** — `getScanCount` should query the current month's row directly, not cache. The value changes after `incrementScanCount` calls.
- **Missing UNIQUE constraint** — Without `UNIQUE (user_id, year_month)`, `ON CONFLICT DO UPDATE` has no conflict target and the upsert fails. The constraint is required for the atomic increment pattern.
- **`ScanLimitError` not exported from scan/errors.ts** — S02 and S03 both import it. Export it cleanly from `src/features/scan/errors.ts` as a named export; don't bury it in a re-export barrel.
- **Counting at edge function completion instead of job insert** — The decision is to count at `createMultiPhotoScanJob` insert time (photo upload success). Don't place the increment in the edge function or in any post-processing step.

## Open Risks

- `database.types.ts` regeneration against the live remote DB is a deployment-time step. Until the migration is applied to remote, the generated types won't include `user_scan_counts` or `increment_scan_count`. Development can proceed with a `(supabase.rpc as Function)` cast, but the milestone DoD requires regenerated types applied to remote.
- The `supabase/migrations/` timestamp `20260317000000` assumes no other migration is created with the same timestamp. Verify no conflicts before deploying.
- If `createMultiPhotoScanJob` is called from any path other than the main scan upload flow (e.g., test utilities, future batch tools), those callers will also hit the scan limit gate. This is correct behavior but test utilities that call `createMultiPhotoScanJob` directly will need to mock `incrementScanCount`.

## Skills Discovered

| Technology | Skill | Status |
|------------|-------|--------|
| Supabase migrations / RPC | none installed | none found — use existing project patterns |
| Jest (existing) | none needed | project already has 602 passing tests |

## Sources

- `increment_retry_count` RPC pattern (source: `supabase/migrations/20260204050000_scan_photos_storage.sql`)
- `reorder_recipe_photos` `security invoker` + `set search_path` pattern (source: `supabase/migrations/20260314000000_reorder_recipe_photos_rpc.sql`)
- Supabase mock pattern for Jest (source: `src/features/scan/__tests__/`)
- Gate insertion point (source: `src/features/scan/scan-service.ts` `createMultiPhotoScanJob`)
- `year_month TEXT` + atomic upsert decision (source: `.gsd/DECISIONS.md` M006 section)
