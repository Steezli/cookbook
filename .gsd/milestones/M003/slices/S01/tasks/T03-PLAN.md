---
estimated_steps: 5
estimated_files: 13
---

# T03: Delete dead files and remove `src/features/scans/` directory

**Slice:** S01 — Scan Code Consolidation
**Milestone:** M003

## Description

Delete all confirmed dead files across `src/features/scan/`, `src/features/scans/`, and `src/lib/`. Remove the now-empty `src/features/scans/` directory. Also delete `recipe-parsing-service.ts` and `confidence-scoring-service.ts` entirely — their types were extracted in T01, and the service classes have zero importers. Verify each file has zero live importers before deletion.

## Steps

1. For each dead file in `src/features/scan/` (ScanJobList.tsx, ScanPhotoUpload.tsx, useRealtimeSubscription.ts), run `rg` to confirm zero importers, then `git rm`.
2. For each dead file in `src/features/scans/` (scan-upload.ts, ScanPhotoUpload.tsx, ScanJobProgress.tsx), run `rg` to confirm zero importers outside the dead cluster, then `git rm`. Remove the `src/features/scans/` directory.
3. For each dead file in `src/lib/` (scan/error-reporting-service.ts, ocr/ocr-service.ts, services/ocr.ts, services/confidence-scoring.ts, services/recipe-parser.ts), run `rg` to confirm zero importers, then `git rm`.
4. Delete `src/lib/ai/recipe-parsing-service.ts` and `src/lib/ai/confidence-scoring-service.ts` entirely — confirm with `rg` that no remaining code imports from them (types were repointed in T01).
5. Run full verification: `npx tsc --noEmit`, `npx jest --ci`, confirm `src/features/scans/` is gone, confirm zero stale import references remain.

## Must-Haves

- [ ] All 11 confirmed dead files deleted (3 in scan/, 3 in scans/, 5 in lib/)
- [ ] `recipe-parsing-service.ts` and `confidence-scoring-service.ts` fully deleted (types extracted in T01)
- [ ] `src/features/scans/` directory no longer exists
- [ ] Zero references to `@/features/scans/` remain in the codebase
- [ ] Zero references to deleted lib files remain
- [ ] `npx tsc --noEmit` passes
- [ ] `npx jest` passes 502+ tests

## Verification

- `npx tsc --noEmit` exits 0
- `npx jest --ci` passes all tests
- `test ! -d src/features/scans/` — directory does not exist
- `rg '@/features/scans/' src/ app/` — returns zero results
- `rg 'recipe-parsing-service|confidence-scoring-service' src/ app/` — returns zero results (edge functions excluded)
- `rg 'error-reporting-service|ocr-service|lib/services/ocr|lib/services/confidence|lib/services/recipe-parser' src/ app/` — returns zero results
- `test -f src/features/scan/types.ts` — types file still exists (was not deleted)
- `test -f src/features/scan/DraftEditor.tsx` — moved files still exist

## Observability Impact

- Signals added/changed: None — removing dead code has zero runtime impact
- How a future agent inspects this: `rg` for any of the deleted module names catches accidental re-introduction; `npx tsc --noEmit` catches broken references
- Failure state exposed: If any deleted file was not actually dead, TypeScript compilation fails immediately with a clear "Cannot find module" error naming the missing file

## Inputs

- T01 completed: types extracted to `@/features/scan/types`, no consumer still imports from `recipe-parsing-service.ts` or `confidence-scoring-service.ts`
- T02 completed: live draft components moved to `scan/`, `app/scan/draft/[id].tsx` imports rewritten
- S01-RESEARCH.md — confirmed dead file list with evidence

## Expected Output

- 13 files deleted via `git rm`
- `src/features/scans/` directory removed
- Clean codebase: single `src/features/scan/` directory with all active scan code
- TypeScript compiles clean, all tests pass
- Slice verification conditions fully met
