# S03: SEO Structured Data — Research

**Date:** 2026-03-11

## Summary

S03 adds schema.org/Recipe JSON-LD structured data, Open Graph meta tags, and Twitter Card meta tags to public recipe detail pages (`app/(public)/recipe/[id].tsx`). The Expo Router already ships a `Head` component (`expo-router/head`) that wraps `react-helmet-async` on web and is a no-op on Android. The `HelmetProvider` is auto-wired in Expo Router's `qualified-entry.js`, so no root layout changes are needed.

The main constraint is that the app currently runs in SPA mode (`web.bundler: "metro"` with no `web.output` set). Google can index client-rendered JSON-LD, but it's not ideal. The M002 Context doc explicitly defers SSR/static rendering to later: "start with client-side and verify with Search Console." For this slice, client-side `<Head>` injection is the correct approach. If static rendering is later enabled (`web.output: "static"`), the `Head` content will automatically be embedded in static HTML with no code changes.

All required recipe data fields (title, description, ingredients, steps, prep_time, cook_time, servings, rating, photos) are already available in the `Recipe` type and fetched in the existing `PublicRecipeDetail` component. The only new code needed is: (1) a pure function to generate the JSON-LD object from a Recipe, (2) a pure function to generate OG/Twitter meta tag props, and (3) a `<Head>` block in the public recipe detail component. All generation logic is pure and easily unit-testable without React.

## Recommendation

Build two pure utility modules — `RecipeJsonLd` (generates schema.org/Recipe JSON-LD object) and `RecipeMetaTags` (generates OG + Twitter Card meta props) — plus wire them into `app/(public)/recipe/[id].tsx` using `import Head from 'expo-router/head'`. Keep generation logic in `src/lib/seo/` as pure functions for Jest testing. Render the `<Head>` block conditionally on `Platform.OS === 'web'` to skip unnecessary work on native.

Do **not** enable `web.output: "static"` in this slice — it requires `generateStaticParams` for the dynamic `[id]` route, which would need a build-time Supabase query to enumerate all public recipe IDs. That's a larger change scoped to a future slice.

## Don't Hand-Roll

| Problem | Existing Solution | Why Use It |
|---------|------------------|------------|
| Inject `<head>` elements on web | `expo-router/head` (built-in) | Already bundled, auto-wired with HelmetProvider, no-op on native, supports `<script>`, `<meta>`, `<title>`, `<link>` |
| ISO 8601 duration format | Simple helper function | schema.org requires `PT30M` format for cook/prep times; a 3-line function converts minutes to ISO duration — no library needed |
| JSON-LD validation | Google Rich Results Test | External tool for manual verification; no runtime dependency needed |

## Existing Code and Patterns

- `app/(public)/recipe/[id].tsx` — Public recipe detail screen. Already fetches recipe, author, and hero photo. This is where `<Head>` will be added. Currently ~400 lines with well-structured render functions.
- `src/features/recipes/types.ts` — `Recipe` type with all fields needed for JSON-LD: `title`, `description`, `ingredients[].text`, `steps[].text`, `prep_time_minutes`, `cook_time_minutes`, `servings`, `rating_average`, `rating_count`, `tags`, `created_at`, `updated_at`.
- `src/features/recipes/public.ts` — `PublicAuthor` type with `display_name` and `initials`. Used for author attribution in JSON-LD.
- `src/features/recipes/photos.ts` — `getPhotoUrl()` generates Supabase public URLs for recipe photos. Needed for `image` field in JSON-LD and OG tags.
- `node_modules/expo-router/build/head/ExpoHead.js` — Web implementation wraps `react-helmet-async`'s `Helmet`. Supports `<script type="application/ld+json">`, `<meta>`, `<title>`.
- `node_modules/expo-router/build/head/ExpoHead.android.js` — Android: no-op (renders `null`).
- `node_modules/expo-router/build/head/ExpoHead.ios.js` — iOS: maps `<meta property="og:*">` and `<title>` to NSUserActivity for Handoff/Spotlight. Bonus: our OG tags will also enable iOS universal link previews.
- `node_modules/expo-router/build/qualified-entry.js` — Auto-wraps entire app with `Head.Provider` (HelmetProvider). No manual setup needed.
- `src/features/ads/__tests__/config.test.ts` — Example of pure-function testing pattern with mocked `react-native` Platform. Follow this pattern for JSON-LD generation tests.
- `jest.config.js` — Test environment is `node`, uses `ts-jest` with `jsx: 'react-jsx'`. Module alias `@/` mapped to `src/`. Pure function tests will work here without any config changes.

## Constraints

- **SPA mode (no static rendering):** `app.json` has `web.bundler: "metro"` but no `web.output`. JSON-LD is client-rendered. Google can index it but prefers server-rendered markup. Acceptable per M002 Context: "start with client-side and verify with Search Console."
- **No `+html.tsx` exists:** Global `<head>` elements would need to be added per-page via `Head` component, not globally. This is fine for recipe-specific structured data.
- **Platform branching:** `Head` from `expo-router/head` is no-op on Android and activity-based on iOS. Wrapping `<Head>` content in a `Platform.OS === 'web'` check avoids unnecessary processing on native, though it's not strictly required since the components are already branched internally.
- **react-helmet-async script support:** The bundled `react-helmet-async` supports `<script type="application/ld+json">` — confirmed by inspecting the vendor source. The `innerHTML` prop or JSX children approach both work.
- **No `category` or `cuisine` fields in Recipe type:** schema.org/Recipe recommends `recipeCategory` and `recipeCuisine` but they are optional. We'll omit them. `keywords` can map from `tags[]`.
- **Photo URLs are Supabase storage public URLs:** These are valid absolute URLs suitable for `image` in JSON-LD and `og:image`. Already used in the detail page via `getPhotoUrl()`.

