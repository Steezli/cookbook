# Decisions

## Tooling

### Pencil design tool access
- **Decision:** Use mac-tools (accessibility API + screenshots) to inspect Pencil designs during development. Pencil MCP server is available at `/Applications/Pencil.app/Contents/Resources/app.asar.unpacked/out/mcp-server-darwin-arm64 --app desktop` for future MCP-enabled sessions.
- **Why:** Pencil contains all cookbook.pen designs (screens × breakpoints + components); designs should be referenced during UI work rather than guessing

## S07–S12: Design, Navigation, Screens, Public Browsing, Audit, Remaining Screens

- Flat-with-category-prefix naming for tokens (no nesting) — ergonomic for StyleSheet.create usage
- getBreakpoint() extracted as pure function from useBreakpoint hook — enables Jest node-environment testing without React renderer
- react-native mocked via jest.mock() in test file — avoids jest.config.js changes and transformIgnorePatterns complexity
- Used useFonts from expo-font directly rather than per-package hooks — single call loads fonts from both packages
- SplashScreen.preventAutoHideAsync() at module level per official Expo docs pattern — prevents FOUT on cold start
- tsx test config: ts-jest transform with jsx:react override (not react-native) for node test environment compatibility
- react-native mock: __mocks__/react-native.js with moduleNameMapper rather than per-test jest.mock() — applies globally to all nav component tests
- getContainerStyle pure function exported from PageContainer for direct unit testing without React renderer
- Hidden TabList pattern: height:0/overflow:hidden/position:absolute registers routes without exposing UI
- router.navigate() is required for reliable cross-navigator routing on web; router.push() silently fails for routes outside the current navigator
- SECURITY DEFINER RPCs bypass profiles RLS for anon author display_name access
- pageSize+1 fetch pattern detects hasMore without separate count query
- Platform-branched AdSlot with identical placeholders: structural split now avoids Phase 13 refactor when AdMob SDK is added
- Root auth-aware router at app/index.tsx checks session and redirects to (tabs) or (public)
- Social auth helper as single module with per-provider functions and shared redirect URI
- getSession() in scan-service: reads locally cached session and auto-refreshes expired access tokens
- Single sign-out navigation path: reactive Redirect in (tabs)/_layout.tsx is the sole navigation path on sign-out
- Unit preference loaded in useFocusEffect (not standalone useEffect) so profile changes propagate immediately without restart

## S13: Advertising

### Dynamic imports for optional native SDKs
- **Decision:** Use dynamic `import()` with try/catch fallback for native-only packages (AdMob, ATT) instead of static imports
- **Why:** Prevents web bundles from including native modules; allows graceful degradation in Expo Go and dev builds; avoids requiring packages to be installed for TypeScript compilation
- **Trade-off:** Slightly more complex loading pattern, but eliminates platform-specific build failures

### Runtime platform branching over file extensions
- **Decision:** Use `Platform.OS` runtime checks in a single component file instead of `.native.tsx`/`.web.tsx` file pairs
- **Why:** Enables all platform logic to be tested in a single Node.js test environment without React Native testing infrastructure; reduces file count; keeps platform differences visible in one place
- **Trade-off:** Slightly larger component files, but dramatically simpler test setup

### Route-pattern allowlist for ad placement
- **Decision:** Ads require explicit public route pattern match (`/public`, `/browse`, `/discover`); all other routes default to no-ads
- **Why:** Fail-safe approach — new routes don't accidentally show ads; explicit private route deny-list provides defense-in-depth
- **Trade-off:** Must update pattern lists when new public routes are added, but prevents accidental ad exposure on private screens

### Type declarations for uninstalled native modules
- **Decision:** Ship `.d.ts` type declarations for `expo-tracking-transparency` and `react-native-google-mobile-ads` rather than installing the packages
- **Why:** These packages require native build tooling (EAS Build) that isn't needed during development; type declarations enable TypeScript compilation and IDE support without native dependencies
- **Trade-off:** Types could drift from actual module API; mitigated by the packages' stable public APIs

## S01: Multi-Recipe Scan

### Single-pass multi-recipe detection over two-pass
- **Decision:** Use a single Claude API call with a prompt that always requests `{ "recipes": [...] }` array format, rather than a separate detection pass followed by extraction
- **Why:** An extra Claude call doubles cost and latency. Claude vision can detect recipe boundaries and structure output in one pass. If detection proves unreliable, a two-pass approach can be added later.
- **Trade-off:** Less control over detection accuracy; mitigated by prompt guidance ("separate recipes have their own title, ingredient list, and instructions") and 5-recipe cap

### Inlined pure functions in edge function (Deno isolation)
- **Decision:** Multi-recipe parser and prompt builder are authored in `src/lib/scan/multi-recipe-parser.ts` for testing, then inlined/copied into the Deno edge function since it can't import from `src/`
- **Why:** Edge functions run on Deno with no access to the app's `src/` tree. Keeping a testable source-of-truth in `src/` while inlining into the edge function gives us Jest testability without fighting Deno's module system.
- **Trade-off:** Two copies of the logic that could drift; mitigated by parser tests that validate the canonical behavior

## S02: Multi-Draft UX

