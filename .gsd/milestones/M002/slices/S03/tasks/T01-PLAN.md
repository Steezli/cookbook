---
estimated_steps: 5
estimated_files: 5
---

# T01: Create SEO utility functions and test suite

**Slice:** S03 — SEO Structured Data
**Milestone:** M002

## Description

Build the pure-function SEO generation layer: `generateRecipeJsonLd`, `generateRecipeMetaTags`, and `minutesToIsoDuration`. Write comprehensive tests first (they will initially fail), then implement the functions to make them pass. All functions are pure — no React, no side effects, no platform dependencies — making them trivially testable in the Node.js Jest environment.

## Steps

1. Create `src/lib/seo/__tests__/json-ld.test.ts` with test cases:
   - Full recipe fixture (all fields populated) → valid schema.org/Recipe JSON-LD with all mapped fields
   - Minimal recipe fixture (title only, everything else null/empty) → valid JSON-LD with only `name` and `@type`
   - `minutesToIsoDuration` converts minutes to ISO 8601 (`30` → `PT30M`, `0` → omitted, `null` → omitted)
   - `totalTime` is computed sum of prep + cook when both present
   - `aggregateRating` only present when `rating_average` and `rating_count` are non-null
   - `recipeIngredient` is array of strings from `ingredients[].text`
   - `recipeInstructions` is array of `HowToStep` objects from `steps[].text`
   - `keywords` is comma-separated string from `tags[]`
   - Output contains no `undefined` values (JSON.stringify roundtrip test)
   - `author` field uses `PublicAuthor.display_name`, falls back to "Anonymous" when null

2. Create `src/lib/seo/__tests__/meta-tags.test.ts` with test cases:
   - Full recipe → OG tags: `og:title`, `og:description`, `og:image`, `og:url`, `og:type=article`, `og:site_name=Berven`
   - Full recipe → Twitter tags: `twitter:card=summary_large_image`, `twitter:title`, `twitter:description`, `twitter:image`
   - Minimal recipe (no description, no image) → OG title present, description and image tags omitted
   - Page URL correctly set in `og:url`

3. Create `src/lib/seo/duration.ts`:
   - Export `minutesToIsoDuration(minutes: number | null | undefined): string | null` — returns `PT{N}M` or `null`

4. Create `src/lib/seo/json-ld.ts`:
   - Export `generateRecipeJsonLd(recipe: Recipe, author: PublicAuthor | null, imageUrl: string | null): Record<string, unknown>`
   - Build the JSON-LD object following the field mapping from S03-RESEARCH.md
   - Use `minutesToIsoDuration` for time fields
   - Compute `totalTime` when both prep and cook are present
   - Include `aggregateRating` only when rating data exists
   - Filter out all `undefined` values before returning
   - Use `JSON.parse(JSON.stringify(obj))` or manual filtering to strip undefined

5. Create `src/lib/seo/meta-tags.ts`:
   - Export type `MetaTag = { property?: string; name?: string; content: string }`
   - Export `generateRecipeMetaTags(recipe: Recipe, imageUrl: string | null, pageUrl: string): MetaTag[]`
   - Include OG tags: title, description (if present), image (if present), url, type, site_name
   - Include Twitter tags: card, title, description (if present), image (if present)

## Must-Haves

- [ ] `generateRecipeJsonLd` returns valid schema.org/Recipe object with `@context`, `@type`, and `name` at minimum
- [ ] All optional fields gracefully omitted when source data is null/empty
- [ ] No `undefined` values in JSON-LD output (verified by JSON.stringify roundtrip)
- [ ] `minutesToIsoDuration` handles null, undefined, 0, and positive integers correctly
- [ ] `generateRecipeMetaTags` returns correct OG and Twitter Card tags
- [ ] All tests pass: `npx jest src/lib/seo/`

## Verification

- `npx jest src/lib/seo/__tests__/json-ld.test.ts` passes all tests
- `npx jest src/lib/seo/__tests__/meta-tags.test.ts` passes all tests
- `npx jest --passWithNoTests` — zero regressions across entire suite

## Observability Impact

- Signals added/changed: None — pure functions with no runtime side effects
- How a future agent inspects this: Run the test suite; inspect test fixtures for expected schema shape
- Failure state exposed: Test failures show exact field mismatches between expected and actual JSON-LD/meta output

## Inputs

- `src/features/recipes/types.ts` — `Recipe` type definition (all fields for mapping)
- `src/features/recipes/public.ts` — `PublicAuthor` type definition
- `src/features/ads/__tests__/config.test.ts` — reference pattern for pure-function testing
- `.gsd/milestones/M002/slices/S03/S03-RESEARCH.md` — field mapping tables and constraints

## Expected Output

- `src/lib/seo/duration.ts` — ISO 8601 duration helper
- `src/lib/seo/json-ld.ts` — schema.org/Recipe JSON-LD generator
- `src/lib/seo/meta-tags.ts` — OG + Twitter Card meta tag generator
- `src/lib/seo/__tests__/json-ld.test.ts` — comprehensive JSON-LD generation tests
- `src/lib/seo/__tests__/meta-tags.test.ts` — comprehensive meta tag generation tests
