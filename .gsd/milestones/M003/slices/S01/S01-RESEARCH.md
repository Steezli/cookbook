# Scan Code Consolidation — Research

**Date:** 2026-03-12

## Summary

The scan feature code is split across two directories (`src/features/scan/` and `src/features/scans/`) with 15 files total, plus supporting code in `src/lib/scan/`, `src/lib/ai/`, `src/lib/ocr/`, and `src/lib/services/`. Import analysis reveals a clean consolidation path: 4 files from `scans/` are actively used and need to move to `scan/`, 3 files in `scans/` are dead (forming a self-referencing dead cluster), and 3 files in `scan/` are also dead. Additionally, 3 files in `src/lib/services/` and 1 in `src/lib/ocr/` are confirmed dead. The two `scan-upload.ts` files serve different purposes — `scan/scan-upload.ts` is the canonical upload orchestrator used by the app, while `scans/scan-upload.ts` is an older web-only version used only by dead files.

Types from `recipe-parsing-service.ts` (`ParsedRecipe`, `ParsedIngredient`, `FieldConfidence`) are imported by 3 active components (DraftEditor, DraftReview, DraftManager) and 2 lib files. The `RecipeParsingService` class itself has zero external importers — it's dead. Similarly, `OverallConfidence` from `confidence-scoring-service.ts` is used by `scan-draft-service.ts`, but the `ConfidenceScoringService` class is unused.

TypeScript compiles clean and all 502 tests pass before any changes. The consolidation is purely mechanical: move files, rewrite imports, extract types, delete dead code. No behavioral changes needed.

## Recommendation

Execute in three sequential phases within a single task:

1. **Extract types first** — Create `src/features/scan/types.ts` with `ParsedRecipe`, `ParsedIngredient`, `FieldConfidence` from `recipe-parsing-service.ts` and `OverallConfidence`, `FieldScore`, `ConfidenceThresholds` from `confidence-scoring-service.ts`. Repoint all consumers to the new file. Verify tsc + tests.

2. **Move live files** — Move `DraftEditor.tsx`, `DraftListView.tsx`, `DraftManager.tsx`, `DraftReview.tsx` from `scans/` to `scan/`. Update all imports from `@/features/scans/` to `@/features/scan/`. Verify tsc + tests.

3. **Delete dead files** — Remove confirmed dead files. Verify tsc + tests. Delete `src/features/scans/` directory.

This ordering ensures each step is independently verifiable and the codebase never enters a broken state.

## Don't Hand-Roll

| Problem | Existing Solution | Why Use It |
|---------|------------------|------------|
| Import rewriting | Find-and-replace on `@/features/scans/` → `@/features/scan/` | All imports use the `@/` alias — no relative path gymnastics needed |
| Type extraction verification | `npx tsc --noEmit` | Catches any missed import rewrites immediately |
| Dead code confirmation | `rg` import search | Reliable since there are no dynamic imports or string-based requires in this codebase |

## Existing Code and Patterns

### Active files to keep in `src/features/scan/`
- `scan-service.ts` — Core job CRUD, subscriptions, job limit checks. Used by `app/scan/draft/[id].tsx`, `DraftReview.tsx`, `DraftListView.tsx`. Also exports `ScanJob` and `JobStatus` types.
- `scan-upload.ts` — Upload orchestrator with multi-photo support, validation, compression. Platform-branched (web uses Storage upload, native uses base64 inline). Used by `app/scan/index.tsx`.
- `scan-photos.ts` — Photo URL helpers, base64 reading, storage upload, image compression. Used by `scan-upload.ts` (relative), `DraftReview.tsx`, `DraftListView.tsx`, `RecentScans.tsx`.
- `RecentScans.tsx` — Recent scans list component. Used by `app/scan/index.tsx`.
- `__tests__/scan-service.test.ts` — Tests for scan-service. Uses relative `../scan-service` import — unaffected by consolidation.

