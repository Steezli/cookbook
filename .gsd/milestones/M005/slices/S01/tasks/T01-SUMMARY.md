---
id: T01
parent: S01
milestone: M005
provides:
  - escapeLikePattern helper for safe LIKE/ILIKE queries
  - All search ilike calls protected against pattern injection
key_files:
  - src/features/recipes/search.ts
  - src/features/recipes/__tests__/searchPublicRecipes.test.ts
key_decisions:
  - Escape at call site rather than in a query builder wrapper — keeps change minimal and auditable
patterns_established:
  - Always wrap user input with escapeLikePattern() before passing to ilike()
observability_surfaces:
  - none (pure query-building fix, no runtime logging needed)
duration: 10m
verification_result: passed
completed_at: 2026-03-14
blocker_discovered: false
---

# T01: Fix LIKE pattern injection in search functions

**Added `escapeLikePattern()` helper and applied it to all 3 `ilike` call sites in search.ts, preventing `%` and `_` in user queries from acting as SQL wildcards.**

## What Happened

User input containing `%`, `_`, or `\` was interpolated directly into PostgreSQL `ilike` patterns in `searchRecipes()`, `searchPublicRecipes()`, and `getPublicRecipeCount()`. A query of just `%` would match every recipe title.

Created an exported `escapeLikePattern()` function that escapes `\` → `\\`, `%` → `\%`, and `_` → `\_` (in that order to avoid double-escaping). Applied it at all 3 ilike call sites. Added 11 new tests covering the helper (7 unit tests) and the injection prevention in search functions (4 integration tests).

## Verification

- `npx tsc --noEmit` — exits 0
- `npx jest` — 559 tests pass (548 existing + 11 new)
- `grep -n 'ilike' src/features/recipes/search.ts | grep -v 'escapeLikePattern'` — returns empty (no unescaped ilike calls)
- New tests confirm `%` query produces `%\%%` pattern, `_` produces `%\_%`, mixed strings escape correctly

### Slice-level verification status

- ✅ `npx tsc --noEmit` exits 0
- ✅ `npx jest` — all tests pass
- ✅ New test: search with `%` and `_` characters returns correct results
- ⬜ New test: retry logic respects max_retries boundary (T02)
- ✅ Grep confirms no unescaped ilike interpolation in search.ts

## Diagnostics

None needed — this is a pure query-building fix. The escaped patterns are visible in Supabase query logs if debugging is required.

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `src/features/recipes/search.ts` — Added `escapeLikePattern()` export, applied to all 3 ilike call sites
- `src/features/recipes/__tests__/searchPublicRecipes.test.ts` — Added 11 tests: 7 for escapeLikePattern unit, 4 for injection prevention in search/count functions
