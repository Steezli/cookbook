# S01: Scan Code Consolidation

**Goal:** Single consolidated `src/features/scan/` directory — no more `src/features/scans/`. All dead files removed, shared types extracted, all imports clean, TypeScript compiles, all tests pass.
**Demo:** `ls src/features/scans/` returns "No such file or directory". `npx tsc --noEmit` exits 0. `npx jest` passes 502+ tests.

## Must-Haves

- Shared types (`ParsedRecipe`, `ParsedIngredient`, `FieldConfidence`, `OverallConfidence`, `FieldScore`, `ConfidenceThresholds`) extracted to `src/features/scan/types.ts`
- All consumers repointed from `recipe-parsing-service` / `confidence-scoring-service` type imports to `@/features/scan/types`
- `DraftEditor.tsx`, `DraftListView.tsx`, `DraftManager.tsx`, `DraftReview.tsx` moved from `scans/` to `scan/`
- `app/scan/draft/[id].tsx` imports rewritten from `@/features/scans/` to `@/features/scan/`
- All confirmed dead files removed (3 in `scan/`, 3 in `scans/`, 5 in `lib/`)
- Dead service classes removed from `recipe-parsing-service.ts` and `confidence-scoring-service.ts` (files may be deleted entirely if only types remain and those are now in `types.ts`)
- `src/features/scans/` directory deleted
- `npx tsc --noEmit` passes with zero errors
- All 502+ tests pass

## Proof Level

- This slice proves: contract (all imports resolve, types compile, tests pass)
- Real runtime required: no (purely structural — no behavioral changes)
- Human/UAT required: no

## Verification

- `npx tsc --noEmit` — exits 0, all imports resolve after consolidation
- `npx jest --ci` — 502+ tests pass, no regressions
- `test ! -d src/features/scans/` — directory no longer exists
- `test -f src/features/scan/types.ts` — extracted types file exists
- `test -f src/features/scan/DraftEditor.tsx` — moved files exist in target
- `rg '@/features/scans/' src/ app/` — returns no results (zero stale imports)
- `rg 'from.*recipe-parsing-service' src/ app/ --no-filename | grep -v 'scan/types'` — no direct type imports from the old service file remain (edge functions excluded)

## Observability / Diagnostics

- Runtime signals: none (no runtime behavior changes — purely structural refactoring)
- Inspection surfaces: `npx tsc --noEmit` for import integrity, `npx jest` for behavioral integrity
- Failure visibility: TypeScript compiler errors pinpoint exact broken import paths; Jest failures pinpoint behavioral regressions
- Redaction constraints: none

## Integration Closure

- Upstream surfaces consumed: none (first slice, restructuring existing code)
- New wiring introduced in this slice: `src/features/scan/types.ts` as the canonical type export location for scan-related types; all scan components consolidated under `src/features/scan/`
- What remains before the milestone is truly usable end-to-end: S02 (form UX), S03 (scan UI polish consuming consolidated components), S04 (logging cleanup), S05 (full audit)

## Tasks

- [x] **T01: Extract shared types to `src/features/scan/types.ts`** `est:20m`
  - Why: Types must be extracted before any files that export them can be deleted. This is the prerequisite for all subsequent steps.
  - Files: `src/features/scan/types.ts` (new), `src/lib/ai/recipe-parsing-service.ts`, `src/lib/ai/confidence-scoring-service.ts`, `src/features/scans/DraftEditor.tsx`, `src/features/scans/DraftReview.tsx`, `src/features/scans/DraftManager.tsx`, `src/lib/scan/scan-draft-service.ts`
  - Do: Create `types.ts` with `ParsedRecipe`, `ParsedIngredient`, `FieldConfidence`, `OverallConfidence`, `FieldScore`, `ConfidenceThresholds`, `ConfidenceEnhancement`. Repoint all consumers to import from `@/features/scan/types`. Remove type exports from the original service files. Do NOT move or delete any files yet.
  - Verify: `npx tsc --noEmit` passes. `npx jest` passes 502+ tests. `rg 'ParsedRecipe|ParsedIngredient|FieldConfidence' src/ app/ --no-filename -l` shows only `types.ts` as the export source (consumers import from it).
  - Done when: All shared types live in `types.ts`, all consumers import from there, tsc + tests pass.

