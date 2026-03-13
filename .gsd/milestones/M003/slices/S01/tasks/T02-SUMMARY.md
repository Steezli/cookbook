---
id: T02
parent: S01
milestone: M003
provides:
  - All 4 live draft components consolidated in src/features/scan/
  - app/scan/draft/[id].tsx imports rewritten to @/features/scan/
  - Zero stale @/features/scans/ imports outside the dead scans/ directory
key_files:
  - src/features/scan/DraftEditor.tsx
  - src/features/scan/DraftListView.tsx
  - src/features/scan/DraftManager.tsx
  - src/features/scan/DraftReview.tsx
  - app/scan/draft/[id].tsx
key_decisions:
  - Used git mv to preserve file history through the rename
patterns_established:
  - All active scan components now live under src/features/scan/ — no new files should go in scans/
observability_surfaces:
  - none — purely structural refactoring
duration: 5m
verification_result: passed
completed_at: 2026-03-12
blocker_discovered: false
---

# T02: Move live draft components from `scans/` to `scan/` and rewrite imports

**Moved 4 draft components from `src/features/scans/` to `src/features/scan/` via `git mv` and rewrote all external imports.**

## What Happened

Moved `DraftEditor.tsx`, `DraftListView.tsx`, `DraftManager.tsx`, and `DraftReview.tsx` from `src/features/scans/` to `src/features/scan/` using `git mv`. Updated the single external consumer (`app/scan/draft/[id].tsx`) to import from `@/features/scan/` instead of `@/features/scans/`. Confirmed that internal relative imports (`./DraftManager`, `./DraftReview`, `./DraftEditor`) still resolve since all files moved together. Confirmed that `DraftListView` and `DraftReview` already imported from `@/features/scan/` for `scan-service` and `scan-photos` — no changes needed there.

`src/features/scans/` now contains only 3 dead files (`scan-upload.ts`, `ScanJobProgress.tsx`, `ScanPhotoUpload.tsx`) to be deleted in T03.

## Verification

- `npx tsc --noEmit` — exits 0, all imports resolve
- `npx jest --ci` — 502 tests passed, 22 suites, 0 failures
- `ls src/features/scan/Draft*.tsx` — all 4 files present
- `rg '@/features/scans/' app/` — zero results (no stale imports in app/)
- `rg '@/features/scans/' src/ | grep -v 'src/features/scans/'` — zero results (no stale imports outside dead directory)
- Slice-level checks: `types.ts` exists ✓, `DraftEditor.tsx` in target ✓, no stale imports ✓

## Diagnostics

None — purely structural. `npx tsc --noEmit` catches any broken import paths. `git log --follow` tracks file history through rename.

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `src/features/scan/DraftEditor.tsx` — moved from scans/ (git mv)
- `src/features/scan/DraftListView.tsx` — moved from scans/ (git mv)
- `src/features/scan/DraftManager.tsx` — moved from scans/ (git mv)
- `src/features/scan/DraftReview.tsx` — moved from scans/ (git mv)
- `app/scan/draft/[id].tsx` — 3 import paths rewritten from @/features/scans/ to @/features/scan/
