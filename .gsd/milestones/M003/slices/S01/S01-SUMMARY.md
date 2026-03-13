---
id: S01
parent: M003
milestone: M003
provides:
  - Single consolidated src/features/scan/ directory (no more src/features/scans/)
  - Canonical shared type export at src/features/scan/types.ts
  - 13 confirmed dead files removed from codebase
  - All imports rewritten from @/features/scans/ to @/features/scan/
requires: []
affects:
  - S03
  - S04
key_files:
  - src/features/scan/types.ts
  - src/features/scan/DraftEditor.tsx
  - src/features/scan/DraftListView.tsx
  - src/features/scan/DraftManager.tsx
  - src/features/scan/DraftReview.tsx
  - app/scan/draft/[id].tsx
key_decisions:
  - Shared scan types canonical location is src/features/scan/types.ts — all consumers use absolute @/features/scan/types import
  - Used git mv for draft component moves to preserve file history
  - Deleted recipe-parsing-service.ts and confidence-scoring-service.ts entirely (not just stripped types) since service classes had zero importers
patterns_established:
  - All scan code lives exclusively under src/features/scan/ — no parallel directories
  - Shared scan types go in src/features/scan/types.ts — all new scan-related types should be added here
observability_surfaces:
  - none — purely structural refactoring with zero runtime behavior changes
drill_down_paths:
  - .gsd/milestones/M003/slices/S01/tasks/T01-SUMMARY.md
  - .gsd/milestones/M003/slices/S01/tasks/T02-SUMMARY.md
  - .gsd/milestones/M003/slices/S01/tasks/T03-SUMMARY.md
duration: ~15 minutes
verification_result: passed
completed_at: 2026-03-12
---

# S01: Scan Code Consolidation

**Merged `src/features/scans/` into `src/features/scan/`, extracted 7 shared types to canonical `types.ts`, and deleted 13 dead files — single clean scan directory with all 502 tests passing.**

## What Happened

Three tasks executed sequentially with no deviations:

**T01 — Type extraction:** Created `src/features/scan/types.ts` with 7 shared type definitions (`ParsedRecipe`, `ParsedIngredient`, `FieldConfidence`, `OverallConfidence`, `FieldScore`, `ConfidenceThresholds`, `ConfidenceEnhancement`) previously scattered across `recipe-parsing-service.ts` and `confidence-scoring-service.ts`. Repointed 5 consumer files to import from the new canonical location.

**T02 — Component moves:** Moved `DraftEditor.tsx`, `DraftListView.tsx`, `DraftManager.tsx`, and `DraftReview.tsx` from `src/features/scans/` to `src/features/scan/` via `git mv`. Rewrote 3 import paths in `app/scan/draft/[id].tsx`. Internal relative imports between the moved files resolved automatically since they moved together.

**T03 — Dead file deletion:** Verified each of the 13 dead files had zero live importers via `rg`, then deleted with `git rm`: 3 from `scan/`, 3 from `scans/`, 5 from `lib/`, plus `recipe-parsing-service.ts` and `confidence-scoring-service.ts` (types already extracted, service classes dead). Git auto-removed emptied directories (`src/lib/ocr/`, `src/lib/services/`, `src/lib/ai/`). The `src/features/scans/` directory was eliminated entirely.

## Verification

All 7 slice verification checks passed:

- `npx tsc --noEmit` — exits 0, all imports resolve ✅
- `npx jest --ci` — 502 tests pass, 22 suites ✅
- `test ! -d src/features/scans/` — directory does not exist ✅
- `test -f src/features/scan/types.ts` — extracted types file present ✅
- `test -f src/features/scan/DraftEditor.tsx` — moved files present ✅
- `rg '@/features/scans/' src/ app/` — zero results (no stale imports) ✅
- `rg 'from.*recipe-parsing-service' src/ app/ --no-filename | grep -v 'scan/types'` — zero results ✅

## Requirements Advanced