### Optional `draft` prop pattern for dual-loading components
- **Decision:** DraftReview and DraftEditor accept an optional `draft: ScanDraft` prop. When provided, skip internal fetch/subscribe. When absent, existing jobId-based loading path runs as before.
- **Why:** Avoids a breaking refactor of the route param naming (`draftId` → `jobId`). Multi-draft parent passes the object; single-draft route passes `draftId` as before. Both paths tested.
- **Trade-off:** Two loading paths in each component add complexity; mitigated by clear branching on `draft` prop presence.

### Inline draft selection over sub-routes
- **Decision:** Multi-draft selection uses inline component state within the existing `/scan/draft/[id]` route, not new Expo Router sub-routes (e.g., `[id]/[draftIndex]`)
- **Why:** Keeps route structure simple, avoids Expo Router nesting complexity, keeps multi-draft context visible while reviewing individual drafts. Research recommendation.
- **Trade-off:** No deep-linking to a specific draft within a multi-draft job; acceptable since draft review is a transient workflow.

### Single-draft fast path
- **Decision:** When `getDraftsByJobId()` returns exactly 1 draft, render `DraftReview` directly — no list UI
- **Why:** Single-draft is the common case. Showing a "list of 1" adds an unnecessary intermediate step that degrades UX.
- **Trade-off:** Route screen has a branching path; but both paths are simple and clearly separated.

### Array-always response schema
- **Decision:** Claude prompt always requests `{ "recipes": [...] }` even for single-recipe images — the array has length 1 in that case
- **Why:** Uniform response shape eliminates branching in the parser. Backward compat with legacy single-object format is handled as a fallback in `parseMultiScanResult` for robustness.
- **Trade-off:** Slightly more verbose prompt; negligible cost

### Sequential batch save (not parallel)
- **Decision:** "Save All as Recipes" iterates through unsaved drafts sequentially (not Promise.all), updating progress after each
- **Why:** Avoids overwhelming the API with concurrent requests; provides meaningful per-draft progress feedback to the user; partial failures continue with remaining drafts and report failure count
- **Trade-off:** Slower than parallel for large draft sets; acceptable since typical multi-draft jobs have 2-5 drafts

### DraftEditor `onConverted` callback for multi-draft coordination
- **Decision:** Added optional `onConverted` prop to DraftEditor. When provided by the multi-draft parent, it overrides the default `router.replace('/recipes/${recipeId}')` navigation after converting a draft to a recipe.
- **Why:** In multi-draft context, the user should stay on the draft list after saving one draft (to continue with remaining drafts). The default navigation makes sense for single-draft but would break the multi-draft flow.
- **Trade-off:** Slightly more complex DraftEditor; mitigated by clean fallthrough to existing behavior when prop is absent

### Draft "saved" status maps to `status === 'ready'`
- **Decision:** In multi-draft helpers, a draft is considered "saved" when its status field equals `'ready'` — matching the status set by `convertToRecipe()`
- **Why:** Consistent with S01's domain model where `convertToRecipe` transitions a draft to `ready` status. No new status value needed.
- **Trade-off:** If the status lifecycle changes upstream, the helpers need updating; mitigated by the test suite catching this

## S03: SEO Structured Data

### Pure functions in src/lib/seo/ over component-level logic
- **Decision:** JSON-LD and meta tag generation lives in `src/lib/seo/` as pure functions (`generateRecipeJsonLd`, `generateRecipeMetaTags`, `minutesToIsoDuration`), not inline in the page component
- **Why:** Pure functions are trivially testable in the Node.js Jest environment without React rendering. Keeps the page component clean. Functions can be reused if other pages need structured data later.
- **Trade-off:** Extra module indirection; justified by testability and reuse

### Client-side Head injection via expo-router/head (no static rendering)
- **Decision:** Use `expo-router/head` (wraps `react-helmet-async`) for client-side `<head>` injection. Do not enable `web.output: "static"` in this slice.
- **Why:** Static rendering requires `generateStaticParams` with a build-time Supabase query — a larger change. M002 Context explicitly accepts client-side JSON-LD: "start with client-side and verify with Search Console." The `Head` approach works identically when static rendering is later enabled.
- **Trade-off:** Google may deprioritize client-rendered structured data; accepted risk per M002 scope

### JSON roundtrip as undefined-value safety net
- **Decision:** `generateRecipeJsonLd` runs `JSON.parse(JSON.stringify(result))` before returning, stripping any `undefined` values that would produce invalid JSON-LD.
- **Why:** Conditional field assembly could accidentally leave `undefined` values. JSON roundtrip is a cheap, foolproof guard. Structured data validators reject `undefined` in JSON.
- **Trade-off:** Marginal runtime cost; negligible for a function called once per page load

### Production domain as canonical OG/meta URL
- **Decision:** OG `url` and canonical page URL use `https://berven.app/recipe/{id}` (hardcoded production domain), not the current hostname.
- **Why:** OG URLs should point to the canonical production URL regardless of the environment the page is rendered in. Prevents dev/staging URLs from leaking into social previews.
- **Trade-off:** Means dev/staging social previews point to production; acceptable since social sharing is a production concern
