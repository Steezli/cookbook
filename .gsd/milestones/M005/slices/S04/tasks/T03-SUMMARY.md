---
id: T03
parent: S04
milestone: M005
provides:
  - Consistent auth pattern across all API modules (getUser for mutations, getSession for reads)
  - Standardized error handling (throw Supabase errors directly, no custom wrapping)
key_files:
  - src/features/ratings/api.ts
  - src/features/scan/scan-service.ts
  - src/features/units/api.ts
key_decisions:
  - "as Type" casts retained — domain types (Recipe, Collection, etc.) have richer typing than DB row types (Json columns), making casts structurally necessary
  - Standardized auth: getUser() for mutations (fresh server round-trip), getSession() for reads (cached, avoids unnecessary network call)
  - Standardized error handling: throw Supabase errors directly rather than wrapping in custom Error messages
patterns_established:
  - "Auth convention: getUser() for mutations, getSession() for reads, no auth for public reads / RLS-guarded operations"
  - "Error convention: throw Supabase error objects directly (they already contain descriptive messages)"
observability_surfaces:
  - none
duration: 10m
verification_result: passed
completed_at: 2026-03-14
blocker_discovered: false
---

# T03: Standardize API module patterns

**Standardized auth checking (getUser for mutations, getSession for reads) and error handling across all API modules.**

## What Happened

Audited all 6 API modules for auth and error handling consistency. Found 3 inconsistencies:

1. **ratings/api.ts** — `getUserRating` (a read) was using `getUser()`, switched to `getSession()` since reads don't need a fresh server round-trip.

2. **scan/scan-service.ts** — `createMultiPhotoScanJob` (a mutation) was using `getSession()`, switched to `getUser()` since mutations need a fresh, verified user identity.

3. **units/api.ts** — `getUnitPreference` (a read) was using `getUser()`, switched to `getSession()`. Also standardized error handling: was wrapping Supabase errors in custom `new Error()` messages, switched to `throw error` to match all other modules. Removed separate `authError` checking in favor of the standard `!session?.user` / `!user` pattern.

Investigated `as Type` casts across all modules. These are structurally necessary because domain types (e.g., `Recipe` with `RecipeIngredient[]`) have richer typing than the auto-generated Supabase DB row types (which use `Json` for JSONB columns). Removing them would require either loosening domain types or maintaining manual generic overrides — neither is worth the trade-off.

## Verification

- `npx tsc --noEmit` — exits 0 ✅
- `npx jest` — 602 tests passing, 28 suites ✅
- Manual audit: all mutations use `getUser()`, all authenticated reads use `getSession()`, all error throws are consistent

## Diagnostics

None — pure refactor with no new runtime surfaces.

## Deviations

- Extended scope to include `units/api.ts` which wasn't in the task file list but had the same inconsistencies (auth pattern + non-standard error wrapping).
- `as Type` casts were not removed since they're structurally necessary (domain types ≠ DB row types). Documented as a pattern decision.

## Known Issues

None.

## Files Created/Modified

- `src/features/ratings/api.ts` — Switched getUserRating from getUser() to getSession()
- `src/features/scan/scan-service.ts` — Switched createMultiPhotoScanJob from getSession() to getUser()
- `src/features/units/api.ts` — Switched getUnitPreference to getSession(), standardized error handling to throw directly