- **QA-01** — Fully delivered: `src/features/scans/` merged into `src/features/scan/`, all imports fixed, no broken references
- **QA-07** — Partially delivered: 13 confirmed dead files removed. S04 continues with a systematic sweep for any remaining dead code
- **QA-11** — Fully delivered: shared types extracted to `src/features/scan/types.ts`, all consumers repointed
- **QA-12** — Fully delivered: duplicate `scan-upload.ts` eliminated (scans/ version was dead, deleted)

## Requirements Validated

- **QA-01** — Scan flow code consolidation complete: single directory, all imports clean, tsc + tests pass
- **QA-11** — Type export cleanup complete: 7 types extracted, canonical location established
- **QA-12** — Duplicate scan-upload.ts resolved: dead duplicate removed

## New Requirements Surfaced

- none

## Requirements Invalidated or Re-scoped

- none

## Deviations

None.

## Known Limitations

- QA-07 (dead code removal) is only partially addressed — S01 removed 13 files confirmed dead during investigation, but S04 will perform a systematic sweep to catch anything missed
- Empty directories (`src/lib/ocr/`, `src/lib/services/`, `src/lib/ai/`) were auto-removed by git, which is fine since all their contents were dead

## Follow-ups

- S03 can now build on the consolidated `src/features/scan/` directory for scan UI polish
- S04 should audit for any remaining dead code not caught in this initial sweep

## Files Created/Modified

- `src/features/scan/types.ts` — **created** — canonical export for 7 shared scan types
- `src/features/scan/DraftEditor.tsx` — moved from scans/ via git mv
- `src/features/scan/DraftListView.tsx` — moved from scans/ via git mv
- `src/features/scan/DraftManager.tsx` — moved from scans/ via git mv
- `src/features/scan/DraftReview.tsx` — moved from scans/ via git mv
- `app/scan/draft/[id].tsx` — 3 import paths rewritten from @/features/scans/ to @/features/scan/
- `src/lib/scan/scan-draft-service.ts` — import repointed to @/features/scan/types
- `src/lib/ai/recipe-parsing-service.ts` — **deleted** (types extracted in T01, service class dead)
- `src/lib/ai/confidence-scoring-service.ts` — **deleted** (types extracted in T01, service class dead)
- `src/features/scan/ScanJobList.tsx` — **deleted** (dead, zero importers)
- `src/features/scan/ScanPhotoUpload.tsx` — **deleted** (dead, zero importers)
- `src/features/scan/useRealtimeSubscription.ts` — **deleted** (dead, zero importers)
- `src/features/scans/scan-upload.ts` — **deleted** (dead cluster)
- `src/features/scans/ScanPhotoUpload.tsx` — **deleted** (dead cluster)
- `src/features/scans/ScanJobProgress.tsx` — **deleted** (dead cluster)
- `src/lib/scan/error-reporting-service.ts` — **deleted** (dead, zero importers)
- `src/lib/ocr/ocr-service.ts` — **deleted** (dead, zero importers)
- `src/lib/services/ocr.ts` — **deleted** (dead, zero importers)
- `src/lib/services/confidence-scoring.ts` — **deleted** (dead, zero importers)
- `src/lib/services/recipe-parser.ts` — **deleted** (dead, zero importers)

## Forward Intelligence

### What the next slice should know
- All scan components now live in `src/features/scan/`. There is no `scans/` directory. Import path is `@/features/scan/`.
- Shared types are in `src/features/scan/types.ts` — import from there, not from any service file.
- The `src/lib/ai/` directory no longer exists (auto-removed when contents were deleted). If edge functions reference types from the deleted service files, they'll need to use their own inline definitions (they can't import from `src/` anyway).

### What's fragile
- Edge functions in `supabase/functions/` maintain their own copies of types/logic since they can't import from `src/`. If type definitions in `types.ts` change, the edge function copies must be updated manually.

### Authoritative diagnostics
- `npx tsc --noEmit` — catches any broken import path immediately
- `rg '@/features/scans/' src/ app/` — detects any stale import regression (should always return zero results)

### What assumptions changed
- Original plan listed 11 dead files; actual count was 13 (the two service files were also fully dead after type extraction, not just stripped)
