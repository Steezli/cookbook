# S03: SEO Structured Data — UAT

**Milestone:** M002
**Written:** 2026-03-11

## UAT Type

- UAT mode: mixed (artifact-driven + live-runtime)
- Why this mode is sufficient: SEO generation logic is fully covered by 62 unit tests (artifact-driven). Browser verification of rendered `<head>` content confirms runtime integration. Google Rich Results Test (external validator) deferred to S05 UAT since it requires a publicly accessible URL.

## Preconditions

- Dev server running: `npx expo start --web`
- At least one public recipe exists in the database with populated fields (title, description, ingredients, steps, photo, times, servings)
- Browser DevTools available for `<head>` inspection

## Smoke Test

Navigate to a public recipe detail page in the browser → open DevTools → Elements tab → `<head>` section contains a `<script type="application/ld+json">` with `"@type": "Recipe"` and `<meta property="og:title">` with the recipe title.

## Test Cases

### 1. JSON-LD contains valid schema.org/Recipe markup

1. Open a public recipe detail page in the browser (e.g., `/recipe/{id}`)
2. Open browser console
3. Run: `JSON.parse(document.querySelector('script[type="application/ld+json"]').textContent)`
4. **Expected:** Object with `@context: "https://schema.org"`, `@type: "Recipe"`, `name` matching the recipe title, `author.name` matching the author display name, `recipeIngredient` as an array, `recipeInstructions` as an array of `HowToStep` objects

### 2. OG meta tags present with correct values

1. Open a public recipe detail page
2. Run: `document.querySelector('meta[property="og:title"]').content`
3. Run: `document.querySelector('meta[property="og:type"]').content`
4. Run: `document.querySelector('meta[property="og:url"]').content`
5. Run: `document.querySelector('meta[property="og:site_name"]').content`
6. **Expected:** og:title = recipe title, og:type = "article", og:url = `https://berven.app/recipe/{id}`, og:site_name = "Berven"

### 3. Twitter Card meta tags present

1. Open a public recipe detail page
2. Run: `document.querySelector('meta[name="twitter:card"]').content`
3. Run: `document.querySelector('meta[name="twitter:title"]').content`
4. **Expected:** twitter:card = "summary_large_image", twitter:title = recipe title

### 4. Page title includes recipe name

1. Open a public recipe detail page
2. Check the browser tab title
3. **Expected:** Title is "{Recipe Title} | Berven"

### 5. JSON-LD includes optional fields when present

1. Open a public recipe with photo, prep time, cook time, and servings
2. Parse the JSON-LD script content
3. **Expected:** `image`, `prepTime` (PT format), `cookTime` (PT format), `totalTime` (PT format), `recipeYield` all present

## Edge Cases

### Minimal recipe (title only, no optional fields)

1. Open a public recipe that has only a title (no description, photo, times, ratings)
2. Parse the JSON-LD script content
3. **Expected:** JSON-LD has `name` and `author` but no `image`, `prepTime`, `cookTime`, `totalTime`, `recipeYield`, or `aggregateRating` keys. No `undefined` string values anywhere.

### Recipe with no author display name

1. Open a public recipe whose author has no display_name set
2. Parse the JSON-LD script content
3. **Expected:** `author.name` is "Anonymous"

### Non-web platform

1. Access the same recipe route on native (iOS/Android)
2. **Expected:** No crash; the Head block does not render (Platform.OS guard). Recipe content displays normally.

## Failure Signals

- `document.querySelector('script[type="application/ld+json"]')` returns null — Head block not rendering
- JSON-LD contains `"undefined"` as a string value — field filtering failed
- `og:title` content doesn't match the recipe title — wrong data passed to generator
- Browser console shows errors related to Head or helmet — expo-router/head misconfigured
- Page crashes on native — Platform guard not working

## Requirements Proved By This UAT

- SEO-01 (partial) — Public recipe detail pages include valid schema.org/Recipe JSON-LD visible in browser. Full proof requires Google Rich Results Test with production URL (deferred to S05).

## Not Proven By This UAT

- SEO-01 (full) — Google Rich Results Test validation against a crawlable production URL. Deferred to S05 UAT.
- SEO-02 — Server-rendered/static public recipe pages. Client-side rendering only in this slice.
- Crawlability — whether Googlebot actually indexes the client-rendered structured data. Requires production deployment + Search Console monitoring.

## Notes for Tester

- The JSON-LD is client-side rendered via `expo-router/head` (wraps react-helmet-async). This means the structured data is injected into the DOM by JavaScript, not present in the initial HTML response. Google can index JS-rendered content but may deprioritize it.
- To test with Google Rich Results Test, the page must be accessible at a public URL. Use the production deployment URL, not localhost.
- The `og:image` and `twitter:image` tags only appear when the recipe has a photo. If testing with a recipe that has no photo, these tags will be absent (correct behavior).
