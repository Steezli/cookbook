---
id: T01
parent: S01
milestone: M003
provides:
  - Canonical shared type export at src/features/scan/types.ts
  - All consumers repointed to new import path
key_files:
  - src/features/scan/types.ts
  - src/features/scans/DraftEditor.tsx
  - src/features/scans/DraftReview.tsx
  - src/features/scans/DraftManager.tsx
  - src/lib/scan/scan-draft-service.ts
  - src/lib/ai/recipe-parsing-service.ts
  - src/lib/ai/confidence-scoring-service.ts
key_decisions:
  - Types imported via @/features/scan/types (absolute path alias) everywhere, including within the service files that originally defined them
patterns_established:
  - Shared scan types live in src/features/scan/types.ts — all new scan-related types should go here
observability_surfaces:
  - none — purely structural refactoring, no runtime behavior
duration: ~5 minutes
verification_result: passed
completed_at: 2026-03-12
blocker_discovered: false
---

# T01: Extract shared types to `src/features/scan/types.ts`

**Extracted 7 shared scan types to `src/features/scan/types.ts` and repointed all 5 consumer files.**

## What Happened

Created `src/features/scan/types.ts` containing all 7 shared type definitions:
- From `recipe-parsing-service.ts`: `ParsedRecipe`, `ParsedIngredient`, `FieldConfidence`
- From `confidence-scoring-service.ts`: `OverallConfidence`, `FieldScore`, `ConfidenceThresholds`, `ConfidenceEnhancement`

Repointed 5 consumer files to import from the new canonical location:
- `DraftReview.tsx` — `ParsedRecipe`, `FieldConfidence`
- `DraftEditor.tsx` — `ParsedRecipe`, `ParsedIngredient`
- `DraftManager.tsx` — `ParsedRecipe`
- `scan-draft-service.ts` — `ParsedRecipe`, `FieldConfidence`, `OverallConfidence`
- `confidence-scoring-service.ts` — `ParsedRecipe`, `ParsedIngredient`, `FieldConfidence`, `ConfidenceThresholds`, `FieldScore`, `OverallConfidence`

Removed type definitions from both service files and replaced with imports from the new types file. Service class code remains untouched (deletion happens in T03).

## Verification

- `npx tsc --noEmit` — exits 0, all imports resolve
- `npx jest --ci` — 502/502 tests pass
- `rg 'from.*recipe-parsing-service' src/ app/` — zero results (no imports from old file remain)
- `rg 'from.*confidence-scoring-service' src/ app/` — zero results (no imports from old file remain)
- `test -f src/features/scan/types.ts` — confirmed file exists

### Slice-level verification (partial — T01 of 4):
- ✅ `npx tsc --noEmit` exits 0
- ✅ `npx jest --ci` — 502 tests pass
- ⬜ `test ! -d src/features/scans/` — still exists (files move in T02)
- ✅ `test -f src/features/scan/types.ts` — exists
- ⬜ `test -f src/features/scan/DraftEditor.tsx` — not yet moved (T02)
- ⬜ `rg '@/features/scans/' src/ app/` — still has references (T02)
- ✅ `rg 'from.*recipe-parsing-service' src/ app/` — zero results

## Diagnostics

None — purely structural. `npx tsc --noEmit` will catch any broken import paths.

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `src/features/scan/types.ts` — **created** — canonical export for all 7 shared scan types
- `src/features/scans/DraftReview.tsx` — import repointed to `@/features/scan/types`
- `src/features/scans/DraftEditor.tsx` — import repointed to `@/features/scan/types`
- `src/features/scans/DraftManager.tsx` — import repointed to `@/features/scan/types`
- `src/lib/scan/scan-draft-service.ts` — import repointed to `@/features/scan/types`
- `src/lib/ai/recipe-parsing-service.ts` — type definitions removed, now imports from `@/features/scan/types`
- `src/lib/ai/confidence-scoring-service.ts` — type definitions removed, now imports from `@/features/scan/types`
