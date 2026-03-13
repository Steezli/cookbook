# S01: Scan Code Consolidation — UAT

**Milestone:** M003
**Written:** 2026-03-12

## UAT Type

- UAT mode: artifact-driven
- Why this mode is sufficient: This slice is purely structural refactoring — no runtime behavior changes, no UI changes, no new features. Correctness is fully verifiable via TypeScript compilation (all imports resolve) and test suite (all 502 tests pass). No live-runtime or human-experience verification needed.

## Preconditions

- Repository is on the `gsd/M003/S01` branch with all three tasks committed
- Node modules installed (`node_modules/` present)

## Smoke Test

Run `npx tsc --noEmit && npx jest --ci` — TypeScript compiles with zero errors and all 502 tests pass. This single command proves the consolidation didn't break any imports or behavior.

## Test Cases

### 1. Single scan directory exists

1. Run `ls src/features/scan/`
2. **Expected:** Directory exists and contains `types.ts`, `DraftEditor.tsx`, `DraftListView.tsx`, `DraftManager.tsx`, `DraftReview.tsx`, plus other existing scan files

### 2. Old scan directory removed

1. Run `ls src/features/scans/`
2. **Expected:** "No such file or directory"

### 3. Zero stale imports

1. Run `rg '@/features/scans/' src/ app/`
2. **Expected:** Zero results (exit code 1, no output)

### 4. Types file is canonical export

1. Run `rg 'ParsedRecipe|ParsedIngredient|FieldConfidence' src/ app/ --no-filename -l`
2. **Expected:** `src/features/scan/types.ts` appears as the sole exporter. Consumer files appear as importers only.

### 5. Dead service files removed

1. Run `rg 'from.*recipe-parsing-service' src/ app/ --no-filename` and `rg 'from.*confidence-scoring-service' src/ app/ --no-filename`
2. **Expected:** Zero results for both (exit code 1, no output)

### 6. TypeScript compilation clean

1. Run `npx tsc --noEmit`
2. **Expected:** Exits 0 with no output (zero errors)

### 7. Full test suite passes

1. Run `npx jest --ci`
2. **Expected:** 502 tests pass, 22 suites, 0 failures

## Edge Cases

### Re-introduction of stale import

1. If a future merge introduces `@/features/scans/` imports, `npx tsc --noEmit` will fail immediately since the directory no longer exists
2. **Expected:** TypeScript error pinpoints the exact file and line

### Edge function isolation

1. Edge functions in `supabase/functions/` have their own copies of types and logic (can't import from `src/`)
2. **Expected:** Edge functions are unaffected by this refactoring — verified by the fact that they were never importers of the deleted files

## Failure Signals

- `npx tsc --noEmit` exits non-zero — broken import path somewhere
- `npx jest --ci` has failures — behavioral regression from file moves
- `rg '@/features/scans/' src/ app/` returns results — stale imports not cleaned up
- `ls src/features/scans/` succeeds — directory not removed

## Requirements Proved By This UAT

- **QA-01** — Scan flow code consolidation: single `src/features/scan/` directory, no `src/features/scans/`, all imports clean, tsc + tests pass
- **QA-11** — Type export cleanup: 7 shared types extracted to `src/features/scan/types.ts`, all consumers repointed, original export locations removed
- **QA-12** — Duplicate scan-upload.ts consolidation: dead duplicate in `scans/` removed, single `scan-upload.ts` remains in `scan/`

## Not Proven By This UAT

- **QA-07** — Dead code removal is partially delivered (13 files). A systematic sweep in S04 may find additional dead files not identified during this slice's investigation
- Runtime behavior of the scan flow (covered by S03 and S05)
- Visual correctness of scan UI (covered by S03)
- Cross-platform scan verification (covered by S05)

## Notes for Tester

This is a purely structural refactoring — no UI or behavior changed. If TypeScript compiles and all tests pass, the consolidation is correct. The main risk was breaking import paths, which `tsc --noEmit` comprehensively checks. No manual UI testing needed for this slice.
