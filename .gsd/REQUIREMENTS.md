# Requirements

## Active

(No active requirements — all moved to Validated or Deferred.)

## Validated

### ADS-01 — Ad banner component (320x50 mobile, 728x90 web) with platform branching (AdMob native, placeholder web)

- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: M001/S13

Ad banner component (320x50 mobile, 728x90 web) with platform branching (AdMob native, placeholder web). Validated in M001 with unit tests and browser verification.

### ADS-02 — Ad placement on public browsing screens only (never authenticated screens)

- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: M001/S13

Ad placement on public browsing screens only (never authenticated screens). Route-pattern allowlist with unit tests. Validated in M001.

### ADS-03 — ATT permission prompt on iOS for ad tracking

- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: M002/S04, M002/S05 (GDPR→ATT sequencing)

ATT permission module with dynamic import (S04). GDPR→ATT consent sequencing wired in root layout (S05). Real-device ATT prompt requires iOS build (operational verification).

### DESIGN-01 — Design token system (tokens.ts) extracting all cookbook.pen $ variables as TypeScript constants

- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

Design token system (tokens.ts) extracting all cookbook.pen $ variables as TypeScript constants

### DESIGN-02 — Breakpoint detection hook (useBreakpoint) returning mobile/tablet/web at 390/768/1440px thresholds

- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

Breakpoint detection hook (useBreakpoint) returning mobile/tablet/web at 390/768/1440px thresholds

### DESIGN-03 — Font loading for Bricolage Grotesque (display) and DM Sans (body) via @expo-google-fonts

- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

Font loading for Bricolage Grotesque (display) and DM Sans (body) via @expo-google-fonts

### DESIGN-04 — Missing screen designs created in cookbook.pen: Sign Up, Forgot Password, Profile/Settings, Invite, Draft Review (all 3 breakpoints each)

- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

Missing screen designs created in cookbook.pen: Sign Up, Forgot Password, Profile/Settings, Invite, Draft Review (all 3 breakpoints each)

### NAV-01 — Root navigation converted from flat Stack to Tabs route group with (tabs)/, (public)/, (auth)/ separation

- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

Root navigation converted from flat Stack to Tabs route group with (tabs)/, (public)/, (auth)/ separation

### NAV-02 — Mobile bottom tab bar matching cookbook.pen spec (5 tabs: Home, Search, Scan, Favorites, Profile)

- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

Mobile bottom tab bar matching cookbook.pen spec (5 tabs: Home, Search, Scan, Favorites, Profile)

### NAV-03 — Web left sidebar (260px) matching cookbook.pen spec (Home, My Recipes, Collections, Scan Recipe, Family, Settings)

- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

Web left sidebar (260px) matching cookbook.pen spec (Home, My Recipes, Collections, Scan Recipe, Family, Settings)

### NAV-04 — Tablet header navigation matching cookbook.pen spec

- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

Tablet header navigation matching cookbook.pen spec

### NAV-05 — Page container component providing consistent padding/max-width per breakpoint

- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

Page container component providing consistent padding/max-width per breakpoint

### SCREEN-01 — Home screen rebuilt to cookbook.pen spec at all 3 breakpoints with feature navigation (greeting, search, featured recipes, quick actions)

- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

Home screen rebuilt to cookbook.pen spec at all 3 breakpoints with feature navigation (greeting, search, featured recipes, quick actions)

### SCREEN-02 — Recipe list screen rebuilt with responsive grid (1-col mobile, 2-col tablet, 3-col web) and photo thumbnails

- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

Recipe list screen rebuilt with responsive grid (1-col mobile, 2-col tablet, 3-col web) and photo thumbnails

### SCREEN-03 — Recipe detail screen rebuilt to cookbook.pen spec at all 3 breakpoints

- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

Recipe detail screen rebuilt to cookbook.pen spec at all 3 breakpoints

### SCREEN-04 — Create/Edit recipe screens rebuilt to cookbook.pen spec at all 3 breakpoints

- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

Create/Edit recipe screens rebuilt to cookbook.pen spec at all 3 breakpoints

### SCREEN-04a — Cooking Mode walkthrough screen at all 3 breakpoints — step-by-step guided cooking with per-step ingredients

- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

Cooking Mode walkthrough screen at all 3 breakpoints — step-by-step guided cooking with per-step ingredients

