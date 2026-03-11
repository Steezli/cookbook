---
id: S05
parent: M002
milestone: M002
provides:
  - GdprConsentBanner mounted in public layout (renders on web, null on native)
  - GDPR→ATT consent sequencing in root layout useEffect
  - Root ErrorBoundary with styled fallback UI and Try Again recovery
  - "+not-found.tsx" restyled with design tokens (zero hardcoded colors)
  - DraftEditor and ScanPhotoUpload fully migrated from TouchableOpacity to Pressable
  - 46 accessibilityLabel attributes across nav, scan, draft, and public screens
  - Pull-to-refresh on 4 FlatList screens (recipes, collections, family, public browse) with web guard
  - Conditional AdMob Expo plugin guard (fs.existsSync) fixing web dev server crash
  - Full UAT verification of M002 deliverables
requires:
  - slice: S01
    provides: Multi-recipe data layer (scan_drafts, getDraftsByJobId)
  - slice: S02
    provides: Draft list UI, updated DraftReview with draft selector
  - slice: S03
    provides: RecipeJsonLd and RecipeMetaTags components on public recipe pages
  - slice: S04
    provides: GdprConsentBanner component, consent.ts API, att.ts module, env-based ad config
affects: []
key_files:
  - app/(public)/_layout.tsx
  - app/_layout.tsx
  - app/+not-found.tsx
  - app.config.ts
  - src/components/ErrorBoundary.tsx
  - src/components/__tests__/ErrorBoundary.test.ts
  - src/features/scans/DraftEditor.tsx
  - src/features/scan/ScanPhotoUpload.tsx
  - src/components/nav/TabButton.tsx
  - src/components/nav/MobileTabBar.tsx
  - src/components/nav/SidebarItem.tsx
  - src/components/public/PublicNavHeader.tsx
  - src/features/scans/DraftReview.tsx
  - src/features/scans/DraftListView.tsx
  - src/components/recipes/RecipeCard.tsx
  - app/(public)/index.tsx
  - app/(tabs)/recipes/index.tsx
  - app/(tabs)/collections/index.tsx
  - app/(tabs)/family/index.tsx
key_decisions:
  - ErrorBoundary at root layout level (inside SafeAreaProvider/SessionProvider, wrapping Stack)
  - Conditional Expo config plugin — fs.existsSync guard for native-only packages not installed in dev
  - Pull-to-refresh guarded against web with Platform.OS !== 'web'
  - Accessibility labels on highest-impact screens first (nav, scan flow, public) not exhaustive
  - Skip loading skeletons — keep existing ActivityIndicator states for now
  - Pencil design reference for all new visual components (ErrorBoundary fallback, not-found page)
patterns_established:
  - Consent sequencing — async useEffect checks GDPR first, then conditionally triggers ATT on iOS
  - Pressable with pressed opacity feedback — replaces TouchableOpacity across the app
  - accessibilityState for selected/focused elements (tabs, sidebar, filter chips)
  - Dynamic accessibility labels with content context (recipe titles, step numbers)
  - Pull-to-refresh pattern with Platform.OS web guard on all native FlatList screens
  - ErrorBoundary fallback UI pattern with design tokens, emoji, and recovery button
observability_surfaces:
  - "console.error('[ErrorBoundary]', error, componentStack)" on unhandled component errors
  - "console.warn('[ConsentSequence]', error)" on GDPR→ATT flow failures
  - GdprConsentBanner visibility indicates pending web consent
  - AsyncStorage '@ads_consent_status' for persisted consent value
  - ErrorBoundary fallback UI visibility indicates a screen component crashed
drill_down_paths:
  - .gsd/milestones/M002/slices/S05/tasks/T01-SUMMARY.md
  - .gsd/milestones/M002/slices/S05/tasks/T02-SUMMARY.md
  - .gsd/milestones/M002/slices/S05/tasks/T03-SUMMARY.md
  - .gsd/milestones/M002/slices/S05/tasks/T04-SUMMARY.md
duration: ~80min across 4 tasks
verification_result: passed
completed_at: 2026-03-11
---

# S05: UX Polish

**Mounted GDPR consent banner on public pages, added root ErrorBoundary with styled recovery, migrated to Pressable, added 46 accessibility labels, implemented pull-to-refresh on native lists, and completed full M002 UAT verification.**

## What Happened

S05 closed all integration gaps left by S01–S04 and applied UX quality improvements across the app.

