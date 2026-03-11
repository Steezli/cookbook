# T11: 12-remaining-screens 11

**Slice:** S12 — **Milestone:** M001

## Description

Fix two UAT blockers/majors: family invite RPC failure (Test 9, gen_random_bytes not found due to search_path missing extensions schema) and unit preference having no effect on legacy ingredients (Test 15, displayIngredient skips ingredients without structured amount/unit).

Purpose: Unblock family invite creation and make unit conversion work for all recipe data, including legacy recipes stored as plain text.
Output: Migration file for search_path fix, updated displayIngredient in both recipe detail and cook mode.

## Must-Haves

- [ ] "create_family_invite and accept_family_invite RPCs can call gen_random_bytes and digest without error"
- [ ] "Unit preference toggle changes how legacy ingredients (no structured amount/unit) display on recipe detail and cook mode"

## Files

- `supabase/migrations/20260310100000_fix_rpc_search_path.sql`
- `app/(tabs)/recipes/[id].tsx`
- `app/(tabs)/recipes/[id]/cook.tsx`
