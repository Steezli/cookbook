---
estimated_steps: 4
estimated_files: 1
---

# T02: Wire Head block into public recipe detail page and verify in browser

**Slice:** S03 — SEO Structured Data
**Milestone:** M002

## Description

Integrate the SEO generation functions from T01 into the actual public recipe detail page. Add a `<Head>` block using `expo-router/head` that renders the JSON-LD `<script>` tag and all meta tags into the document `<head>` on web. Verify the rendered output in a browser by inspecting the DOM.

## Steps

1. Add imports to `app/(public)/recipe/[id].tsx`:
   - `import Head from 'expo-router/head'`
   - `import { Platform } from 'react-native'` (already imported via destructure — verify)
   - `import { generateRecipeJsonLd } from '@/lib/seo/json-ld'`
   - `import { generateRecipeMetaTags } from '@/lib/seo/meta-tags'`

2. Add the `<Head>` block inside the component, after the data has loaded (inside the render path where `recipe` is non-null), guarded by `Platform.OS === 'web'`:
   - Compute `pageUrl` using the recipe ID (e.g., `https://berven.app/recipe/${recipe.id}` or use a relative path — use the app's base URL if available, otherwise the relative path `/recipe/${recipe.id}`)
   - Call `generateRecipeJsonLd(recipe, author, heroUrl)` and `generateRecipeMetaTags(recipe, heroUrl, pageUrl)`
   - Render `<Head>`:
     - `<title>{recipe.title} | Berven</title>`
     - `<script type="application/ld+json">{JSON.stringify(jsonLd)}</script>`
     - Map each meta tag to `<meta property={tag.property} name={tag.name} content={tag.content} />`
   - Place the `<Head>` block early in both the web layout and mobile/tablet layout returns (it only affects `<head>`, not visual layout)

3. Verify TypeScript compiles cleanly:
   - `npx tsc --noEmit` or rely on IDE — ensure no type errors from the integration
   - `npx jest --passWithNoTests` — all tests still pass

4. Browser verification:
   - Start the dev server (`npx expo start --web`)
   - Navigate to a public recipe detail page
   - Open browser DevTools → Elements → inspect `<head>` for JSON-LD script and meta tags
   - Run in console: `JSON.parse(document.querySelector('script[type="application/ld+json"]').textContent)` → should return valid Recipe object
   - Run in console: `document.querySelector('meta[property="og:title"]').content` → should match recipe title

## Must-Haves

- [ ] `<Head>` block renders JSON-LD `<script type="application/ld+json">` with valid schema.org/Recipe data
- [ ] `<Head>` block renders OG meta tags (`og:title`, `og:type`, `og:url`, `og:site_name`, and conditionally `og:description`, `og:image`)
- [ ] `<Head>` block renders Twitter Card meta tags (`twitter:card`, `twitter:title`, and conditionally `twitter:description`, `twitter:image`)
- [ ] `<Head>` content guarded by `Platform.OS === 'web'`
- [ ] `<title>` tag set to `{recipe.title} | Berven`
- [ ] No TypeScript errors
- [ ] All existing tests pass

## Verification

- `npx jest --passWithNoTests` — all tests pass, zero regressions
- Browser: `document.querySelector('script[type="application/ld+json"]')` exists and contains valid JSON with `@type: "Recipe"`
- Browser: `document.querySelector('meta[property="og:title"]')` has the recipe's title as content
- Browser: `document.querySelector('meta[name="twitter:card"]')` has `summary_large_image` as content

## Observability Impact

- Signals added/changed: None — static head content, no runtime signals
- How a future agent inspects this: Browser DevTools `<head>` inspection; `document.querySelector` for specific tags; Google Rich Results Test (external tool)
- Failure state exposed: Missing tags visible in DevTools; malformed JSON-LD visible as parse error in structured data validators

## Inputs

- `src/lib/seo/json-ld.ts` — `generateRecipeJsonLd` from T01
- `src/lib/seo/meta-tags.ts` — `generateRecipeMetaTags` from T01
- `app/(public)/recipe/[id].tsx` — existing public recipe detail page with recipe/author/heroUrl state already available
- `expo-router/head` — built-in Head component (no installation needed)

## Expected Output

- `app/(public)/recipe/[id].tsx` — modified with `<Head>` block rendering JSON-LD and meta tags
- Browser-verified: public recipe pages have structured data and social meta tags in document head
