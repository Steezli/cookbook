---
estimated_steps: 4
estimated_files: 5
---

# T02: Move live draft components from `scans/` to `scan/` and rewrite imports

**Slice:** S01 — Scan Code Consolidation
**Milestone:** M003

## Description

Move the 4 active draft components (`DraftEditor.tsx`, `DraftListView.tsx`, `DraftManager.tsx`, `DraftReview.tsx`) from `src/features/scans/` to `src/features/scan/` using `git mv`. Update the one external consumer (`app/scan/draft/[id].tsx`) to import from `@/features/scan/`. Verify internal relative imports still resolve since all files move together.

## Steps

1. Run `git mv` for each of the 4 draft component files from `src/features/scans/` to `src/features/scan/`.
2. Update `app/scan/draft/[id].tsx`: change all 3 imports from `@/features/scans/` to `@/features/scan/` (DraftReview, DraftEditor, DraftListView).
3. Verify `DraftEditor.tsx` internal import of `./DraftManager` still resolves (both files now in same directory).
4. Verify `DraftListView.tsx` and `DraftReview.tsx` imports of `@/features/scan/scan-service` and `@/features/scan/scan-photos` are already correct (no changes needed — they already pointed to `scan/`, not `scans/`).

## Must-Haves

- [ ] All 4 draft components exist in `src/features/scan/`
- [ ] `app/scan/draft/[id].tsx` imports from `@/features/scan/` (not `@/features/scans/`)
- [ ] All internal relative imports resolve correctly
- [ ] `npx tsc --noEmit` passes
- [ ] `npx jest` passes 502+ tests
- [ ] No behavioral changes — only file locations and import paths change

## Verification

- `npx tsc --noEmit` exits 0
- `npx jest --ci` passes all tests
- `ls src/features/scan/DraftEditor.tsx src/features/scan/DraftListView.tsx src/features/scan/DraftManager.tsx src/features/scan/DraftReview.tsx` — all 4 files exist
- `rg '@/features/scans/' app/` — returns zero results
- `rg '@/features/scans/' src/ | grep -v 'src/features/scans/'` — returns zero results (only dead files within `scans/` still self-reference)

## Observability Impact

- Signals added/changed: None
- How a future agent inspects this: `npx tsc --noEmit` catches broken imports; `git log --follow` tracks file history through rename
- Failure state exposed: TypeScript errors name exact missing module paths

## Inputs

- T01 completed: types already extracted to `@/features/scan/types` — draft components already import from there
- `app/scan/draft/[id].tsx` — the single external consumer with `@/features/scans/` imports to rewrite
- S01-RESEARCH.md — confirmed that `DraftListView` and `DraftReview` already import from `@/features/scan/` for scan-service/scan-photos

## Expected Output

- `src/features/scan/DraftEditor.tsx` — moved (git mv preserves history)
- `src/features/scan/DraftListView.tsx` — moved
- `src/features/scan/DraftManager.tsx` — moved
- `src/features/scan/DraftReview.tsx` — moved
- `app/scan/draft/[id].tsx` — 3 import paths updated
- `src/features/scans/` — now contains only dead files (3 files to be deleted in T03)
