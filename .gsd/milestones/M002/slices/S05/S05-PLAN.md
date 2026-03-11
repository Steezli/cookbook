# S05: UX Polish

**Goal:** All deferred S04 integration wiring is complete, UX quality gaps are fixed, and the full M002 test suite passes with zero TypeScript errors.
**Demo:** GdprConsentBanner renders on web public pages; DraftEditor uses Pressable consistently; `+not-found.tsx` uses design tokens; ErrorBoundary catches unhandled errors at root; all 474+ tests pass; `npx tsc --noEmit` clean.

## Must-Haves

- GdprConsentBanner mounted in the public layout and renders on web
- GDPR→ATT consent sequencing wired in root layout (GDPR first, then ATT on iOS)
- Root ErrorBoundary catches unhandled JS errors with styled fallback UI
- DraftEditor migrated from TouchableOpacity to Pressable with press feedback
- `+not-found.tsx` styled with design tokens
- Accessibility labels on highest-impact interactive elements (nav, scan flow, public screens)
- Pull-to-refresh on native FlatList screens (guarded against web)
- All existing tests pass, zero TypeScript errors

## Proof Level

- This slice proves: integration + operational (integration wiring from S04 deferred items; operational resilience via ErrorBoundary; UX quality improvements)
- Real runtime required: yes (browser verification of consent banner, not-found page, error boundary)
- Human/UAT required: yes (multi-recipe real-photo scan, Google Rich Results Test against production URL, real-device UMP/ATT testing — documented as "verified to extent possible" with pre-release manual items noted)

## Verification

- `npx jest --passWithNoTests` — all tests pass (474+), zero failures
- `npx tsc --noEmit` — zero TypeScript errors
- Browser: `GdprConsentBanner` visible at bottom of public pages on web (when consent not yet given)
- Browser: `+not-found.tsx` uses design token colors/fonts (visual check)
- Browser: root ErrorBoundary renders fallback on simulated error (evaluate `throw` in a test component)
- `rg 'TouchableOpacity' src/features/scans/DraftEditor.tsx` — zero matches (migration complete)
- `rg 'accessibilityLabel' -g '*.tsx' src/ app/ | wc -l` — significantly more than the current 2-file baseline

## Observability / Diagnostics

- Runtime signals: `console.error('[ErrorBoundary]')` with component stack on unhandled errors; `console.warn('[ConsentSequence]')` on GDPR→ATT flow failures
- Inspection surfaces: GdprConsentBanner visibility indicates pending web consent; AsyncStorage `@ads_consent_status` for persisted consent; ErrorBoundary fallback UI visible on crash
- Failure visibility: ErrorBoundary displays "Something went wrong" with a "Try Again" button and logs the error + componentStack for debugging
- Redaction constraints: none — no secrets or PII in this slice

## Integration Closure

- Upstream surfaces consumed: `GdprConsentBanner` (S04), `requestConsent`/`getConsentStatus` from `consent.ts` (S04), `requestTrackingPermission` from `att.ts` (S04), design tokens from `tokens.ts`, all S01–S04 test suites
- New wiring introduced in this slice: GdprConsentBanner mounted in `app/(public)/_layout.tsx`; GDPR→ATT sequencing useEffect in `app/_layout.tsx`; ErrorBoundary wrapping root Stack; pull-to-refresh on FlatList screens
- What remains before the milestone is truly usable end-to-end: production AdMob env vars (operational, not code), real-device UMP/ATT testing (requires iOS build), Google Rich Results Test against production URL (requires deployment to berven.app), real-photo multi-recipe scan test (requires Supabase backend)

## Tasks

- [x] **T01: Mount GdprConsentBanner and wire GDPR→ATT consent sequencing** `est:30m`
  - Why: S04 built the consent banner and ATT module but explicitly deferred mounting and sequencing to S05. This is the last integration gap for ADS-05 and ADS-03.
  - Files: `app/(public)/_layout.tsx`, `app/_layout.tsx`, `src/features/ads/consent.ts`
  - Do: Mount GdprConsentBanner in public layout (web only). Add a useEffect in root layout that runs GDPR consent check → if obtained and iOS → trigger ATT prompt. Keep it simple — sequential async in a single effect. Add console.warn for failures.
  - Verify: `npx tsc --noEmit` clean; browser shows consent banner on public route; existing 474 tests still pass
  - Done when: GdprConsentBanner renders at bottom of public pages on web; GDPR→ATT sequencing runs on app mount; no TypeScript errors