- [x] **T02: Move live draft components from `scans/` to `scan/` and rewrite imports** `est:20m`
  - Why: The four active components in `scans/` must move to `scan/` to consolidate the feature directory. Import rewrites ensure no broken references.
  - Files: `src/features/scans/DraftEditor.tsx` → `src/features/scan/DraftEditor.tsx`, `src/features/scans/DraftListView.tsx` → `src/features/scan/DraftListView.tsx`, `src/features/scans/DraftManager.tsx` → `src/features/scan/DraftManager.tsx`, `src/features/scans/DraftReview.tsx` → `src/features/scan/DraftReview.tsx`, `app/scan/draft/[id].tsx`
  - Do: Move the 4 files via `git mv`. Update `app/scan/draft/[id].tsx` to import from `@/features/scan/` instead of `@/features/scans/`. Verify internal relative imports (`DraftEditor` → `./DraftManager`) still resolve since both files move together. Check `DraftListView` and `DraftReview` already use `@/features/scan/` for `scan-service` and `scan-photos` — confirm no changes needed there.
  - Verify: `npx tsc --noEmit` passes. `npx jest` passes 502+ tests. `rg '@/features/scans/' src/ app/` returns only dead files (about to be deleted in T03).
  - Done when: All 4 draft components live in `src/features/scan/`, all imports resolve, tsc + tests pass.

- [x] **T03: Delete dead files and remove `src/features/scans/` directory** `est:20m`
  - Why: Dead files add confusion and maintenance burden. With types extracted (T01) and live files moved (T02), all remaining files in `scans/` and confirmed dead files elsewhere can be safely removed.
  - Files to delete: `src/features/scan/ScanJobList.tsx`, `src/features/scan/ScanPhotoUpload.tsx`, `src/features/scan/useRealtimeSubscription.ts`, `src/features/scans/scan-upload.ts`, `src/features/scans/ScanPhotoUpload.tsx`, `src/features/scans/ScanJobProgress.tsx`, `src/lib/scan/error-reporting-service.ts`, `src/lib/ocr/ocr-service.ts`, `src/lib/services/ocr.ts`, `src/lib/services/confidence-scoring.ts`, `src/lib/services/recipe-parser.ts`. Also delete `src/lib/ai/recipe-parsing-service.ts` and `src/lib/ai/confidence-scoring-service.ts` entirely (types already extracted in T01, service classes are dead). Remove `src/features/scans/` directory.
  - Do: For each file, run `rg` to confirm zero non-dead importers before deleting. Delete files via `git rm`. Remove `src/features/scans/` directory. Run verification. If any `rg` check reveals a live importer, stop and investigate — do not force-delete.
  - Verify: `npx tsc --noEmit` passes. `npx jest` passes 502+ tests. `test ! -d src/features/scans/` confirms directory is gone. `rg '@/features/scans/' src/ app/` returns zero results. `rg 'recipe-parsing-service|confidence-scoring-service' src/ app/ --no-filename` returns zero results (edge functions excluded from scope).
  - Done when: All 13 dead files deleted, `scans/` directory gone, zero stale imports anywhere, tsc + tests pass.

## Files Likely Touched

- `src/features/scan/types.ts` (new)
- `src/features/scan/DraftEditor.tsx` (moved from scans/)
- `src/features/scan/DraftListView.tsx` (moved from scans/)
- `src/features/scan/DraftManager.tsx` (moved from scans/)
- `src/features/scan/DraftReview.tsx` (moved from scans/)
- `app/scan/draft/[id].tsx` (import rewrite)
- `src/lib/scan/scan-draft-service.ts` (import rewrite)
- `src/lib/ai/recipe-parsing-service.ts` (type removal → deletion)
- `src/lib/ai/confidence-scoring-service.ts` (type removal → deletion)
- `src/features/scan/ScanJobList.tsx` (deleted)
- `src/features/scan/ScanPhotoUpload.tsx` (deleted)
- `src/features/scan/useRealtimeSubscription.ts` (deleted)
- `src/features/scans/` (entire directory deleted)
- `src/lib/scan/error-reporting-service.ts` (deleted)
- `src/lib/ocr/ocr-service.ts` (deleted)
- `src/lib/services/ocr.ts` (deleted)
- `src/lib/services/confidence-scoring.ts` (deleted)
- `src/lib/services/recipe-parser.ts` (deleted)
