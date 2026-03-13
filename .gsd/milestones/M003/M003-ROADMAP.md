# M003: Quality Audit & Cleanup

**Vision:** Systematically audit and fix every screen, flow, and file in the Cookbook app. Consolidate the scan codebase, redesign the web scan experience, polish the multi-draft UI, fix form behavior, remove dead code, clean up logging, and verify everything works on both web and iOS.

## Success Criteria

- Scan flow (upload → process → draft review → save) works smoothly on web and iOS with a web-native design
- Multi-draft list/editor UI is clear and polished
- Every form field chains focus on Enter or submits the form
- No dead buttons, broken links, or swallowed errors on any screen
- OAuth consent branding steps documented for "Berven Book"
- Zero debug console.* calls in client-side production code
- All confirmed dead files removed, no unused imports
- `npx tsc --noEmit` passes, all tests pass
- Single consolidated `src/features/scan/` directory (no more `src/features/scans/`)

## Key Risks / Unknowns

- Scan directory merge may break cross-references in subtle ways — imports reference both directories
- Web scan UI "looking good" is subjective — must use cookbook.pen as design authority
- iOS simulator can't test camera or real OAuth flows

## Proof Strategy

- Scan merge risk → retire in S01 by proving all imports resolve and tests pass after consolidation
- Web scan design risk → retire in S03 by verifying against cookbook.pen and testing in browser at all breakpoints
- iOS simulator limitations → retire in S05 by documenting what was verified vs. what needs real device

## Verification Classes

- Contract verification: TypeScript compilation, test suite (502+ tests), import analysis
- Integration verification: full scan flow exercised on web, form Enter-key behavior verified, navigation audit
- Operational verification: none (cleanup milestone)
- UAT / human verification: iOS simulator walkthrough, visual inspection of web scan redesign, OAuth branding documentation review

## Milestone Definition of Done

This milestone is complete only when all are true:

- `src/features/scans/` directory no longer exists — everything is in `src/features/scan/`
- All confirmed dead files are removed
- Shared types extracted from dead service files
- `npx tsc --noEmit` passes with zero errors
- All tests pass (502+ tests)
- No debug console.log/warn in client-side code (edge functions excluded)
- Every form's TextInputs chain focus or submit on Enter
- Web scan UI verified at mobile/tablet/web breakpoints
- Multi-draft UI verified for visual quality
- OAuth consent branding steps documented
- Every screen audited for dead buttons, broken links, and error handling on web
- Key flows verified on iOS simulator
- Success criteria re-checked against live behavior

## Requirement Coverage

- Covers: QA-01, QA-02, QA-03, QA-04, QA-05, QA-06, QA-07, QA-08, QA-09, QA-10, QA-11, QA-12
- Partially covers: none
- Leaves for later: SUB-01, SUB-02, SUB-03, SEO-02
- Orphan risks: none

## Slices

- [x] **S01: Scan Code Consolidation** `risk:high` `depends:[]`
  > After this: single `src/features/scan/` directory with no duplicates, dead files removed, all tests pass, TypeScript compiles clean.

- [x] **S02: Form UX & OAuth Branding** `risk:medium` `depends:[]`
  > After this: every form submits on Enter with proper focus chaining, OAuth branding steps documented with screenshots.

- [ ] **S03: Scan UI Polish** `risk:medium` `depends:[S01]`
  > After this: web scan upload and multi-draft review UI looks web-native and polished at all breakpoints. iOS scan flow verified in simulator.

- [ ] **S04: Logging & Dead Code Sweep** `risk:low` `depends:[S01]`
  > After this: no debug console.* in client code, any remaining dead files found by systematic audit are removed, TypeScript and tests still clean.

- [ ] **S05: Full App Audit & Cross-Platform Verification** `risk:medium` `depends:[S01,S02,S03,S04]`
  > After this: every screen and flow verified on web and iOS simulator. Dead buttons, broken links, and error handling issues found and fixed. Final audit report produced.

## Boundary Map

### S01 → S03
Produces:
- Consolidated `src/features/scan/` directory with all scan components, services, and types
- `src/features/scan/types.ts` — extracted shared types (ParsedRecipe, ParsedIngredient, FieldConfidence)
- Clean import paths: all `@/features/scans/` references rewritten to `@/features/scan/`
- Verified: all 502+ tests pass, `tsc --noEmit` clean

Consumes:
- nothing (first slice, restructuring existing code)

### S01 → S04
Produces:
- Confirmed list of truly dead files already removed
- Any remaining candidates for S04 to investigate

Consumes:
- nothing (first slice)

### S02 (independent)
Produces:
- `onSubmitEditing` / `ref`-based focus chaining on all auth form TextInputs (login, signup, forgot-password, reset-password)
- `onSubmitEditing` / focus chaining verified on RecipeForm
- OAuth branding documentation (Google Cloud Console steps, Apple Developer steps)

Consumes:
- nothing (independent of scan work)

### S03 depends on S01
Produces:
- Redesigned web scan upload screen (all breakpoints)
- Polished multi-draft list/editor UI
- iOS scan flow verified in simulator

Consumes from S01:
- Consolidated scan components from `src/features/scan/`
- Clean import paths

### S04 depends on S01
Produces:
- Client-side code free of debug console.log/warn/error
- Any additional dead files found by systematic sweep removed
- Audit report of what was cleaned

Consumes from S01:
- Consolidated codebase (reduced surface area to audit)

### S05 depends on S01, S02, S03, S04
Produces:
- Screen-by-screen audit results (web + iOS)
- Fixes for any dead buttons, broken links, or error handling issues found
- Final verification that all success criteria are met

Consumes from all prior slices:
- Consolidated scan code (S01)
- Fixed forms and OAuth docs (S02)
- Polished scan UI (S03)
- Clean logging (S04)
