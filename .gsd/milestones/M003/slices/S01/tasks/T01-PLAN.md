---
estimated_steps: 5
estimated_files: 7
---

# T01: Extract shared types to `src/features/scan/types.ts`

**Slice:** S01 — Scan Code Consolidation
**Milestone:** M003

## Description

Create `src/features/scan/types.ts` containing all shared scan types currently exported from dead service files. Repoint every consumer to import from the new file. Remove type exports from the original service files. This must happen before any files are moved or deleted — it's the prerequisite for the entire consolidation.

## Steps

1. Read `src/lib/ai/recipe-parsing-service.ts` and extract the type/interface definitions for `ParsedRecipe`, `ParsedIngredient`, and `FieldConfidence`.
2. Read `src/lib/ai/confidence-scoring-service.ts` and extract the type/interface definitions for `OverallConfidence`, `FieldScore`, `ConfidenceThresholds`, and `ConfidenceEnhancement`.
3. Create `src/features/scan/types.ts` with all extracted types, properly organized with JSDoc comments preserved.
4. Find all files that import these types from the old locations (`rg` for each type name + import path). Rewrite each import to use `@/features/scan/types`.
5. Remove the type exports from `recipe-parsing-service.ts` and `confidence-scoring-service.ts` (keep only the service class code for now — full deletion happens in T03).

## Must-Haves

- [ ] `src/features/scan/types.ts` exists with all 7 type definitions
- [ ] Every consumer imports types from `@/features/scan/types` (not from service files)
- [ ] `npx tsc --noEmit` passes
- [ ] `npx jest` passes 502+ tests
- [ ] No behavioral changes — types are identical, only the export location changes

## Verification

- `npx tsc --noEmit` exits 0
- `npx jest --ci` passes all tests
- `rg 'from.*recipe-parsing-service' src/ app/ | grep -v test | grep -v edge` shows zero results importing types from the old file
- `rg 'from.*confidence-scoring-service' src/ app/ | grep -v test | grep -v edge` shows zero results importing types from the old file
- `test -f src/features/scan/types.ts` confirms file exists

## Observability Impact

- Signals added/changed: None — purely structural, no runtime behavior
- How a future agent inspects this: `npx tsc --noEmit` verifies all import paths resolve
- Failure state exposed: TypeScript compiler errors will name exact broken import paths

## Inputs

- `src/lib/ai/recipe-parsing-service.ts` — source of `ParsedRecipe`, `ParsedIngredient`, `FieldConfidence` type definitions
- `src/lib/ai/confidence-scoring-service.ts` — source of `OverallConfidence`, `FieldScore`, `ConfidenceThresholds`, `ConfidenceEnhancement` type definitions
- S01-RESEARCH.md — confirmed consumer list: DraftEditor, DraftReview, DraftManager, scan-draft-service, confidence-scoring-service

## Expected Output

- `src/features/scan/types.ts` — new canonical type export file with all 7 shared types
- `src/features/scans/DraftEditor.tsx` — import rewritten to `@/features/scan/types`
- `src/features/scans/DraftReview.tsx` — import rewritten to `@/features/scan/types`
- `src/features/scans/DraftManager.tsx` — import rewritten to `@/features/scan/types`
- `src/lib/scan/scan-draft-service.ts` — import rewritten to `@/features/scan/types`
- `src/lib/ai/recipe-parsing-service.ts` — type exports removed (service class code remains temporarily)
- `src/lib/ai/confidence-scoring-service.ts` — type exports removed (service class code remains temporarily)