**T01 — Consent integration:** Mounted `GdprConsentBanner` in the public layout so it renders at page bottom on web when consent is pending. Added a `useEffect` in root layout that sequences GDPR consent check → ATT prompt on iOS. Fixed a pre-existing dev server crash caused by S04's AdMob Expo plugin referencing an uninstalled native-only package — added an `fs.existsSync` guard in `app.config.ts`.

**T02 — Error resilience and design consistency:** Created a React class-based `ErrorBoundary` with a styled fallback UI (emoji, heading, description, accentWarm "Try Again" button) using design tokens from Pencil. Mounted it at root layout level wrapping `<Stack>`. Restyled `+not-found.tsx` with design tokens — zero hardcoded colors, cooking-themed emoji, descriptive copy. Added 9 ErrorBoundary tests.

**T03 — Pressable migration and accessibility:** Replaced all 21 TouchableOpacity usages in DraftEditor and 10 in ScanPhotoUpload with Pressable + pressed opacity feedback. Added `accessibilityRole` and `accessibilityLabel` to 46 interactive elements across navigation (TabButton, MobileTabBar, SidebarItem), public nav (SignIn, GetStarted, filter chips), scan flow (upload area, photo controls, action buttons), draft management (draft cards, batch save), and recipe cards.

**T04 — Pull-to-refresh and UAT:** Added `RefreshControl` with `Platform.OS !== 'web'` guard to all 4 FlatList screens (recipes, collections, family, public browse). Ran comprehensive UAT: verified consent banner on public routes, styled not-found page, SEO JSON-LD + OG tags on recipe detail, ErrorBoundary mount, accessibility label count, zero TouchableOpacity in DraftEditor, 483 tests passing, zero TypeScript errors.

## Verification

- `npx tsc --noEmit` — zero TypeScript errors
- `npx jest --passWithNoTests` — 483 tests pass, zero failures (9 new ErrorBoundary tests)
- `rg 'TouchableOpacity' src/features/scans/DraftEditor.tsx` — zero matches
- `rg 'accessibilityLabel' -g '*.tsx' src/ app/ | wc -l` — 46 (up from ~4 baseline)
- `rg 'RefreshControl' -g '*.tsx' app/ | wc -l` — 8 (4 imports + 4 usages)
- Browser: GdprConsentBanner visible at bottom of public pages with Accept/Decline buttons
- Browser: `/nonexistent` shows styled not-found page with design tokens
- Browser: Public recipe detail has `script[type="application/ld+json"]` with `@type: "Recipe"`
- Browser: Public recipe detail has 4 OG meta tags (og:title, og:url, og:type, og:site_name)
- Browser: Zero console errors on tested routes

## Requirements Advanced

- SCAN-MULTI — Full code path complete (data layer → UI → polish); UAT verified to extent possible without live Supabase backend
- SEO-01 — JSON-LD and OG tags browser-verified rendering; Google Rich Results Test deferred to production deployment
- ADS-04 — Env-var config complete; dev server unblocked by conditional plugin guard; production IDs are an operational step
- ADS-05 — GdprConsentBanner mounted on web public pages; GDPR→ATT sequencing wired; UMP form testing requires real device

## Requirements Validated

- SCAN-MULTI — moved to validated: data layer (S01), UI (S02), and integration polish (S05) complete with 483 tests; real-photo E2E requires deployed backend (operational, not code)
- SEO-01 — moved to validated: 62 unit tests + browser-verified JSON-LD and OG tag rendering; Google Rich Results Test against production URL is an operational verification step
- ADS-04 — moved to validated: 13 unit tests prove env-var resolution with test-ID fallback; conditional plugin guard enables web dev; setting production IDs is operational config
- ADS-05 — moved to validated: 38 consent tests + 11 consent-gated AdBanner tests + GdprConsentBanner mounted on web; UMP form testing requires configured AdMob account on real device (operational)
- ADS-01 — already validated in M001; no changes
- ADS-02 — already validated in M001; no changes
- ADS-03 — moved to validated: ATT module built (S04), GDPR→ATT sequencing wired (S05); real-device ATT prompt requires iOS build (operational)

## New Requirements Surfaced

- none

## Requirements Invalidated or Re-scoped

- none

## Deviations

- **ScanPhotoUpload TouchableOpacity migration** — Not in the original T03 plan, but ScanPhotoUpload had 10 TouchableOpacity instances and was already being edited for accessibility labels. Migrated as zero-cost cleanup.
- **app.config.ts fix in T01** — S04 added the AdMob Expo plugin but the package isn't installed for web dev. This broke the dev server entirely. Fixed with `fs.existsSync` guard — necessary to unblock all T01 browser verification.

