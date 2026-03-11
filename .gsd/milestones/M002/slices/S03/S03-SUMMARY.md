---
id: S03
parent: M002
milestone: M002
provides:
  - generateRecipeJsonLd pure function for schema.org/Recipe JSON-LD
  - generateRecipeMetaTags pure function for OG + Twitter Card meta tags
  - minutesToIsoDuration ISO 8601 duration helper
  - Head block in public recipe detail page rendering JSON-LD and meta tags on web
requires:
  - slice: none
    provides: none (independent slice)
affects:
  - S05 (UAT includes Google Rich Results Test validation of S03 output)
key_files:
  - src/lib/seo/json-ld.ts
  - src/lib/seo/meta-tags.ts
  - src/lib/seo/duration.ts
  - src/lib/seo/__tests__/json-ld.test.ts
  - src/lib/seo/__tests__/meta-tags.test.ts
  - app/(public)/recipe/[id].tsx
key_decisions:
  - Pure functions in src/lib/seo/ over component-level logic — trivially testable, reusable
  - Client-side Head injection via expo-router/head (no static rendering) — accepted per M002 scope
  - Author fallback "Anonymous" when PublicAuthor is null or display_name is null
  - totalTime only computed when both prep and cook are present
  - aggregateRating requires both rating_average and rating_count to be non-null
  - JSON roundtrip (JSON.parse(JSON.stringify())) as safety net to strip undefined values
  - OG tags use property key, Twitter tags use name key (per spec)
  - renderSeoHead() extracted as shared sub-render function called in both web and mobile/tablet layout paths
  - Canonical pageUrl uses https://berven.app/recipe/{id} (production domain)
patterns_established:
  - Pure SEO utility functions in src/lib/seo/ — no React, no side effects, mock-free tests
  - Conditional field inclusion: only add JSON-LD properties when source data is non-null/non-empty
  - MetaTag type with optional property/name + required content for flexible OG/Twitter rendering
  - Platform-guarded Head rendering — renderSeoHead() returns null on non-web platforms
observability_surfaces:
  - none — static head content; inspect via browser DevTools <head> or document.querySelector in console
drill_down_paths:
  - .gsd/milestones/M002/slices/S03/tasks/T01-SUMMARY.md
  - .gsd/milestones/M002/slices/S03/tasks/T02-SUMMARY.md
duration: 2 tasks across 1 session
verification_result: passed
completed_at: 2026-03-11
---

# S03: SEO Structured Data

**Public recipe detail pages render valid schema.org/Recipe JSON-LD structured data and OG/Twitter Card meta tags from real recipe data, verified in browser.**

## What Happened

Built a pure-function SEO generation layer in `src/lib/seo/` (T01), then wired it into the public recipe detail page via `expo-router/head` (T02).

**T01** created three utility modules: `duration.ts` (ISO 8601 duration conversion), `json-ld.ts` (schema.org/Recipe JSON-LD generation), and `meta-tags.ts` (OG + Twitter Card meta tag generation). All are pure functions with no React dependencies. Test suite written first (test-first), then implementations built to pass — 62 tests covering full-recipe, minimal-recipe (title-only), and edge cases (null fields, partial ratings, missing author). JSON-LD output is guaranteed free of `undefined` values via JSON roundtrip safety net.

**T02** integrated the generation functions into `app/(public)/recipe/[id].tsx`. A `renderSeoHead()` function guarded by `Platform.OS === 'web'` generates JSON-LD, OG tags, and Twitter Card tags from the existing recipe/author/heroUrl state, rendering them inside an `expo-router/head` `<Head>` block. The function is called in both the web two-column and mobile/tablet single-column layout returns.

## Verification

- `npx jest src/lib/seo/__tests__/json-ld.test.ts` — 40/40 passed
- `npx jest src/lib/seo/__tests__/meta-tags.test.ts` — 22/22 passed
- `npx jest --passWithNoTests` — 415/415 passed, zero regressions
- `npx tsc --noEmit` — zero TypeScript errors
- Browser: `document.querySelector('script[type="application/ld+json"]')` contains valid JSON with `@type: "Recipe"`, correct name, author, ingredients, instructions, cookTime, recipeYield
- Browser: `document.querySelector('meta[property="og:title"]')` has correct recipe title
- Browser: `document.querySelector('meta[property="og:type"]')` → "article"
- Browser: `document.querySelector('meta[property="og:url"]')` → correct production URL
- Browser: `document.querySelector('meta[name="twitter:card"]')` → "summary_large_image"

## Requirements Advanced

- SEO-01 — Public recipe detail pages now include valid schema.org/Recipe JSON-LD structured data, generated from real recipe data. Client-side rendered; Google Rich Results Test validation deferred to S05 UAT.
- SEO-02 — Partially addressed: client-side Head injection in place. Full SSR (static rendering) remains deferred.

## Requirements Validated

- none — SEO-01 is advanced but not fully validated until Google Rich Results Test confirms indexability (S05 UAT)

## New Requirements Surfaced

- none

## Requirements Invalidated or Re-scoped

- none

## Deviations

None.

## Known Limitations

- JSON-LD is client-side rendered (no static/SSR) — Google may deprioritize it. Accepted per M002 scope; `expo-router/head` approach is forward-compatible with future static rendering.
- Google Rich Results Test validation deferred to S05 UAT (requires production URL).
- No `<meta name="description">` tag added — only OG and Twitter tags. Standard description meta could be added later.

## Follow-ups

- S05: Validate structured data with Google Rich Results Test against production URL
- Future: Enable `web.output: "static"` in app.json for true SSR of structured data (requires `generateStaticParams` with build-time Supabase query)

## Files Created/Modified

- `src/lib/seo/duration.ts` — ISO 8601 duration conversion helper
- `src/lib/seo/json-ld.ts` — schema.org/Recipe JSON-LD generator
- `src/lib/seo/meta-tags.ts` — OG + Twitter Card meta tag generator
- `src/lib/seo/__tests__/json-ld.test.ts` — 40 tests for JSON-LD generation
- `src/lib/seo/__tests__/meta-tags.test.ts` — 22 tests for meta tag generation
- `app/(public)/recipe/[id].tsx` — Added Platform, Head, SEO imports; renderSeoHead() with JSON-LD, OG, Twitter tags

## Forward Intelligence

### What the next slice should know
- SEO utilities in `src/lib/seo/` are pure functions — if S04 or S05 needs structured data for other page types, the pattern is established and easy to extend.
- The `expo-router/head` `<Head>` component works identically to `react-helmet-async` — it manages `<head>` content declaratively from any component.

### What's fragile
- Client-side JSON-LD rendering depends on `expo-router/head` working correctly in the Expo web build. If the web bundler or router changes Head behavior, the structured data could silently disappear. Verify via `document.querySelector('script[type="application/ld+json"]')` in browser console.

### Authoritative diagnostics
- `npx jest src/lib/seo/` — proves generation logic is correct (62 tests)
- Browser console: `JSON.parse(document.querySelector('script[type="application/ld+json"]').textContent)` — proves runtime rendering works
- Browser console: `document.querySelectorAll('meta[property^="og:"], meta[name^="twitter:"]')` — proves meta tags render

### What assumptions changed
- No assumptions changed — slice executed exactly as planned