## Common Pitfalls

- **Invalid ISO 8601 duration format** — schema.org requires `PT30M` not `30 minutes`. Use a helper: `(minutes: number) => \`PT${minutes}M\``. Handle null/zero gracefully by omitting the field.
- **Missing required JSON-LD fields** — Google requires `name` at minimum for Recipe. `image` and `author` are strongly recommended for rich results eligibility. Our data always has `title`; `image` and `author` should be included when available, omitted when null.
- **JSON-LD in `<script>` must be valid JSON** — Use `JSON.stringify()` with no custom replacer. Ensure no `undefined` values leak (they cause invalid JSON). Filter out null/undefined fields before stringifying.
- **OG image dimensions not specified** — `og:image:width` and `og:image:height` improve preview rendering in social shares. We don't have image dimensions stored; omit these optional fields.
- **Helmet children must be valid head elements** — `react-helmet-async` only processes `<title>`, `<meta>`, `<link>`, `<script>`, `<style>`, `<base>`, `<noscript>`. Don't put `<div>` or custom components inside `<Head>`.
- **Stale head tags across navigation** — Helmet manages document head declaratively per focused route. When navigating away from a recipe, the tags are automatically cleaned up because `Head` only renders when the route is focused (`useIsFocused()`).

## Open Risks

- **Google indexability of client-rendered JSON-LD** — Google's JS renderer can process client-side structured data, but there's no guarantee of timely or complete indexing. This is an accepted risk per M002 Context. Mitigation: verify with Google Rich Results Test after implementation; plan static rendering in a future slice.
- **Supabase photo URLs may be slow for Google's crawler** — If Supabase storage CDN is slow, Google may time out fetching the `og:image`. Low risk; Supabase uses a global CDN.
- **Recipe data completeness varies** — Some recipes may have null description, no photos, no prep/cook times. JSON-LD and OG tags must gracefully handle missing data without rendering invalid markup. Test with minimal recipe (title only) and full recipe.

## Field Mapping: Recipe → schema.org/Recipe

| Recipe field | schema.org property | Notes |
|---|---|---|
| `title` | `name` | Required |
| `description` | `description` | Optional |
| `ingredients[].text` | `recipeIngredient[]` | Array of strings |
| `steps[].text` | `recipeInstructions[].text` | Array of `HowToStep` objects |
| `prep_time_minutes` | `prepTime` | ISO 8601 duration (`PT30M`) |
| `cook_time_minutes` | `cookTime` | ISO 8601 duration |
| `prep + cook` | `totalTime` | Computed sum |
| `servings` | `recipeYield` | String like `"4 servings"` |
| `rating_average` | `aggregateRating.ratingValue` | Only if rating exists |
| `rating_count` | `aggregateRating.ratingCount` | Only if rating exists |
| `tags[]` | `keywords` | Comma-separated string |
| `created_at` | `datePublished` | ISO 8601 date |
| `updated_at` | `dateModified` | ISO 8601 date |
| hero photo URL | `image` | First recipe photo public URL |
| author display_name | `author.name` | From `PublicAuthor` |

## Field Mapping: Recipe → Open Graph / Twitter Card

| Recipe field | OG property | Twitter property |
|---|---|---|
| `title` | `og:title` | `twitter:title` |
| `description` | `og:description` | `twitter:description` |
| hero photo URL | `og:image` | `twitter:image` |
| page URL | `og:url` | — |
| — | `og:type` = `article` | `twitter:card` = `summary_large_image` |
| — | `og:site_name` = `Berven` | — |

## Skills Discovered

| Technology | Skill | Status |
|------------|-------|--------|
| SEO / Structured Data | `huifer/claude-code-seo@structured-data` (20 installs) | available — focused on structured data generation |
| SEO / Structured Data | `autom8minds/seo-skills@seo-schema-structured-data` (9 installs) | available — schema-specific |
| Expo / React Native | `jezweb/claude-skills@react-native-expo` (744 installs) | available — general Expo patterns |
| Expo / React Native | `mindrally/skills@expo-react-native-typescript` (249 installs) | available — TypeScript-focused |

None of these are needed for this slice — the work is straightforward pure function generation + a single `<Head>` integration. The SEO skills may be useful for more complex SEO work in future milestones.

## Sources

- Expo Router wraps `react-helmet-async` in `expo-router/head` — confirmed by reading `node_modules/expo-router/build/head/ExpoHead.js`
- `HelmetProvider` auto-wired in `qualified-entry.js` — no manual setup needed (source: `node_modules/expo-router/build/qualified-entry.js`)
- `<script type="application/ld+json">` supported by bundled react-helmet-async — confirmed by `innerHTML` in `scriptTags` extraction (source: `node_modules/expo-router/vendor/react-helmet-async/lib/index.js`)
- Static rendering docs confirm `Head` works in both SPA and static modes (source: [Expo Router Static Rendering docs](https://docs.expo.dev/router/web/static-rendering))
- Android Head is no-op; iOS Head maps OG tags to NSUserActivity (source: `ExpoHead.android.js`, `ExpoHead.ios.js`)
- Google Rich Results Test is the recommended validation tool for schema.org/Recipe (source: [Google Search Central](https://developers.google.com/search/docs/appearance/structured-data/recipe))
- M002 Context accepts client-side JSON-LD as starting point: "start with client-side and verify with Search Console" (source: `.gsd/milestones/M002/M002-CONTEXT.md`)