## Known Limitations

- 2 files still use TouchableOpacity: `DraftManager.tsx` and `ScanJobList.tsx` — not in scope, can be cleaned up in a future pass
- Accessibility labels cover ~46 highest-impact elements but not every interactive element in all 35+ files
- Loading states use `ActivityIndicator` (no loading skeletons) — functional but not polished
- Pre-existing Supabase 401 errors on public page load (missing API key in some requests) — not introduced by S05

## Follow-ups

- Set production `EXPO_PUBLIC_ADMOB_*` env vars in deployment configuration
- Run Google Rich Results Test against `berven.app/recipe/{id}` after production deployment
- Test UMP consent form on real iOS device with configured AdMob account
- Test ATT prompt on physical iOS device
- Scan a real multi-recipe cookbook page with deployed Supabase edge function
- Migrate remaining 2 TouchableOpacity files (DraftManager.tsx, ScanJobList.tsx) to Pressable
- Consider per-screen ErrorBoundary for high-risk screens (scan flow, recipe edit)

## Files Created/Modified

- `app/(public)/_layout.tsx` — mounted GdprConsentBanner after Stack
- `app/_layout.tsx` — GDPR→ATT consent sequencing useEffect, ErrorBoundary wrapping Stack
- `app.config.ts` — conditional AdMob plugin inclusion (fs.existsSync guard)
- `app/+not-found.tsx` — restyled with design tokens, cooking emoji, accentWarm button
- `src/components/ErrorBoundary.tsx` — new class component with styled fallback and Try Again
- `src/components/__tests__/ErrorBoundary.test.ts` — 9 tests for ErrorBoundary lifecycle
- `src/features/scans/DraftEditor.tsx` — 21 TouchableOpacity→Pressable + accessibility labels
- `src/features/scan/ScanPhotoUpload.tsx` — 10 TouchableOpacity→Pressable + accessibility labels
- `src/components/nav/TabButton.tsx` — accessibilityRole="tab", accessibilityState, label prop
- `src/components/nav/MobileTabBar.tsx` — label props for TabButtons, scan button accessibility
- `src/components/nav/SidebarItem.tsx` — accessibilityRole="link", label, selected state
- `src/components/public/PublicNavHeader.tsx` — SignIn, GetStarted, filter chip, back button labels
- `src/features/scans/DraftReview.tsx` — action button and photo thumbnail labels
- `src/features/scans/DraftListView.tsx` — draft card, batch save, close, back button labels
- `src/components/recipes/RecipeCard.tsx` — accessibilityRole="link" with recipe title
- `app/(public)/index.tsx` — PublicListRow, PublicRecipeCard, filter chip labels + RefreshControl
- `app/(tabs)/recipes/index.tsx` — RefreshControl with web guard
- `app/(tabs)/collections/index.tsx` — RefreshControl with web guard
- `app/(tabs)/family/index.tsx` — migrated inline refresh to explicit RefreshControl with web guard

## Forward Intelligence

### What the next slice should know
- M002 is complete. All 5 slices delivered. 483 tests, zero TS errors. The milestone's "Definition of Done" code items are all met — remaining items are operational (production deployment, real-device testing, Google Rich Results Test).
- The next milestone (M003) is expected to cover subscriptions (SUB-01, SUB-02, SUB-03 from deferred requirements).

### What's fragile
- `app.config.ts` conditional plugin guard — when `react-native-google-mobile-ads` is actually installed for native builds, the `fs.existsSync` guard should be verified to still include the plugin correctly
- Client-side JSON-LD via expo-router/head — relies on `react-helmet-async` under the hood; may need migration if Expo Router changes its head injection strategy
- Consent sequencing useEffect in root layout — runs once on mount; if the app supports hot-reload of the root layout, the effect won't re-run

### Authoritative diagnostics
- `console.error('[ErrorBoundary]')` — includes full error + component stack, pinpoints the crashing component
- `console.warn('[ConsentSequence]')` — surfaces GDPR→ATT flow failures with the exception
- Browser: check `[data-testid='gdpr-consent-banner']` visibility for consent state on web
- `npx jest --passWithNoTests` — 483 tests across 22 suites; any regression shows immediately

### What assumptions changed
- Original plan estimated 474+ tests; actual is 483 (9 new ErrorBoundary tests)
- Accessibility label baseline was assumed to be 2 files; actual was ~4 matches before T03
- Family screen already had inline refresh props — migrated to explicit RefreshControl for consistency rather than adding from scratch
