# S03: SEO Structured Data

**Goal:** Public recipe detail pages include valid schema.org/Recipe JSON-LD structured data, Open Graph meta tags, and Twitter Card meta tags — all generated from real recipe data and rendered via `expo-router/head`.
**Demo:** Open a public recipe page in the browser → view source → valid JSON-LD script tag with schema.org/Recipe markup is present; OG and Twitter meta tags are present with correct recipe title, description, and image URL.

## Must-Haves

- Pure function `generateRecipeJsonLd(recipe, author, imageUrl)` produces a valid schema.org/Recipe JSON-LD object
- Pure function `generateRecipeMetaTags(recipe, imageUrl, pageUrl)` produces OG and Twitter Card meta tag props
- ISO 8601 duration helper converts minutes to `PT{N}M` format
- `<Head>` block in `app/(public)/recipe/[id].tsx` renders JSON-LD `<script>` and meta tags on web
- Graceful handling of missing optional fields (no description, no photo, no times, no ratings)
- JSON-LD output contains no `undefined` values (valid JSON)
- Platform-guarded: `<Head>` content only renders on `Platform.OS === 'web'`
- All generation logic unit-tested with full-recipe and minimal-recipe fixtures

## Proof Level

- This slice proves: contract + integration
- Real runtime required: yes (browser verification of rendered `<Head>` content)
- Human/UAT required: yes (Google Rich Results Test validation deferred to S05 UAT, but browser inspection of rendered markup is verified here)

## Verification

- `npx jest src/lib/seo/__tests__/json-ld.test.ts` — all JSON-LD generation tests pass
- `npx jest src/lib/seo/__tests__/meta-tags.test.ts` — all OG/Twitter meta tag generation tests pass
- `npx jest --passWithNoTests` — zero regressions, all existing tests still pass
- Browser: navigate to public recipe detail → `document.querySelector('script[type="application/ld+json"]')` returns valid JSON with `@type: "Recipe"`
- Browser: `document.querySelector('meta[property="og:title"]')` has correct recipe title

## Observability / Diagnostics

- Runtime signals: None needed — SEO tags are static output derived from recipe data, no async flows or state machines
- Inspection surfaces: Browser DevTools → Elements → `<head>` section shows JSON-LD script and meta tags; `document.querySelector` commands in console for programmatic checking
- Failure visibility: Missing or malformed JSON-LD is immediately visible via browser inspection or Google Rich Results Test; invalid JSON in the script tag would show as a parse error in structured data validators
- Redaction constraints: None — all recipe data in structured data is already public

## Integration Closure

- Upstream surfaces consumed: `Recipe` type from `src/features/recipes/types.ts`, `PublicAuthor` type from `src/features/recipes/public.ts`, `getPhotoUrl()` from `src/features/recipes/photos.ts`, recipe data already fetched in `app/(public)/recipe/[id].tsx`
- New wiring introduced in this slice: `<Head>` block in public recipe detail page importing from `src/lib/seo/` utilities and rendering structured data + meta tags using `expo-router/head`
- What remains before the milestone is truly usable end-to-end: S04 (Production Ads + GDPR), S05 (UX Polish + UAT including Google Rich Results Test validation)

## Tasks

- [x] **T01: Create SEO utility functions and test suite** `est:45m`
  - Why: Core generation logic must exist and be proven correct before wiring into the UI. Tests run first (failing), then implementation makes them pass.
  - Files: `src/lib/seo/__tests__/json-ld.test.ts`, `src/lib/seo/__tests__/meta-tags.test.ts`, `src/lib/seo/json-ld.ts`, `src/lib/seo/meta-tags.ts`, `src/lib/seo/duration.ts`
  - Do: Create test files with assertions for full-recipe and minimal-recipe (title-only) fixtures covering JSON-LD structure, OG tags, Twitter tags, duration conversion, and null/undefined field handling. Then implement `generateRecipeJsonLd`, `generateRecipeMetaTags`, and `minutesToIsoDuration` as pure functions. Ensure JSON-LD output has no `undefined` values. Follow the ads config test pattern (mock-free pure function tests).
  - Verify: `npx jest src/lib/seo/` — all tests pass
  - Done when: All JSON-LD and meta tag generation tests pass; `generateRecipeJsonLd` returns valid schema.org/Recipe for both full and minimal recipes; `generateRecipeMetaTags` returns correct OG and Twitter props

- [x] **T02: Wire Head block into public recipe detail page and verify in browser** `est:30m`
  - Why: The generation functions need to be integrated into the actual page so that real recipe data produces real `<head>` content visible to search crawlers.
  - Files: `app/(public)/recipe/[id].tsx`
  - Do: Import `Head` from `expo-router/head`, import generation functions from `src/lib/seo/`. Add a `<Head>` block (guarded by `Platform.OS === 'web'`) that renders: (1) `<title>` with recipe title, (2) `<script type="application/ld+json">` with JSON.stringify of `generateRecipeJsonLd()` output, (3) `<meta>` tags from `generateRecipeMetaTags()` output. Pass existing `recipe`, `author`, `heroUrl` state into the generation functions. Compute `pageUrl` from the current route. Keep the Head block near the top of the component return, inside the existing layout structure.
  - Verify: Start dev server → open public recipe page in browser → `document.querySelector('script[type="application/ld+json"]')` contains valid Recipe JSON-LD → `document.querySelector('meta[property="og:title"]')` has correct title → full test suite still passes
  - Done when: Public recipe detail page renders JSON-LD and OG/Twitter meta tags in the document head on web; all tests pass; no TypeScript errors

## Files Likely Touched

- `src/lib/seo/json-ld.ts` (new)
- `src/lib/seo/meta-tags.ts` (new)
- `src/lib/seo/duration.ts` (new)
- `src/lib/seo/__tests__/json-ld.test.ts` (new)
- `src/lib/seo/__tests__/meta-tags.test.ts` (new)
- `app/(public)/recipe/[id].tsx` (modified)
