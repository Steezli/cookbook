# Feature: Phase 02 Gap Closures (Collections UI + List Thumbnails)

**Created:** 2026-02-03  
**Status:** Planned (gap closure)  
**Priority:** High (blocks Phase 02 verification)  
**Phase:** Phase 02 — Recipe Core (Create + Organize + Find)  
**Source:** `.planning/phases/02-recipe-core-create-+-organize-+-find/02-recipe-core-create-+-organize-+-find-VERIFICATION.md`

---

## Incoming Request

**From:** Phase verification report (gsd-verifier)  
**Date:** 2026-02-03  
**Context:** Phase 02 is functionally close but failed verification because key “organize + browse” UX gaps remain:

- Collections: user-facing recipe-to-collection management is incomplete
- Photos: recipe list thumbnails are deferred and not shown in lists

---

## Problem Statement

### Gaps (verifier-reported)

1. **Collections grouping UI is incomplete**
   - Collections exist and can be created, but there’s no clear UI for users to add/remove/manage recipe membership in collections from their day-to-day browsing flows.

2. **Recipe list thumbnails are missing**
   - Photo upload + detail gallery work, but list screens don’t show thumbnails.

---

## PM Routing Decision

**Timestamp:** 2026-02-03

### Why this matters

These gaps prevent Phase 02 from meeting its goal: “Users can build and manage a recipe library.”  
Collections are the core “organize” affordance, and thumbnails materially improve browsing and recognition.

### Routing

- **Planner (this change set):** Create gap-closure `PLAN.md` prompts targeting only the missing wiring/UI.
- **Frontend Developer (execution):** Implement UI + wiring in app screens using existing `src/features/*` API modules.
- **Tech Lead (review):** Confirm flows meet verifier truths and don’t regress RLS/visibility guarantees.

### Files expected to be modified (execution-time)

- `app/recipes/index.tsx`
- `src/features/recipes/photos.ts`
- `app/recipes/[id].tsx`
- `app/collections/[id].tsx`
- (optional) `src/features/collections/api.ts` (only if new helper needed)

---

## Planned Work Artifacts

Gap closure plans will be added to:

- `.planning/phases/02-recipe-core-create-+-organize-+-find/02-05-PLAN.md`
- `.planning/phases/02-recipe-core-create-+-organize-+-find/02-06-PLAN.md`

---

## Success Criteria

1. ✅ **Recipe lists show thumbnails** for recipes that have photos.
2. ✅ **Users can add/remove recipes from collections** via clear UI, without needing “hidden” flows.
3. ✅ Phase 02 verifier must-haves pass after executing the gap closure plans.

---

## Frontend Implementation

**Timestamp:** 2026-02-03

### Specialist: Frontend Developer

Implemented the Phase 02 gap-closure UI wiring using existing feature APIs (no schema/RLS changes):

- **Collections membership management**
  - Recipe detail now loads current collection membership and allows add/remove per collection.
  - Collection detail now includes an owner-only “Add recipes” search flow to add multiple recipes without navigating into each recipe.
- **Recipe list thumbnails**
  - Added a list-friendly thumbnail fetch helper (single query over `recipe_photos` for a recipe-id set).
  - Recipe list renders thumbnails (or a placeholder) per recipe card.

### Files modified

- `app/recipes/[id].tsx`
- `app/collections/[id].tsx`
- `app/recipes/index.tsx`
- `src/features/recipes/photos.ts`

### Notes / constraints honored

- **RLS respected**: all reads/writes continue to rely on existing Supabase policies.
- **No N+1 thumbnails**: list thumbnails fetched with a single additional `recipe_photos` query for the visible list.

