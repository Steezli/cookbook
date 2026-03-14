# M005: Technical Hardening

**Vision:** Resolve all issues from deep technical audit — security fixes, data integrity, performance, code quality, type safety, error handling — then verify every feature end-to-end on web and iOS.

## Success Criteria

- Zero LIKE pattern injection in search (escaped wildcards)
- Scan retry logic correctly bounded by max_retries with preserved error messages
- No in-place mutation of returned data objects
- Recipe list photo queries use single efficient query (no N+1)
- Zero `any` types in feature/lib code (Supabase types generated)
- No duplicated parser logic between client and edge function
- Web scan upload correctly reports edge function failures
- Health check endpoint on server.js
- Full web walkthrough passes — all screens, all actions
- Full iOS walkthrough passes — all screens, all actions including scanner with real photos

## Key Risks / Unknowns

- Edge function parser deduplication — Deno can't import from src/, need a copy/sync strategy
- Supabase type generation — may surface schema mismatches that need migration fixes
- iOS scanner end-to-end — requires real device or simulator with camera access

## Proof Strategy

- Parser deduplication → retire in S02 by proving edge function deploys with synced parser and tests pass
- Type safety → retire in S01 by proving `supabase gen types` output compiles and replaces all `any`
- iOS scanner → retire in S05 by processing 4 real recipe images end-to-end

## Verification Classes

- Contract verification: `npx tsc --noEmit`, `npx jest`, zero `any` grep in src/
- Integration verification: scan pipeline processes real images, auth flow works, recipe CRUD works
- Operational verification: health check endpoint responds, server starts cleanly
- UAT / human verification: full web and iOS walkthroughs with visual confirmation

## Milestone Definition of Done

This milestone is complete only when all are true:

- All 5 slices complete with passing verification
- TypeScript clean, all tests pass (548+)
- Zero `any` in src/ feature code
- Full web walkthrough documented and passing
- Full iOS walkthrough documented and passing
- 4 test recipe images processed successfully through scanner

## Requirement Coverage

- Covers: All existing requirements (hardening, not new features)
- Partially covers: none
- Leaves for later: SUB-01, SUB-02, SUB-03 (subscriptions)
- Orphan risks: none

## Slices

- [x] **S01: Security & Data Integrity Fixes** `risk:high` `depends:[]`
  > After this: Search is injection-safe, retry logic is correct, backfill doesn't mutate, CORS is tightened, password validation is stronger

- [x] **S02: Performance & Code Deduplication** `risk:medium` `depends:[]`
  > After this: Photo queries are efficient, tags query is optimized, comments are paginated, parser logic is single-source, deprecated code removed

- [x] **S03: Type Safety & Error Handling** `risk:medium` `depends:[S01]`
  > After this: Zero `any` in feature code, Supabase types generated, web scan upload reports failures, ensureProfile logs errors, health check endpoint exists

- [ ] **S04: Code Quality & Readability** `risk:low` `depends:[S01,S02]`
  > After this: Repetitive OAuth functions consolidated, excess comments trimmed, consistent patterns across all API modules, clean readable codebase

- [ ] **S05: End-to-End Verification** `risk:medium` `depends:[S01,S02,S03,S04]`
  > After this: Every feature verified on web and iOS — auth, recipes, scan (with 4 real photos), collections, profile, public browsing — all working

## Boundary Map

### S01 → S03

Produces:
- Fixed search functions with escaped LIKE patterns
- Corrected retry logic in edge function
- Non-mutating backfill in recipe API

Consumes:
- nothing (first slice)

### S02 → S04

Produces:
- Efficient photo query functions
- Single-source parser with sync script
- Removed deprecated getRecipes()

Consumes:
- nothing (independent of S01)

### S03 → S04

Produces:
- Generated Supabase types replacing `any`
- Proper error handling in scan upload and ensureProfile
- Health check endpoint

Consumes:
- S01 security fixes (clean base)

### S04 → S05

Produces:
- Consolidated, readable codebase ready for verification

Consumes:
- S01, S02, S03 all complete

### S05

Produces:
- Verification reports for web and iOS
- Processed recipe images proving scanner works

Consumes:
- All prior slices (S01–S04)
