# M002: Production Polish — Context

**Gathered:** 2026-03-11
**Status:** Ready for planning

## Project Description

Cookbook (Family Recipe Vault) — a cross-platform Expo/React Native app for capturing handwritten family recipes via photo scanning, translating them into clean searchable recipes with AI-powered OCR, and organizing them within privacy-controlled family spaces. M001 delivered the full app; M002 polishes it for production and adds multi-recipe scan.

## Why This Milestone

M001 shipped all features but left gaps for production readiness: test ad unit IDs, no SEO for public recipes, no multi-recipe scan support, and various UX rough edges. M002 closes these gaps before App Store submission.

## User-Visible Outcome

### When this milestone is complete, the user can:

- Upload a photo of a cookbook page with 2+ recipes and get separate drafts for each recipe
- Upload a batch of multiple recipe photos and get a draft for each one
- Find public recipes via Google search (structured data + SSR)
- See real ads on public browsing screens (production AdMob)
- Accept GDPR consent prompt before seeing personalized ads (EU users)
- Experience a polished, bug-free UI across mobile/tablet/web

### Entry point / environment

- Entry point: Expo app on iOS simulator, Android emulator, and web browser
- Environment: local dev with Supabase backend
- Live dependencies involved: Supabase (auth, database, storage, edge functions), Google Cloud Vision, OpenAI/Claude for recipe parsing, AdMob

## Completion Class

- Contract complete means: all unit tests pass, TypeScript clean, edge function handles multi-recipe parsing
- Integration complete means: scan flow creates multiple drafts from a single photo, public pages render structured data
- Operational complete means: production ad unit IDs configured, GDPR consent flow works on real devices

## Final Integrated Acceptance

To call this milestone complete, we must prove:

- A photo with 2 recipes produces 2 separate drafts that can each be saved as independent recipes
- A batch of 3 recipe photos produces 3 drafts
- A public recipe page includes valid schema.org/Recipe JSON-LD
- Ads render with production unit IDs on public screens (or verified test mode with production config)
- GDPR consent dialog appears on first visit for applicable users

## Risks and Unknowns

- Multi-recipe detection accuracy — Claude/OpenAI may not reliably split pages with 2+ recipes
- SSR on Expo — Expo's web export is static; server rendering requires additional infrastructure (Next.js adapter or Expo Server Components)
- AdMob production approval — Google review can reject ad implementations; need to verify placement compliance

## Existing Codebase / Prior Art

- `supabase/functions/process-scan-job/index.ts` — edge function that processes scan jobs; currently creates 1 draft per job
- `src/lib/scan/scan-draft-service.ts` — client-side draft service with createDraft, getDraftByJobId
- `src/features/scan/scan-service.ts` — createMultiPhotoScanJob, getUserScanJobs, subscribeToJob
- `src/features/scans/DraftReview.tsx` — shows a single draft for a job; needs to handle multiple drafts
- `src/features/ads/config.ts` — test ad unit IDs, route-based placement logic
- `src/features/ads/att.ts` — ATT permission module (iOS only)
- `src/features/ads/AdBanner.tsx` — platform-branched banner component
- `app/(public)/index.tsx` — public recipe browse screen
- `app/(public)/recipe/[id].tsx` — public recipe detail screen
- `src/features/recipes/search.ts` — searchPublicRecipes with cursor pagination

> See `.gsd/DECISIONS.md` for all architectural and pattern decisions.

## Relevant Requirements

- SEO-01 — Recipe structured data markup (schema.org/Recipe) for search engine indexing
- SEO-02 — Server-rendered public recipe pages for SEO crawlers
- ADS-04 — Production ad unit ID configuration
- ADS-05 — GDPR ad consent management for EU users
- SCAN-MULTI — (new) Single photo → multiple recipe drafts; batch multi-photo → multiple drafts

## Scope

### In Scope

- Multi-recipe detection in edge function (1 photo → N drafts)
- Batch scan UX (upload N photos → N drafts)
- Draft list view per job (when job produces multiple drafts)
- schema.org/Recipe structured data on public recipe detail
- Meta tags (Open Graph, Twitter Card) on public recipe pages
- Production AdMob unit IDs via environment config
- GDPR consent banner for EU users on public screens
- UX polish: bug fixes, performance improvements, visual refinements

### Out of Scope / Non-Goals

- Full SSR with server-side rendering framework (defer SEO-02 if it requires Next.js migration)
- Subscription/paywall (SUB-01/02/03 — deferred to M003)
- Offline mode
- Recipe version history

## Technical Constraints

- Expo/React Native — no direct DOM access on native; web HTML only via Platform branching
- Supabase edge functions run on Deno
- AdMob requires native development build (not Expo Go)
- schema.org markup must work with Expo's static web export

## Integration Points

- Supabase edge function `process-scan-job` — must be updated for multi-recipe detection
- `scan_drafts` table — currently 1:1 with scan_jobs; needs 1:N relationship
- AdMob SDK — `react-native-google-mobile-ads` needs production app ID in app.json
- Expo web export — structured data must be injectable into HTML head

## Open Questions

- Can schema.org/Recipe be added client-side via react-helmet or expo-head, or does it need SSR for Google to index it? — Google can index client-rendered JSON-LD but prefers SSR; start with client-side and verify with Search Console
- Should multi-recipe detection be opt-in (user specifies "this page has multiple recipes") or automatic? — Start automatic with a confirmation step showing detected recipe count
- How should the draft review UX change for multi-draft jobs? — Show a draft list with recipe titles, each tappable to review/edit individually