### Files to move from `src/features/scans/` → `src/features/scan/`
- `DraftEditor.tsx` (950 lines) — Draft editing component. Imports: `DraftManager` (local), `scan-draft-service`, `recipe-parsing-service` types. Used by `app/scan/draft/[id].tsx`.
- `DraftListView.tsx` (684 lines) — Multi-draft list. Imports: `scan-service`, `scan-photos`, `scan-draft-service`, `multi-draft-helpers`. Used by `app/scan/draft/[id].tsx`.
- `DraftReview.tsx` (762 lines) — Draft review component. Imports: `scan-service`, `scan-photos`, `scan-draft-service`, `recipe-parsing-service` types. Used by `app/scan/draft/[id].tsx`.
- `DraftManager.tsx` (633 lines) — Draft management (convert to recipe, share, discard). Imported only by `DraftEditor.tsx`.

### Import rewrite targets (4 files need updating)
- `app/scan/draft/[id].tsx` — 3 imports from `@/features/scans/` (DraftReview, DraftEditor, DraftListView)
- `DraftEditor.tsx` — internal import of `DraftManager` (becomes `./DraftManager` after move — already relative)
- `DraftListView.tsx` — 2 imports from `@/features/scan/` (already correct destination)
- `DraftReview.tsx` — 2 imports from `@/features/scan/` (already correct destination)

### Types to extract
- From `src/lib/ai/recipe-parsing-service.ts`: `ParsedRecipe`, `ParsedIngredient`, `FieldConfidence` — used by DraftEditor, DraftReview, DraftManager, confidence-scoring-service, scan-draft-service
- From `src/lib/ai/confidence-scoring-service.ts`: `OverallConfidence` (+ `FieldScore`, `ConfidenceThresholds` which it depends on) — used by scan-draft-service

## Confirmed Dead Files

### `src/features/scan/` dead files (0 non-test importers)
| File | Lines | Evidence |
|------|-------|----------|
| `ScanJobList.tsx` | 347 | Zero importers. Superseded by `RecentScans.tsx`. |
| `ScanPhotoUpload.tsx` | 254 | Zero importers. Superseded by `app/scan/index.tsx` inline upload. |
| `useRealtimeSubscription.ts` | 131 | Zero importers. Generic subscription hook — job-specific subscriptions in `scan-service.ts` used instead. |

### `src/features/scans/` dead files (self-referencing cluster)
| File | Lines | Evidence |
|------|-------|----------|
| `scan-upload.ts` | 266 | Only imported by dead `ScanPhotoUpload.tsx` and `ScanJobProgress.tsx`. Web-only (uses `document.createElement`, `canvas`). Superseded by `scan/scan-upload.ts`. |
| `ScanPhotoUpload.tsx` | 254 | Only imports from dead `scans/scan-upload.ts`. Uses `HTMLInputElement` — web-only. Superseded by `app/scan/index.tsx`. |
| `ScanJobProgress.tsx` | 193 | Only imported by dead `scans/ScanPhotoUpload.tsx`. |

### `src/lib/` dead files
| File | Lines | Evidence |
|------|-------|----------|
| `lib/scan/error-reporting-service.ts` | ~200 | Zero importers outside itself. |
| `lib/ocr/ocr-service.ts` | ~300 | Zero importers. Newer OCR replaced by Claude vision via edge function. |
| `lib/services/ocr.ts` | ~200 | Zero importers. Original OCR service. |
| `lib/services/confidence-scoring.ts` | ~550 | Zero importers. Duplicate of `lib/ai/confidence-scoring-service.ts`. |
| `lib/services/recipe-parser.ts` | ~500 | Zero importers. Original recipe parser, superseded by edge function. |

