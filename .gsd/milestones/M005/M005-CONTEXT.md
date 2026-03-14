# M005: Technical Hardening — Context

**Gathered:** 2026-03-14
**Status:** Ready for planning

## Project Description

Berven Book is a cross-platform Expo/React Native cookbook app with Supabase backend, AI-powered recipe scanning, family sharing, collections, ratings, comments, ads, and a public web surface. Four milestones complete (M001–M004). 548 tests, zero TypeScript errors.

## Why This Milestone

A deep technical audit of the entire codebase surfaced 15+ issues spanning security, data integrity, performance, code quality, type safety, and error handling. These are the kind of issues that compound — a LIKE pattern injection, a broken retry loop, race conditions, N+1 queries, extensive `any` typing, duplicated code between client and edge functions, swallowed errors, and missing observability surfaces. Fixing them now prevents them from becoming production incidents.

## User-Visible Outcome

### When this milestone is complete, the user can:

- Search recipes without pattern injection leaking private data
- Scan recipes with reliable retry/error handling on all platforms
- Browse recipe lists with significantly faster load times
- Trust that all features work end-to-end on both web and iOS (verified)

### Entry point / environment

- Entry point: `expo start --web` (web), Expo Go / iOS Simulator (iOS)
- Environment: local dev + production parity checks
- Live dependencies involved: Supabase (database, auth, storage, edge functions), Claude API

## Completion Class

- Contract complete means: all 548+ tests pass, TypeScript clean, zero `any` in feature code, no hardcoded patterns or duplicated logic
- Integration complete means: scan pipeline, auth flow, recipe CRUD, family system all function correctly
- Operational complete means: full end-to-end verification on both web and iOS — every screen visited, every action exercised

## Final Integrated Acceptance

To call this milestone complete, we must prove:

- All audit issues are resolved with passing tests
- Full web walkthrough: auth → recipes → scan → collections → profile → public browsing
- Full iOS walkthrough: auth → recipes → scan (with real photos) → collections → profile
- Recipe scanner processes the 4 provided test images successfully
- No TypeScript errors, all tests pass

## Risks and Unknowns

- Database migration for retry logic fix may need careful testing against existing data
- Edge function code duplication removal requires a build/copy strategy for Deno compatibility
- Some `any` types in scan draft service map to untyped Supabase responses — may need `supabase gen types`

## Existing Codebase / Prior Art

- `src/features/recipes/search.ts` — LIKE pattern injection
- `supabase/functions/process-scan-job/index.ts` — broken retry logic, duplicated parser
- `src/features/recipes/api.ts` — backfill race condition
- `src/features/recipes/photos.ts` — N+1 photo queries
- `src/lib/scan/scan-draft-service.ts` — extensive `any` usage
- `src/features/scan/scan-photos.ts` — web path swallows edge function errors

> See `.gsd/DECISIONS.md` for all architectural and pattern decisions.

## Scope

### In Scope

- Fix all 15 audit issues (security, data integrity, performance, error handling, type safety, code quality)
- Additional code quality improvements discovered during fixes (repetitive functions, excess commenting, readability)
- Full end-to-end verification on web and iOS
- Scanner testing with 4 provided recipe images

### Out of Scope / Non-Goals

- New features or UI changes
- Family invite email sending (existing known limitation)
- Subscription/paywall system
- Static site generation / SSR

## Technical Constraints

- Edge functions run on Deno — cannot directly import from `src/`
- React Native testing requires platform mocks for native modules
- iOS testing requires Expo Go or simulator

## Integration Points

- Supabase — database, auth, storage, edge functions, real-time subscriptions
- Claude API — recipe scanning via edge function
- Railway — web deployment (server.js)
