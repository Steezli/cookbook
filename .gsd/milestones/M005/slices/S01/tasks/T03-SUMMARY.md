---
id: T03
parent: S01
milestone: M005
provides:
  - backfillIngredients no longer mutates the input recipe object
  - Ownership pre-check skips backfill for non-owned recipes without an RLS round-trip
  - reorderRecipePhotos is atomic via single RPC transaction
key_files:
  - src/features/recipes/api.ts
  - src/features/recipes/photos.ts
  - supabase/migrations/20260314000000_reorder_recipe_photos_rpc.sql
key_decisions:
  - "Readonly<Recipe> parameter type enforces no-mutation contract at compile time"
  - "Pre-check ownership client-side rather than relying solely on RLS rejection — avoids wasted network round-trip"
  - "SQL RPC with security invoker for photo reorder — keeps RLS enforcement while gaining transactional atomicity"
patterns_established:
  - "Fire-and-forget background DB writes must never mutate the object passed to them — callers re-fetch if they need updated data"
  - "Use Supabase RPC for multi-row updates that need atomicity — individual Promise.all updates are not transactional"
observability_surfaces:
  - "RPC errors from reorder_recipe_photos surface through the standard Supabase error object — callers throw on failure"
  - "backfillIngredients swallows errors silently (background task) but the DB update is visible in Supabase query logs"
duration: 12m
verification_result: passed
completed_at: 2026-03-14
blocker_discovered: false
---

# T03: Fix backfillIngredients mutation and make photo reorder atomic

**Removed in-place recipe mutation from backfillIngredients and replaced N individual photo reorder updates with a single atomic RPC call.**

## What Happened

Two data integrity issues fixed:

1. **backfillIngredients mutation removed:** The function previously mutated `recipe.ingredients = updated` after a successful DB write. Since `getRecipeById` calls backfill via `void` (fire-and-forget), this mutated the object already returned to the caller, causing potential race conditions during React rendering. Fix: removed the mutation entirely, typed the parameter as `Readonly<Recipe>`, and added an ownership pre-check (`user.id !== recipe.owner_user_id`) so we skip the entire backfill path for recipes the user doesn't own — no wasted RLS-blocked request.

2. **Photo reorder atomicity:** `reorderRecipePhotos` sent N individual `UPDATE` queries via `Promise.all`. If any failed mid-batch, the photos would be left in an inconsistent sort order. Fix: created a `reorder_recipe_photos` Postgres RPC function (`security invoker`, `search_path = ''`) that loops through a JSONB array of `{id, sort_order}` updates inside a single transaction. The client now makes one `supabase.rpc()` call.

## Verification

- `npx tsc --noEmit` — exits 0 (clean)
- `npx jest` — 571 tests pass, 25 suites
- `rg "recipe\.ingredients\s*=" src/features/recipes/api.ts` — no matches (no in-place mutation)
- `rg "Promise\.all" src/features/recipes/photos.ts` — no matches (individual updates gone)
- `rg "ilike" src/features/recipes/search.ts` — all 3 calls use `escapeLikePattern()` (T01 intact)
- Slice verification partial: tsc ✅, jest ✅, ilike grep ✅

## Diagnostics

- **backfillIngredients:** Errors from the background DB update are silently swallowed (intentional for fire-and-forget). The update itself is visible in Supabase query logs if debugging is needed.
- **reorder_recipe_photos RPC:** Errors propagate through the standard Supabase error object. A failed RPC rolls back all sort_order changes (transactional). RLS is enforced per-row via `security invoker`.

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `src/features/recipes/api.ts` — Removed in-place mutation from backfillIngredients, added Readonly<Recipe> type, added ownership pre-check
- `src/features/recipes/photos.ts` — Replaced N individual updates with single RPC call in reorderRecipePhotos
- `supabase/migrations/20260314000000_reorder_recipe_photos_rpc.sql` — New RPC function for atomic photo reorder
