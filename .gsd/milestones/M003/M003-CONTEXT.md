# M003: Quality Audit & Cleanup — Context

**Gathered:** 2026-03-12
**Status:** Ready for planning

## Project Description

Systematic bug hunt, code consolidation, dead code removal, and UX consistency audit across the entire Cookbook app (web + iOS). The codebase has accumulated technical debt over M001 and M002: duplicated scan directories, unused files, leftover debug logging, inconsistent scan UX between web and iOS, clunky multi-draft UI, and buttons that don't respond correctly to Enter key.

## Why This Milestone

M001 and M002 built the feature set. M003 cleans the house before subscriptions (M004) add more complexity. Shipping M004 on top of known UX inconsistencies and dead code would compound the debt. The scan flow — the app's core differentiator — needs to feel polished on both platforms.

## User-Visible Outcome

### When this milestone is complete, the user can:

- Upload and scan recipes on web with a web-native UI (not a ported mobile layout)
- Review multi-draft results with a clear, polished UI
- Press Enter in any form field and have it advance focus or submit
- Sign up with Google/Apple and see "Berven Book" on the consent screen
- Navigate every screen without encountering dead buttons, broken links, or swallowed errors
- Use the app on both web and iOS with consistent quality

### Entry point / environment

- Entry point: `npx expo start --web` (web), Expo Go / simulator (iOS)
- Environment: local dev (web), iOS simulator via mac-tools
- Live dependencies involved: Supabase (auth, database, storage, edge functions)

## Completion Class

- Contract complete means: TypeScript compiles clean, all tests pass, no dead imports, no unused files, no debug console.* in client code
- Integration complete means: Every screen navigable and functional on web + iOS simulator, form submission works via Enter key, OAuth branding documented
- Operational complete means: none — this is a cleanup milestone, not a new feature deployment

## Final Integrated Acceptance

To call this milestone complete, we must prove:

- Full scan flow (upload → processing → draft review → save as recipe) works smoothly on both web and iOS
- Every auth form submits correctly via Enter key
- No dead buttons or broken navigation exist on any screen
- `npx tsc --noEmit` passes with zero errors
- All tests pass
- No debug console.log calls remain in client-side code (outside edge functions)
- OAuth branding steps are documented and actionable

## Risks and Unknowns

- **Scan consolidation may break imports** — merging two directories with cross-references requires careful import rewriting
- **Web scan redesign scope** — "make it look good on web" is subjective; must use cookbook.pen as the authority
- **iOS simulator testing** — some features (camera, OAuth) can't be fully tested in simulator
- **Multi-draft UI changes** — improving the UI without changing the data model or navigation means working within existing constraints

## Existing Codebase / Prior Art

### Scan code (the biggest mess)
- `src/features/scan/` — original scan directory (scan-service, scan-upload, scan-photos, RecentScans, ScanJobList, ScanPhotoUpload, useRealtimeSubscription)
- `src/features/scans/` — M002 addition (DraftEditor, DraftListView, DraftManager, DraftReview, ScanJobProgress, ScanPhotoUpload, scan-upload)
- `src/lib/scan/` — scan library layer (scan-draft-service, multi-recipe-parser, multi-draft-helpers, error-classification-service, error-reporting-service, job-status-service, retry-recovery-service)
- `src/lib/ai/` — recipe-parsing-service.ts (exports types used by DraftReview/Editor/Manager), confidence-scoring-service.ts
- `src/lib/services/ocr.ts` — old OCR service
- `src/lib/ocr/ocr-service.ts` — newer OCR service

### Confirmed dead/unused files (zero importers outside tests)
- `src/features/scan/ScanJobList.tsx` — 0 importers
- `src/lib/scan/error-reporting-service.ts` — 0 importers
- `src/features/scans/ScanPhotoUpload.tsx` — only imported by itself (circular)
- `src/features/scans/ScanJobProgress.tsx` — only imported by the dead ScanPhotoUpload above

### Files with types still in use but service code dead
- `src/lib/ai/recipe-parsing-service.ts` — types (ParsedRecipe, ParsedIngredient, FieldConfidence) imported by DraftReview, DraftEditor, DraftManager; service class appears unused
- `src/lib/ai/confidence-scoring-service.ts` — types imported by 2 files; service class may be unused

### Auth screens
- `app/(auth)/login.tsx` — onSubmitEditing only on password field, not email
- `app/(auth)/signup.tsx` — onSubmitEditing only on confirm password, not earlier fields
- `app/(auth)/forgot-password.tsx` — onSubmitEditing correctly on email field

### Console.log hot spots (top 10 by count)
- `supabase/functions/process-scan-job/index.ts` — 19 calls
- `src/lib/scan/scan-draft-service.ts` — 17 calls
- `src/lib/scan/error-reporting-service.ts` — 14 calls (dead file)
- `src/lib/scan/job-status-service.ts` — 12 calls
- `src/features/scans/DraftListView.tsx` — 11 calls
- `src/features/scan/scan-photos.ts` — 9 calls
- `src/lib/scan/retry-recovery-service.ts` — 7 calls
- `src/lib/ocr/ocr-service.ts` — 7 calls
- `src/features/ads/consent.ts` — 7 calls
- `src/features/scan/useRealtimeSubscription.ts` — 6 calls

### OAuth branding
- The Google OAuth consent screen shows `ugixgcbysrwabwzbsjxr.supabase.co` because the Google Cloud Console OAuth consent screen is configured with Supabase defaults, not the app's brand name
- Fix is in Google Cloud Console → OAuth consent screen → Application name, not in code

> See `.gsd/DECISIONS.md` for all architectural and pattern decisions — it is an append-only register; read it during planning, append to it during execution.

## Relevant Requirements

- QA-01 through QA-12 — all 12 active requirements are owned by this milestone

## Scope

### In Scope

- Consolidate scan directories into one (`src/features/scan/`)
- Remove confirmed dead code files
- Extract shared types from dead service files before deletion
- Redesign web scan UI to feel web-native
- Polish multi-draft list/editor UI
- Wire onSubmitEditing / focus chaining across all forms
- Document OAuth consent screen branding steps
- Remove debug console.* from client code
- Systematic button/link/navigation audit on all screens
- Error handling audit on all screens
- Cross-platform testing (web + iOS simulator)

### Out of Scope / Non-Goals

- New features (subscriptions, new screens, new capabilities)
- Changing the scan data model or edge function logic
- Changing navigation structure (tabs, routes)
- Full accessibility audit (a11y labels were partially addressed in M002)
- Performance optimization
- Changing the design system or tokens
- Edge function console.log cleanup (server-side logging is fine)

## Technical Constraints

- Must not break any existing tests (502 passing)
- Must maintain TypeScript compilation with zero errors
- Web scan redesign must use existing design tokens and cookbook.pen reference
- iOS testing limited to simulator capabilities (no camera, no real OAuth)
- Dead code removal must be verified by import analysis, not guessed

## Integration Points

- Supabase Auth — OAuth consent branding is a dashboard/console config, not code
- Google Cloud Console — OAuth consent screen app name configuration
- Expo Router — form submission and navigation behavior
- cookbook.pen (Pencil) — design reference for scan UI redesign

## Open Questions

- Which `scan-upload.ts` is the canonical version? — Will determine during S01 investigation
- Are there additional dead files beyond the ones identified? — Systematic audit in S04 will find them
- How much does the iOS scan flow differ from web in practice? — Will verify in simulator during S05
