---
id: T02
parent: S03
milestone: M002
provides:
  - Public recipe detail page renders JSON-LD structured data and OG/Twitter meta tags via expo-router/head
key_files:
  - app/(public)/recipe/[id].tsx
key_decisions:
  - Extracted renderSeoHead() as a shared sub-render function called in both web and mobile/tablet layout paths — keeps the Head block DRY while the Platform.OS guard ensures it only renders on web
  - Used https://berven.app/recipe/{id} as the canonical pageUrl for OG/meta tags (production domain)
patterns_established:
  - Platform-guarded Head rendering pattern — renderSeoHead() returns null on non-web, keeps SEO logic co-located with the page component rather than in a layout wrapper
observability_surfaces:
  - none — static head content; inspect via browser DevTools <head> or document.querySelector in console
duration: 1 session
verification_result: passed
completed_at: 2026-03-11
blocker_discovered: false
---

# T02: Wire Head block into public recipe detail page and verify in browser

**Integrated JSON-LD structured data and OG/Twitter meta tags into the public recipe detail page via expo-router/head, verified all tags render correctly in browser.**

## What Happened

Added imports for `Platform`, `Head` (expo-router/head), `generateRecipeJsonLd`, and `generateRecipeMetaTags` to the public recipe detail page. Created a `renderSeoHead()` function guarded by `Platform.OS === 'web'` that computes the page URL, generates JSON-LD and meta tags from the real recipe/author/heroUrl state, and renders them inside a `<Head>` block with a `<title>`, `<script type="application/ld+json">`, and mapped `<meta>` elements. The function is called in both the web (two-column) and mobile/tablet (single-column) layout returns.

## Verification

- **TypeScript**: `npx tsc --noEmit` — zero errors
- **Tests**: `npx jest --passWithNoTests` — 415 passed, 0 failures, 20 suites
- **Browser** (localhost:8081, recipe detail for "Grandma's Chocolate Chip Cookies"):
  - `document.title` → `"Grandma's Chocolate Chip Cookies | Berven"` ✅
  - `document.querySelector('script[type="application/ld+json"]')` → exists, parses to valid JSON with `@type: "Recipe"`, `name`, `author`, `recipeIngredient`, `recipeInstructions`, `recipeYield`, `cookTime` ✅
  - `document.querySelector('meta[property="og:title"]').content` → `"Grandma's Chocolate Chip Cookies"` ✅
  - `document.querySelector('meta[property="og:type"]').content` → `"article"` ✅
  - `document.querySelector('meta[property="og:url"]').content` → `"https://berven.app/recipe/b06d521a-..."` ✅
  - `document.querySelector('meta[property="og:site_name"]').content` → `"Berven"` ✅
  - `document.querySelector('meta[name="twitter:card"]').content` → `"summary_large_image"` ✅
  - `document.querySelector('meta[name="twitter:title"]').content` → `"Grandma's Chocolate Chip Cookies"` ✅

### Slice-level verification status

- ✅ `npx jest src/lib/seo/__tests__/json-ld.test.ts` — all pass (T01)
- ✅ `npx jest src/lib/seo/__tests__/meta-tags.test.ts` — all pass (T01)
- ✅ `npx jest --passWithNoTests` — 415 passed, zero regressions
- ✅ Browser: JSON-LD `@type: "Recipe"` present in `<head>`
- ✅ Browser: `og:title` has correct recipe title

All slice verification checks pass. This is the final task of S03.

## Diagnostics

No runtime observability — these are static `<head>` tags. Inspect via:
- Browser DevTools → Elements → `<head>` section
- Console: `JSON.parse(document.querySelector('script[type="application/ld+json"]').textContent)`
- Console: `document.querySelectorAll('meta[property^="og:"], meta[name^="twitter:"]')`
- External: Google Rich Results Test with the production URL

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `app/(public)/recipe/[id].tsx` — Added Platform, Head, SEO imports; added renderSeoHead() function with JSON-LD script tag, OG meta tags, Twitter Card meta tags, and title; called in both web and mobile/tablet layout returns