### SCREEN-05 — Collections screens rebuilt to cookbook.pen spec at all 3 breakpoints

- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

Collections screens rebuilt to cookbook.pen spec at all 3 breakpoints

### SCREEN-06 — Family management screens rebuilt to cookbook.pen spec at all 3 breakpoints

- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

Family management screens rebuilt to cookbook.pen spec at all 3 breakpoints

### SCREEN-07 — Scan/Draft screens rebuilt to cookbook.pen spec at all 3 breakpoints with scan photo display in draft review

- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

Scan/Draft screens rebuilt to cookbook.pen spec at all 3 breakpoints with scan photo display in draft review

### SCREEN-08 — Auth screens (Login, Sign Up, Forgot Password) rebuilt to cookbook.pen spec at all 3 breakpoints

- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

Auth screens (Login, Sign Up, Forgot Password) rebuilt to cookbook.pen spec at all 3 breakpoints

### SCREEN-09 — Profile/Settings screen implemented to cookbook.pen spec at all 3 breakpoints

- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

Profile/Settings screen implemented to cookbook.pen spec at all 3 breakpoints

### SCREEN-10 — Invite screen implemented to cookbook.pen spec at all 3 breakpoints

- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

Invite screen implemented to cookbook.pen spec at all 3 breakpoints

### PUB-01 — Public recipe browse screen with search bar and filter chips (unauthenticated)

- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

Public recipe browse screen with search bar and filter chips (unauthenticated)

### PUB-02 — Public recipe detail screen with read-only view and author attribution

- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

Public recipe detail screen with read-only view and author attribution

### PUB-03 — Public navigation header with logo, Sign In, and Get Started CTA

- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

Public navigation header with logo, Sign In, and Get Started CTA

### PUB-04 — Cursor-based pagination for public recipe listing

- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

Cursor-based pagination for public recipe listing

### SCAN-MULTI — Multi-recipe scan: a photo containing 2+ recipes produces separate drafts for each

- Status: validated
- Class: core-capability
- Source: M002 roadmap
- Primary Slice: M002/S01 (data layer), M002/S02 (UI), M002/S05 (integration polish)

A single photo containing multiple recipes is detected and split by the edge function into separate scan_drafts rows with draft_index ordering. Parser handles array and legacy formats. getDraftsByJobId() returns ScanDraft[] for the multi-draft UI. Data layer (S01), UI layer (S02), and integration polish (S05) complete with 483 tests. Real-photo E2E requires deployed Supabase backend (operational verification).

### SEO-01 — Recipe structured data markup for search engine indexing

- Status: validated
- Class: core-capability
- Source: M002 roadmap
- Primary Slice: M002/S03

Public recipe detail pages include valid schema.org/Recipe JSON-LD structured data generated from real recipe data. Client-side rendered via expo-router/head. 62 unit tests prove generation logic; browser verification confirms runtime rendering in S05 UAT. Google Rich Results Test against production URL is an operational verification step.

### ADS-04 — Production ad unit ID configuration via environment variables

- Status: validated
- Class: core-capability
- Source: M002 roadmap
- Primary Slice: M002/S04

Ad config reads `EXPO_PUBLIC_ADMOB_IOS_BANNER_ID` and `EXPO_PUBLIC_ADMOB_ANDROID_BANNER_ID` from env vars, falling back to Google test IDs. `app.config.ts` reads app-level IDs for the Expo plugin with conditional fs.existsSync guard. `.env.example` documents all four ADMOB vars. 13 unit tests prove env-var resolution, fallback, cross-platform isolation. Setting production IDs is an operational config step.

### ADS-05 — GDPR ad consent management for EU users

- Status: validated
- Class: core-capability
- Source: M002 roadmap
- Primary Slice: M002/S04, M002/S05 (integration wiring)

Unified consent API (`getConsentStatus`, `requestConsent`, `canShowPersonalizedAds`, `setWebConsentStatus`) with platform-branched implementation: native via UMP SDK dynamic import, web via AsyncStorage + custom `GdprConsentBanner`. GdprConsentBanner mounted in public layout (S05). GDPR→ATT consent sequencing wired in root layout (S05). Consent status gates `requestNonPersonalizedAdsOnly` in AdBanner. 38 consent tests + 11 consent-gated AdBanner tests. UMP form testing requires real device with configured AdMob account (operational verification).

## Deferred

## Out of Scope