### Dead service classes (types still live)
| File | Dead Code | Live Types |
|------|-----------|------------|
| `lib/ai/recipe-parsing-service.ts` | `RecipeParsingService` class + `recipeParsingService` instance | `ParsedRecipe`, `ParsedIngredient`, `FieldConfidence` |
| `lib/ai/confidence-scoring-service.ts` | `ConfidenceScoringService` class + `confidenceScoringService` instance | `OverallConfidence`, `FieldScore`, `ConfidenceThresholds`, `ConfidenceEnhancement` |

## Constraints

- **No behavioral changes** — this is purely structural. No logic modifications.
- **502 tests must pass after every phase** — regression gate.
- **`npx tsc --noEmit` must pass after every phase** — catches any missed imports.
- **No dynamic imports or `require()` for scan features exist** — verified. All imports are static ESM, so `rg` analysis is sufficient for dead code confirmation.
- **Path alias `@/*` maps to `src/*`** — all cross-directory imports use this alias. Intra-directory imports use relative paths.
- **Test files use relative imports** — `scan-service.test.ts` imports `../scan-service`, so it's unaffected by the `scans/` → `scan/` merge.
- **`DraftEditor.tsx` imports `DraftManager` via relative `./DraftManager`** — this relative import will continue to work after both files move together to `scan/`.
- **`DraftListView.tsx` and `DraftReview.tsx` already import from `@/features/scan/`** — their imports of `scan-service` and `scan-photos` don't need rewriting. Only their own location changes.

## Common Pitfalls

- **Moving files before extracting types** — If `recipe-parsing-service.ts` were deleted before extracting types, DraftEditor/DraftReview/DraftManager would break. Extract first, verify, then proceed.
- **Forgetting intra-module relative imports when moving files** — `DraftEditor.tsx` imports `./DraftManager`. Since both move together to the same directory, the relative import is fine. But if only one moved, it would break.
- **Confusing the two `scan-upload.ts` files** — `scan/scan-upload.ts` is the live one (React Native compatible, multi-photo). `scans/scan-upload.ts` is the dead one (web-only, single-photo, uses `document.createElement`). They share a name but are completely different implementations.
- **Deleting `confidence-scoring-service.ts` entirely** — The `OverallConfidence` type is used by `scan-draft-service.ts`. Must extract types before considering removal of the file.

## Open Risks

- **Dead file deletion scope creep** — The 5 dead `lib/` files (`error-reporting-service`, `ocr-service`, `lib/services/*`) are outside `src/features/scan[s]/` but clearly dead. S01 could remove them since they're confirmed dead, or defer to S04's systematic sweep. Recommendation: remove them in S01 since the analysis is already done and verified, leaving less work for S04.
- **Type extraction location** — Decision says `src/features/scan/types.ts`. But these types are also used by `src/lib/scan/scan-draft-service.ts` and `src/lib/ai/confidence-scoring-service.ts`. An alternative would be `src/lib/scan/types.ts` to keep them closer to their library-layer consumers. However, the decision is already made (M003-CONTEXT.md: "Move types to `src/features/scan/types.ts`").
- **`confidence-scoring-service.ts` and `recipe-parsing-service.ts` full deletion** — After types are extracted, the remaining service class code has zero importers. These files could be deleted entirely in S01 or left for S04. Recommendation: delete them in S01 since the type extraction verifies there are no remaining dependencies.

## Skills Discovered

| Technology | Skill | Status |
|------------|-------|--------|
| Expo | `expo/skills@expo-dev-client` (9.7K installs) | available — not needed for this refactoring slice |
| React Native | N/A | none found relevant to code consolidation |

No skills are needed for S01 — this is a mechanical refactoring task (move files, rewrite imports, extract types, delete dead code) that doesn't require framework-specific knowledge.

## Sources

- Import analysis via `rg` across `src/` and `app/` directories
- `npx tsc --noEmit` — confirms zero TypeScript errors pre-consolidation
- `npx jest` — confirms 502/502 tests passing pre-consolidation
- `tsconfig.json` — confirms `@/*` → `src/*` path alias
- M003-CONTEXT.md dead file analysis — confirmed and expanded with additional dead files found