- [x] **T02: Add root ErrorBoundary and style +not-found with design tokens** `est:25m`
  - Why: No ErrorBoundary exists — unhandled JS errors crash the entire app. `+not-found.tsx` is the only screen not using the design token system. Both are resilience and consistency improvements.
  - Files: `src/components/ErrorBoundary.tsx`, `src/components/__tests__/ErrorBoundary.test.ts`, `app/_layout.tsx`, `app/+not-found.tsx`
  - Do: Inspect `cookbook.pen` in Pencil for error state styling, color palette, and component patterns to match existing app aesthetic. Create a React class-based ErrorBoundary with styled fallback (using design tokens from Pencil), componentDidCatch logging, and "Try Again" button. Mount it inside the root layout wrapping the Stack. Restyle `+not-found.tsx` with design tokens matching Pencil design language. Write tests for ErrorBoundary (renders children normally, catches error and shows fallback, reset works).
  - Verify: `npx jest src/components/__tests__/ErrorBoundary.test.ts` passes; `npx tsc --noEmit` clean; browser shows styled not-found page at an invalid route
  - Done when: ErrorBoundary wraps root layout and catches errors with a styled fallback matching Pencil design language; `+not-found.tsx` uses design tokens; new tests pass

- [x] **T03: Migrate DraftEditor to Pressable and add accessibility labels across core screens** `est:35m`
  - Why: DraftEditor is the only file using TouchableOpacity (inconsistent). Only 2 files have accessibility labels — this is the highest-impact improvement for screen readers and testing.
  - Files: `src/features/scans/DraftEditor.tsx`, plus 8–12 high-impact screen files for accessibility labels (nav components, scan flow, public screens)
  - Do: Replace all TouchableOpacity usages in DraftEditor with Pressable + `style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}` to preserve press feedback. Add accessibilityRole and accessibilityLabel to Pressable/interactive elements in: tab bar, sidebar items, scan upload, draft review, draft list, public nav header, recipe cards, public recipe browse. Focus on navigation and core flows first.
  - Verify: `rg 'TouchableOpacity' src/features/scans/DraftEditor.tsx` returns zero matches; `rg 'accessibilityLabel' -g '*.tsx' src/ app/ | wc -l` ≥ 20; `npx tsc --noEmit` clean; all tests pass
  - Done when: Zero TouchableOpacity in DraftEditor; accessibility labels on all nav components and core flow screens; no regressions

- [x] **T04: Add pull-to-refresh on native FlatList screens and run full UAT verification** `est:30m`
  - Why: No list screen has pull-to-refresh — a standard mobile UX pattern. This task also performs the final UAT verification for M002's definition of done.
  - Files: `app/(tabs)/recipes/index.tsx`, `app/(tabs)/collections/index.tsx`, `app/(tabs)/family/index.tsx`, `app/(public)/index.tsx`
  - Do: Add RefreshControl to FlatList screens, guarded with `Platform.OS !== 'web'` to avoid visual artifacts on desktop. Thread `refreshing` state and re-fetch callback through each screen. Then run full UAT: verify all tests pass, zero TS errors, browser-verify SEO structured data renders, consent banner appears, ErrorBoundary works, not-found page styled. Document what requires manual pre-release testing (real-device UMP, production Rich Results Test, real-photo multi-recipe scan).
  - Verify: `npx jest --passWithNoTests` — all tests pass; `npx tsc --noEmit` clean; browser verification of consent banner + SEO markup + error boundary
  - Done when: Pull-to-refresh works on native list screens (guarded for web); full test suite green; UAT verification documented in slice summary

## Files Likely Touched

- `app/(public)/_layout.tsx`
- `app/_layout.tsx`
- `app/+not-found.tsx`
- `src/components/ErrorBoundary.tsx`
- `src/components/__tests__/ErrorBoundary.test.ts`
- `src/features/scans/DraftEditor.tsx`
- `src/components/nav/SidebarItem.tsx`
- `src/components/nav/MobileTabBar.tsx`
- `src/components/nav/TabButton.tsx`
- `src/components/public/PublicNavHeader.tsx`
- `src/features/scan/ScanPhotoUpload.tsx`
- `src/features/scans/DraftReview.tsx`
- `src/features/scans/DraftListView.tsx`
- `src/components/recipes/RecipeCard.tsx`
- `app/(tabs)/recipes/index.tsx`
- `app/(tabs)/collections/index.tsx`
- `app/(tabs)/family/index.tsx`
- `app/(public)/index.tsx`
