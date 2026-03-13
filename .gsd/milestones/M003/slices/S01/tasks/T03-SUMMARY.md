---
id: T03
parent: S01
milestone: M003
provides:
  - All 13 confirmed dead files removed from codebase
  - src/features/scans/ directory eliminated
  - Zero stale import references to deleted modules
  - Clean single-directory scan feature layout at src/features/scan/
key_files: []
key_decisions:
  - Deleted recipe-parsing-service.ts and confidence-scoring-service.ts entirely (not just stripped types) since service classes had zero importers
  - Preserved provenance comment in types.ts referencing original source files (not an import, just documentation)
patterns_established:
  - All scan code lives exclusively under src/features/scan/ — no parallel directories
observability_surfaces:
  - none — purely structural deletion with zero runtime impact
duration: 5m
verification_result: passed
completed_at: 2026-03-12
blocker_discovered: false
---

# T03: Delete dead files and remove `src/features/scans/` directory

**Deleted 13 dead files across scan/, scans/, and lib/ directories; removed src/features/scans/ entirely.**

## What Happened

Verified each of the 13 dead files had zero live importers via `rg`, then deleted them with `git rm`:

- **src/features/scan/** (3 files): ScanJobList.tsx, ScanPhotoUpload.tsx, useRealtimeSubscription.ts — all self-referential only, zero external imports.
- **src/features/scans/** (3 files): scan-upload.ts, ScanPhotoUpload.tsx, ScanJobProgress.tsx — only cross-referenced each other within the dead cluster. Directory removed entirely.
- **src/lib/** (5 files): scan/error-reporting-service.ts, ocr/ocr-service.ts, services/ocr.ts, services/confidence-scoring.ts, services/recipe-parser.ts — all zero importers.
- **src/lib/ai/** (2 files): recipe-parsing-service.ts, confidence-scoring-service.ts — types extracted in T01, service classes had zero importers. Deleted entirely.

Git also auto-removed emptied directories: src/lib/ocr/, src/lib/services/, src/lib/ai/.

## Verification

All task and slice verification checks passed:

- `npx tsc --noEmit` — exits 0 ✅
- `npx jest --ci` — 502 tests passed, 22 suites ✅
- `test ! -d src/features/scans/` — directory does not exist ✅
- `test -f src/features/scan/types.ts` — types file still present ✅
- `test -f src/features/scan/DraftEditor.tsx` — moved files still present ✅
- `rg '@/features/scans/' src/ app/` — zero results ✅
- `rg 'from.*recipe-parsing-service' src/ app/ --no-filename | grep -v 'scan/types'` — zero results ✅
- `rg 'error-reporting-service|ocr-service|lib/services/ocr|lib/services/confidence|lib/services/recipe-parser' src/ app/` — zero results ✅

## Diagnostics

None — purely structural. `npx tsc --noEmit` catches any accidentally broken import. `rg` for deleted module names catches accidental re-introduction.

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `src/features/scan/ScanJobList.tsx` — deleted (dead, zero importers)
- `src/features/scan/ScanPhotoUpload.tsx` — deleted (dead, zero importers)
- `src/features/scan/useRealtimeSubscription.ts` — deleted (dead, zero importers)
- `src/features/scans/scan-upload.ts` — deleted (dead cluster)
- `src/features/scans/ScanPhotoUpload.tsx` — deleted (dead cluster)
- `src/features/scans/ScanJobProgress.tsx` — deleted (dead cluster)
- `src/lib/scan/error-reporting-service.ts` — deleted (dead, zero importers)
- `src/lib/ocr/ocr-service.ts` — deleted (dead, zero importers)
- `src/lib/services/ocr.ts` — deleted (dead, zero importers)
- `src/lib/services/confidence-scoring.ts` — deleted (dead, zero importers)
- `src/lib/services/recipe-parser.ts` — deleted (dead, zero importers)
- `src/lib/ai/recipe-parsing-service.ts` — deleted (types extracted in T01, service class dead)
- `src/lib/ai/confidence-scoring-service.ts` — deleted (types extracted in T01, service class dead)
