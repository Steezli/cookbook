# M002: Production Polish

**Vision:** Polish the Cookbook app for production: multi-recipe scan support, SEO for public recipes, production ads with GDPR consent, and UX refinements.

## Success Criteria

- A photo containing 2 recipes produces 2 separate drafts, each saveable as an independent recipe
- Public recipe detail pages include valid schema.org/Recipe JSON-LD visible to search crawlers
- Ads on public screens use production AdMob configuration (not test IDs)
- EU users see a GDPR consent prompt before personalized ads load
- All existing tests pass plus new tests for multi-recipe and SEO features
- Zero TypeScript errors

## Key Risks / Unknowns

- Multi-recipe detection reliability — Claude may produce inconsistent splits for ambiguous pages → test with real cookbook page photos
- Client-side JSON-LD indexability — Google can index JS-rendered structured data but may deprioritize it → verify with Google Rich Results Test after implementation
- AdMob production approval process — unknown timeline; test mode with production config is an acceptable interim state

## Proof Strategy

- Multi-recipe detection → retire in S01 by proving edge function returns N drafts from a single multi-recipe photo, with unit tests
- Client-side JSON-LD → retire in S03 by proving Google Rich Results Test validates the rendered markup
- AdMob production config → retire in S04 by proving the app loads with production app ID and shows test ads in dev mode

## Verification Classes

- Contract verification: Jest unit tests for multi-recipe parsing, JSON-LD generation, GDPR consent logic, ad config
- Integration verification: edge function produces multiple drafts; draft review UI shows draft list; structured data renders in browser
- Operational verification: AdMob initializes with production app ID; ATT + GDPR consent flow works on iOS
- UAT / human verification: scan a real multi-recipe cookbook page; check Google Rich Results Test; visual QA on all screens

## Milestone Definition of Done

This milestone is complete only when all are true:

- All slice deliverables are complete
- Multi-recipe scan works end-to-end (photo → edge function → multiple drafts → review each → save as recipes)
- Public recipe pages pass Google Rich Results Test for Recipe markup
- Ad config uses production IDs (or is verified ready to switch via env vars)
- GDPR consent flow works on first visit
- All tests pass, zero TypeScript errors
- UX polish items identified and resolved

## Requirement Coverage

- Covers: SEO-01, ADS-04, ADS-05, SCAN-MULTI (new)
- Partially covers: SEO-02 (client-side JSON-LD only; full SSR deferred)
- Leaves for later: SUB-01, SUB-02, SUB-03 (subscriptions → M003)
- Orphan risks: none

## Slices

- [x] **S01: Multi-Recipe Scan** `risk:high` `depends:[]`
  > After this: uploading a photo with 2+ recipes produces separate drafts for each; edge function detects and splits recipes; unit tests prove parsing logic
- [x] **S02: Multi-Draft UX** `risk:medium` `depends:[S01]`
  > After this: draft review screen shows a list of drafts when a job produces multiple; each draft can be reviewed, edited, and saved as an independent recipe
- [x] **S03: SEO Structured Data** `risk:medium` `depends:[]`
  > After this: public recipe detail pages include schema.org/Recipe JSON-LD; passes Google Rich Results Test; Open Graph and Twitter Card meta tags present
- [x] **S04: Production Ads + GDPR** `risk:medium` `depends:[]`
  > After this: ad config reads production unit IDs from environment; GDPR consent banner appears for EU users; consent state persists and gates personalized ads
- [x] **S05: UX Polish** `risk:low` `depends:[S01,S02,S03,S04]`
  > After this: all visual bugs fixed, performance improvements applied, UI refinements complete; full UAT pass across iOS/web

## Boundary Map

### S01 → S02

Produces:
- Edge function creates N `scan_drafts` rows per job (1:N relationship)
- `getDraftsByJobId(jobId)` returns `ScanDraft[]` (plural)
- `scan_drafts.draft_index` column for ordering within a job

Consumes:
- nothing (first slice)

### S02 → S05

Produces:
- Draft list UI component showing all drafts for a multi-draft job
- Updated DraftReview with draft selector/navigation

Consumes:
- S01's multi-draft data layer

### S03 (independent)

Produces:
- `RecipeJsonLd` component rendering schema.org/Recipe markup
- `RecipeMetaTags` component for Open Graph / Twitter Card
- Both wired into `app/(public)/recipe/[id].tsx`

Consumes:
- Existing public recipe data from `src/features/recipes/public.ts`

### S04 (independent)

Produces:
- Environment-based ad unit ID configuration (replaces hardcoded test IDs)
- `GdprConsentBanner` component with consent state persistence
- Consent-gated ad loading in `AdBanner`

Consumes:
- Existing ads module at `src/features/ads/`

### S05 (final polish)

Produces:
- Bug fixes, performance improvements, visual refinements
- Full UAT verification across platforms

Consumes:
- All previous slices complete
