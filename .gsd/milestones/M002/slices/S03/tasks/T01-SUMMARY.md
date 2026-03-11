---
id: T01
parent: S03
milestone: M002
provides:
  - generateRecipeJsonLd pure function for schema.org/Recipe JSON-LD
  - generateRecipeMetaTags pure function for OG + Twitter Card meta tags
  - minutesToIsoDuration ISO 8601 duration helper
  - comprehensive test suite (62 tests) covering full/minimal/edge cases
key_files:
  - src/lib/seo/json-ld.ts
  - src/lib/seo/meta-tags.ts
  - src/lib/seo/duration.ts
  - src/lib/seo/__tests__/json-ld.test.ts
  - src/lib/seo/__tests__/meta-tags.test.ts
key_decisions:
  - Author fallback is "Anonymous" when PublicAuthor is null or display_name is null
  - totalTime only computed when both prep and cook are present (not when only one exists)
  - aggregateRating requires both rating_average and rating_count to be non-null
  - JSON roundtrip (JSON.parse(JSON.stringify())) used as safety net to strip any undefined values
  - OG tags use property key, Twitter tags use name key (per spec)
patterns_established:
  - Pure SEO utility functions in src/lib/seo/ — no React, no side effects, trivially testable
  - Conditional field inclusion pattern: only add properties to JSON-LD object when source data is non-null/non-empty
  - MetaTag type with optional property/name + required content for flexible OG/Twitter rendering
observability_surfaces:
  - none — pure functions with no runtime side effects; inspect via test suite
duration: 12m
verification_result: passed
completed_at: 2026-03-11
blocker_discovered: false
---

# T01: Create SEO utility functions and test suite

**Built pure-function SEO generation layer: JSON-LD, meta tags, and ISO duration helper with 62 passing tests.**

## What Happened

Created three utility modules in `src/lib/seo/`:

1. **`duration.ts`** — `minutesToIsoDuration()` converts minutes to ISO 8601 format (`PT30M`). Returns null for null, undefined, or zero.

2. **`json-ld.ts`** — `generateRecipeJsonLd()` maps a `Recipe` + `PublicAuthor` + image URL to a complete schema.org/Recipe JSON-LD object. All optional fields are conditionally included only when source data is present. Uses JSON roundtrip as safety net against undefined values.

3. **`meta-tags.ts`** — `generateRecipeMetaTags()` produces an array of `MetaTag` descriptors for OG (title, description, image, url, type, site_name) and Twitter Card (card, title, description, image) tags. Optional tags omitted when data is null.

Tests were written first (test-first approach), then implementations were built to satisfy them. All 62 tests pass on first run.

## Verification

- `npx jest src/lib/seo/__tests__/json-ld.test.ts` — 40/40 passed
- `npx jest src/lib/seo/__tests__/meta-tags.test.ts` — 22/22 passed
- `npx jest --passWithNoTests` — 415/415 passed, zero regressions

### Slice-level verification (partial — T01 is intermediate):
- ✅ JSON-LD generation tests pass
- ✅ Meta tag generation tests pass
- ✅ Full suite regression check passes
- ⏳ Browser: JSON-LD script tag rendering — deferred to T02
- ⏳ Browser: OG meta tag rendering — deferred to T02

## Diagnostics

No runtime observability — these are pure functions. Inspect correctness by running `npx jest src/lib/seo/`. Test fixtures in the test files document the expected schema shape for both full and minimal recipes.

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `src/lib/seo/duration.ts` — ISO 8601 duration conversion helper
- `src/lib/seo/json-ld.ts` — schema.org/Recipe JSON-LD generator
- `src/lib/seo/meta-tags.ts` — OG + Twitter Card meta tag generator
- `src/lib/seo/__tests__/json-ld.test.ts` — 40 tests covering full/minimal/edge cases for JSON-LD
- `src/lib/seo/__tests__/meta-tags.test.ts` — 22 tests covering full/minimal cases for meta tags
