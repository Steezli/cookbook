---
estimated_steps: 5
estimated_files: 5
---

# T04: Add pull-to-refresh on native FlatList screens and run full UAT verification

**Slice:** S05 — UX Polish
**Milestone:** M002

## Description

No list screen in the app has pull-to-refresh — a standard mobile UX pattern users expect. This task adds RefreshControl to the main FlatList-based screens (recipes, collections, family, public browse), guarded with `Platform.OS !== 'web'` per research guidance. It then performs the final UAT pass for M002's definition of done: full test suite, TypeScript clean, and browser verification of all S01–S05 deliverables. Items requiring real-device or production deployment are documented as pre-release verification.

## Steps

1. Add pull-to-refresh to `app/(tabs)/recipes/index.tsx`: import `RefreshControl` and `Platform` from react-native. Add `refreshing` state (boolean). Add a `handleRefresh` callback that sets refreshing true, re-fetches recipe data (call existing fetch/load function), then sets refreshing false. Pass `refreshControl={Platform.OS !== 'web' ? <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} /> : undefined}` to FlatList.

2. Repeat the same pattern for `app/(tabs)/collections/index.tsx`, `app/(tabs)/family/index.tsx`, and `app/(public)/index.tsx`. Each screen's handleRefresh should call its existing data-loading function. Keep the web guard consistent.

3. Run `npx tsc --noEmit` — zero TypeScript errors. Run `npx jest --passWithNoTests` — all tests pass (474+), zero failures.

4. Start the dev server and perform browser UAT verification:
   - Navigate to a public route → confirm GdprConsentBanner appears (T01)
   - Navigate to an invalid route → confirm styled not-found page with design tokens (T02)
   - Verify SEO structured data: run `JSON.parse(document.querySelector('script[type="application/ld+json"]').textContent)` on a public recipe page → confirm valid Recipe JSON-LD (S03)
   - Verify meta tags: `document.querySelectorAll('meta[property^="og:"]').length > 0` (S03)
   - Verify no console errors on any page
   - Verify ErrorBoundary is mounted (inspect React component tree or source)

5. Document what requires manual pre-release testing (cannot be automated in this slice):
   - Real-device UMP consent form testing (requires configured AdMob account + iOS build)
   - Google Rich Results Test against production URL (requires deployment to berven.app)
   - Real-photo multi-recipe scan E2E (requires Supabase backend with edge function deployed)
   - ATT prompt on physical iOS device
   - Production AdMob env vars (operational step — set `EXPO_PUBLIC_ADMOB_*` in deployment config)

## Must-Haves

- [ ] RefreshControl on recipes, collections, family, and public browse FlatList screens
- [ ] Platform guard: `Platform.OS !== 'web'` on all RefreshControl usages
- [ ] Full test suite passes (474+ tests, zero failures)
- [ ] Zero TypeScript errors
- [ ] Browser UAT: consent banner renders, not-found styled, SEO markup present, no console errors
- [ ] Pre-release manual testing items documented

## Verification

- `npx tsc --noEmit` — zero errors
- `npx jest --passWithNoTests` — all tests pass
- `rg 'RefreshControl' -g '*.tsx' app/ | wc -l` — ≥4 (one per list screen)
- Browser: public route shows consent banner on web
- Browser: `/nonexistent` shows styled not-found page
- Browser: public recipe page has `script[type="application/ld+json"]` with Recipe data
- Browser: no console errors on any tested route

## Observability Impact

- Signals added/changed: None — pull-to-refresh is a UX interaction, not an observability surface
- How a future agent inspects this: `rg 'RefreshControl' -g '*.tsx' app/` lists all screens with pull-to-refresh; browser verification commands documented in slice plan
- Failure state exposed: None new — this task is verification and final polish

## Inputs

- `app/(tabs)/recipes/index.tsx` — FlatList-based recipe list screen
- `app/(tabs)/collections/index.tsx` — FlatList-based collections list
- `app/(tabs)/family/index.tsx` — FlatList-based family list
- `app/(public)/index.tsx` — FlatList-based public browse screen
- All T01–T03 changes committed and passing
- S05 Research common pitfall: "React Native's RefreshControl renders poorly on web — guard with Platform.OS !== 'web'"

## Expected Output

- 4 screen files updated with RefreshControl + Platform guard + refreshing state
- UAT verification results documented (what passes, what requires pre-release manual testing)
- Full test suite green, zero TypeScript errors — M002 S05 definition of done met
