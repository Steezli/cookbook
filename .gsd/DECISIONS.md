# Decisions

## Tooling

### Pencil design tool access — ALWAYS use mcporter
- **Decision:** **Always use mcporter (`mcp_call` with server `pencil`)** to interact with Pencil design files. Never launch Pencil directly or use mac-tools to interact with it. The mcporter integration provides `mcp_call(server='pencil', tool='...', args={...})` with 15 tools for reading, searching, exporting, and modifying `.pen` files.
- **Why:** Pencil contains all cookbook.pen designs (screens × breakpoints + components); designs should be referenced during UI work rather than guessing. The MCP server provides structured, reliable access to design data — mac-tools/direct app interaction is unreliable and incorrect.
- **Enforcement:** When the user mentions "pencil", "checking pencil", "pencil MCP", or "use pencil", this means use `mcp_call` with server `pencil`. This is a permanent, non-negotiable rule.

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

## S04: Production Ads + GDPR

### app.json → app.config.ts migration for env-based plugin config
- **Decision:** Convert `app.json` to `app.config.ts` (JS config) so the `react-native-google-mobile-ads` Expo plugin can read app IDs from `process.env` at EAS Build time.
- **Why:** `app.json` is static — can't read env vars. `app.config.ts` is evaluated at build time and can reference `process.env`, enabling dev/staging/prod to use different AdMob app IDs without changing code.
- **Trade-off:** Must verify all existing plugins and Expo Router still work after migration. Minor one-time effort.

### UMP SDK on native, custom consent banner on web
- **Decision:** Native GDPR consent uses Google's UMP SDK (`AdsConsent` from `react-native-google-mobile-ads`) via dynamic import. Web uses a custom `GdprConsentBanner` component with AsyncStorage persistence.
- **Why:** UMP is Google's official consent framework, required for AdMob compliance on native. UMP is not available on web (`react-native-google-mobile-ads` is native-only). The custom web banner is a UX placeholder acceptable for MVP since web ads aren't live.
- **Trade-off:** Two consent paths (native vs web) increase complexity; mitigated by a unified API (`consent.ts`) that abstracts the platform difference.

### Consent-gated ad personalization over blanket non-personalized
- **Decision:** `AdBanner` reads consent status at mount and sets `requestNonPersonalizedAdsOnly` dynamically (true when no consent, false when consent obtained), replacing the hardcoded `true`.
- **Why:** Maximizes ad revenue when users consent while remaining compliant when they don't. Hardcoding non-personalized leaves revenue on the table.
- **Trade-off:** More complex ad loading path; mitigated by clean consent API and safe fallback (non-personalized on any error).

### GDPR consent check before ATT prompt
- **Decision:** The recommended flow is GDPR consent first, then ATT prompt based on GDPR purpose-one consent. This matches the `react-native-google-mobile-ads` library docs.
- **Why:** Avoids double-prompting. GDPR consent may indicate ATT is not needed. Library docs recommend this specific ordering.
- **Trade-off:** Full ATT+GDPR sequencing is deferred to S05 integration; S04 builds the consent module independently.

## S05: UX Polish

### ErrorBoundary at root layout level
- **Decision:** Add a single React class-based ErrorBoundary wrapping the root Stack navigator in `app/_layout.tsx`, inside SafeAreaProvider and SessionProvider.
- **Why:** No error boundary exists anywhere — unhandled JS errors crash the entire app with no recovery. A root-level boundary catches all screen-level errors with a styled fallback and "Try Again" recovery. Class component required because functional components can't use componentDidCatch.
- **Trade-off:** A single root boundary can't provide granular per-screen recovery; acceptable for MVP since per-screen boundaries can be added later for specific high-risk screens.

### Skip loading skeletons in S05
- **Decision:** Keep existing `ActivityIndicator` loading states. Do not add loading skeletons in this slice.
- **Why:** Skeletons add significant component complexity (per-screen skeleton layouts matching content shape). Existing loading indicators are functional and consistent. Skeletons are a nice-to-have for a future polish pass.
- **Trade-off:** Slightly less polished loading UX; but avoids scope creep in the final milestone slice.

### Accessibility labels on highest-impact screens first
- **Decision:** Add accessibilityRole/accessibilityLabel to navigation components, scan flow, and public screens — not exhaustive coverage of all 35+ files.
- **Why:** Full a11y label coverage across 35+ files is mechanical but large. Focusing on navigation (every screen), scan flow (core UX), and public screens (SEO/accessibility overlap) covers the highest-impact surfaces within S05's scope.
- **Trade-off:** Some lower-traffic screens remain without labels; can be addressed in a future accessibility pass.

### Conditional Expo config plugin for native-only packages
- **Decision:** Guard `react-native-google-mobile-ads` Expo plugin in `app.config.ts` with `fs.existsSync` check — only include it when the package is installed in `node_modules`
- **Why:** The package is native-only and not installed during local web development (intended for EAS Build). Without the guard, `expo start --web` crashes at plugin resolution. Dynamic imports already handle runtime gracefully; this fixes config-time resolution.
- **Trade-off:** The plugin silently drops when not installed; acceptable since the plugin is only needed for native builds where the package will be installed via EAS

### Pull-to-refresh guarded against web
- **Decision:** Wrap RefreshControl with `Platform.OS !== 'web'` guard on all FlatList screens.
- **Why:** React Native's RefreshControl renders poorly on web (visible spinner, pull gesture doesn't work on desktop). Guarding prevents visual artifacts.
- **Trade-off:** Web users don't get pull-to-refresh; acceptable since web has browser-native refresh and the pull gesture is a mobile pattern.

### Pencil design reference for new visual components
- **Decision:** All new visual components (ErrorBoundary fallback, restyled not-found page) must reference `cookbook.pen` in Pencil for design language, color palette, and component patterns before implementation.
- **Why:** Maintains visual consistency with the established design system rather than inventing new patterns. The app's entire UI was built from Pencil designs.

## M003/S03: Scan UI Polish

### Raw HTML div for web drag-and-drop
- **Decision:** Use a raw `<div>` element with Platform.OS === 'web' conditional rendering for the drag-and-drop file zone, not react-native-web's `<View>`
- **Why:** react-native-web 0.21 does not forward HTML5 drag events (onDragOver, onDragLeave, onDrop) on `<View>` components. A raw `<div>` is the only reliable approach without upgrading or patching.
- **Trade-off:** Breaks the "pure React Native" pattern in one spot; contained to a single Platform.OS branch and invisible on native

### Token migration removes StyleSheet.create from DraftEditor/DraftManager
- **Decision:** Remove `StyleSheet.create` entirely from DraftEditor and DraftManager, using inline style objects computed from tokens and breakpoints
- **Why:** Per project STATE.md constraint, dimension-sensitive styles must be computed inside components from `useBreakpoint()`, not cached in StyleSheet.create. Since these files need extensive breakpoint responsiveness, there's no benefit to keeping a partial StyleSheet.create for the non-responsive subset — cleaner to go fully inline.
- **Trade-off:** Slightly more inline style objects; mitigated by tokens providing named constants that read clearly

## M003: Quality Audit & Cleanup

### Scan directory consolidation target
- **Decision:** Merge `src/features/scans/` into `src/features/scan/` (keep the singular name). All imports rewritten to `@/features/scan/`.
- **Why:** Two directories for the same feature creates confusion and import inconsistency. The singular `scan/` is the original and has more consumers.

### Dead code removal — verify before delete
- **Decision:** Every file deletion must be preceded by import analysis confirming zero non-test importers. Types still in use must be extracted before the source file is removed.
- **Why:** Aggressive deletion without verification could break the app in ways TypeScript doesn't catch (dynamic imports, string references).

### Semantic state color tokens in tokens.ts
- **Decision:** Added error/warning feedback colors (errorBg, errorBorder, errorTitle, errorText, warningBg, warningBorder, warningTitle, warningText) to `src/lib/tokens.ts` as shared design tokens rather than keeping them as hardcoded hex values in individual components.
- **Why:** These colors are reused across DraftEditor.tsx and DraftManager.tsx (and potentially other scan components). Centralizing them enables consistent feedback styling and eliminates hex color duplication.

### Draft-status badge color tokens in tokens.ts
- **Decision:** Added draft-status badge colors (statusReadyBg/Text, statusReviewBg/Text, statusEnhancedBg/Text) and accentPurple to `tokens.ts` as shared exports rather than local constants in DraftManager.tsx
- **Why:** The verification requirement of zero hardcoded hex colors in DraftManager.tsx required all color values to come from token imports. Making them shared tokens enables consistent status badge styling across any future components that display draft status.
- **Trade-off:** Adds 7 more token exports to an already-growing tokens.ts; acceptable since they're semantically distinct and potentially reusable

### Console.log policy — keep edge functions, clean client
- **Decision:** Remove debug console.* from client-side code (src/, app/). Edge functions (supabase/functions/) retain their logging since server-side logs are the primary diagnostic surface.
- **Why:** Client console pollution hides real errors. Server logs are expected and useful.

## M003/S05: Full App Audit & Cross-Platform Verification

### Shared cross-platform alert utility over per-file inline wrappers
- **Decision:** Extract `showAlert`/`confirmAction` into `src/lib/alert.ts` as the single source of truth, replacing 3 inline copies and 15 unguarded files.
- **Why:** `Alert.alert` is `static alert() {}` on react-native-web 0.21 — a complete silent no-op. 41 calls across 17 files silently swallow all error feedback on web. A shared utility ensures every call site gets cross-platform behavior automatically.
- **Trade-off:** All 17 files take a new import dependency; but the alternative (per-file wrappers or leaving calls broken) is worse.

### Inline error state UI over alert-based error display for data loading failures
- **Decision:** Home screen, recipes index, and cook mode use inline error text/state in the UI for load failures, rather than calling `showAlert`.
- **Why:** Data loading failures happen at mount time before user interaction. An alert popup for a background load error is jarring. Inline error text with retry guidance is better UX for these cases.
- **Trade-off:** Each screen needs its own error state variable; but these are simple `useState<string | null>` additions.

## M004: QOL & Bug Fixes

### Ingredient matching via normalized substring with word boundaries
- **Decision:** Use normalized text comparison with word-boundary-aware regex matching for step↔ingredient matching, not NLP or fuzzy string distance.
- **Why:** Cooking ingredients have predictable patterns. Word boundaries prevent false matches (flour≠cauliflower). Bidirectional plural handling covers singular/plural variations. Zero external dependencies.
- **Trade-off:** Won't match creative rewordings ("melt the golden spread" for butter). Acceptable for recipe apps where ingredients and steps use consistent terminology.

### Liquid/dry ingredient classification via known-liquids set
- **Decision:** Use a static `KNOWN_LIQUIDS` set (60+ items) to classify ingredients. Items NOT in the set are treated as dry when measured in volume units.
- **Why:** Deterministic, zero dependencies, fast. The set covers the vast majority of cooking liquids. Unknown ingredients safely fall back to ml (volume) which is less wrong than converting unknown dry goods to ml.
- **Trade-off:** New/unusual liquid ingredients won't be classified correctly until added to the set. Edge cases like "melted chocolate" (liquid state of a dry ingredient) default to dry behavior.

### Dry ingredient density table (grams per cup)
- **Decision:** Maintain a `DRY_GRAMS_PER_CUP` lookup table with 40+ entries for common baking/cooking ingredients. Used when converting dry volume to metric weight.
- **Why:** Standard baking measurements are well-established (1 cup flour = 125g). The table enables accurate conversions without requiring users to weigh ingredients. Falls back gracefully to ml when an ingredient isn't in the table.
- **Trade-off:** Table must be maintained. Ingredient names must match (uses substring matching for flexibility). Densities are approximate averages.

### Dynamic scan timeout scaling
- **Decision:** Scan processing timeout scales with image count: base 60s + 30s per additional image, capped at 180s. Previous fixed 60s timeout caused false failures for multi-image scans.
- **Why:** Claude API calls with 3+ images can take 60-90+ seconds. A fixed 60s timeout incorrectly reports failure for jobs that will succeed.
- **Trade-off:** Users wait longer before seeing an error for legitimately failed multi-image jobs. Mitigated by the "Check Again" retry button.

### iOS scan route: full-screen over modal
- **Decision:** Removed `presentation: "modal"` from scan route, replaced with `fullScreenGestureEnabled: true` and `animation: 'slide_from_right'`.
- **Why:** Modal presentation shows the scanner as a popup/sheet on iOS, which feels cramped. Full-screen with swipe-back gesture is the standard iOS navigation pattern for a content creation flow like scanning.

## M005/S01: Security & Data Integrity

### Centralized CORS module with dynamic origin allowlist
- **Decision:** Replaced all inline `Access-Control-Allow-Origin: *` across 11 edge functions with a shared `_shared/cors.ts` module that validates the request `Origin` against an allowlist derived from `SUPABASE_URL` and optional `ALLOWED_ORIGINS` env var.
- **Why:** Wildcard CORS on sensitive edge functions (scan jobs, invites, password resets) is unnecessarily permissive. Any website could make authenticated cross-origin requests. Dynamic origin checking with `Vary: Origin` is the standard secure pattern.
- **Trade-off:** Adds an env-var dependency for custom domains. Native mobile clients are unaffected since they don't send `Origin` headers. The static `corsHeaders` export is kept for backward compatibility but now defaults to `SUPABASE_URL` instead of `*`.

### Structured password validation result
- **Decision:** Added `validatePassword()` returning `{ valid: boolean, errors: string[] }` alongside the existing boolean `isValidPassword()` wrapper.
- **Why:** Callers need per-rule error messages for good UX. The boolean-only API forced generic "requirements not met" messages.
- **Trade-off:** Two exported functions instead of one; mitigated by `isValidPassword` being a thin wrapper that's easy to deprecate later.

### LIKE pattern escape at call site
- **Decision:** `escapeLikePattern()` applied at each ilike call site in search.ts, not wrapped into a query builder abstraction.
- **Why:** Minimal change surface, immediately auditable via grep. Only 3 call sites exist — a query builder wrapper would be over-engineering.
- **Trade-off:** Relies on developers remembering to use it for new ilike calls; mitigated by the grep-based verification pattern.

### Extracted computeRetryDecision() for Deno/Jest boundary
- **Decision:** Extracted the pure retry boundary logic into `src/lib/scan/retry-logic.ts` with `computeRetryDecision()` while keeping an inlined copy in the Deno edge function.
- **Why:** The edge function runs on Deno and can't import from `src/`. The extracted function enables Jest testing of the critical retry boundary without running Deno.
- **Trade-off:** Two copies of the logic that could drift; same pattern as the parser duplication that S02 will address.

### Single atomic DB update per retry decision path
- **Decision:** Replaced the two-step update (set failed → set queued) with a single update per retry path in process-scan-job.
- **Why:** Two sequential updates created a race window where another worker could pick up a job in an intermediate failed state. Single atomic update eliminates the race.

### Readonly<Recipe> for no-mutation contract
- **Decision:** Typed the `backfillIngredients` parameter as `Readonly<Recipe>` to enforce the no-mutation contract at compile time.
- **Why:** The previous in-place `recipe.ingredients = updated` mutation caused potential race conditions during React rendering. `Readonly` makes the compiler catch any future mutation attempts.

### SQL RPC with security invoker for atomic photo reorder
- **Decision:** Created a `reorder_recipe_photos` Postgres RPC function (`security invoker`, `search_path = ''`) replacing N individual updates via `Promise.all`.
- **Why:** Individual updates are not transactional — a mid-batch failure leaves photos in inconsistent sort order. The RPC runs all updates in a single transaction. `security invoker` preserves RLS enforcement.
- **Trade-off:** Adds a migration dependency; the RPC must be deployed before the client code is used.

## M005/S02: Performance & Code Deduplication

### DISTINCT ON via RPC for first-photo-per-recipe
- **Decision:** Created a `get_first_recipe_photos` Postgres RPC using `DISTINCT ON (recipe_id)` ordered by `sort_order, created_at` instead of fetching all photos and deduplicating client-side.
- **Why:** Supabase JS client doesn't support `DISTINCT ON` natively. The RPC returns exactly one row per recipe at the database level, eliminating over-fetching proportional to the number of extra photos per recipe.
- **Trade-off:** Adds an RPC dependency (migration must be deployed). Establishes the RPC pattern as the standard approach for any future query needing `DISTINCT ON`.

### Marker-based sync with content hash for cross-runtime code deduplication
- **Decision:** Created `scripts/sync-scan-parser.sh` that copies parser functions from `src/lib/scan/multi-recipe-parser.ts` into the edge function between `BEGIN SYNCED`/`END SYNCED` markers, stripping `export` keywords and stamping a SHA-256 content hash for drift detection.
- **Why:** The Deno edge function can't import from `src/`. Previous approach was manual copy-paste of ~150 lines, which drifted. The sync script makes deduplication automated and verifiable. `--check` mode enables CI enforcement.
- **Trade-off:** Marker-based approach is fragile if markers are manually edited. Mitigated by the hash-based check that catches any tampering.

### Client-side comment pagination over RPC results
- **Decision:** Pagination for comments is applied in the API layer (JavaScript) after the RPC returns the full recursive comment tree, rather than modifying the Postgres RPC itself.
- **Why:** The existing RPC handles access control, recursive CTE for nested threads, and path-based hierarchy. Modifying it for server-side pagination would be a significant change with limited benefit at current scale. Client-side slicing is simpler and preserves thread integrity.
- **Trade-off:** Full comment tree is always fetched from Postgres. If comment volumes grow large, the RPC should be refactored for server-side pagination.

## M005/S03: Type Safety & Error Handling

### Generated Supabase types from remote DB
- **Decision:** Used `supabase gen types typescript --project-id` to generate `database.types.ts` from the remote DB rather than manually creating types from migration schema.
- **Why:** Generated types are authoritative, comprehensive (1304 lines covering all tables, RPCs, enums), and regenerable. Manual types would be incomplete and drift.
- **Trade-off:** Requires remote DB access for regeneration. Two RPCs not yet applied to remote DB are missing from generated types — workaround with `(supabase.rpc as Function)` cast.

### toJson() helper for typed jsonb column assignment
- **Decision:** Created a `toJson()` helper function that casts typed TypeScript objects to the `Json` type expected by Supabase's generated types for jsonb columns.
- **Why:** The generated types define jsonb columns as `Json` (a union of primitives), but application code passes structured typed objects. Direct assignment fails type checking. The helper provides a clean, auditable cast point.
- **Trade-off:** One cast point per jsonb assignment; better than scattering `as unknown as Json` throughout the codebase.

### NonEmptyArray<T> tuple type for compile-time validation
- **Decision:** Created `NonEmptyArray<T>` as `[T, ...T[]]` and applied to `ingredients` and `steps` in both `CreateRecipeInput` and `UpdateRecipeInput`.
- **Why:** Empty ingredients/steps arrays are never valid for recipes. The tuple type catches empty-array construction at compile time. Runtime validation in `api.ts` remains the authoritative guard.
- **Trade-off:** Call sites that construct these inputs need safe casts when TypeScript can't infer non-emptiness from runtime checks. Two call sites updated with documented casts.

### `unknown` + Record narrowing for untyped external JSON parsing
- **Decision:** Replaced `any` in `multi-recipe-parser.ts` with `unknown` + `Record<string, unknown>` narrowing pattern for parsing Claude API responses.
- **Why:** The parser handles untyped JSON from an external API. `unknown` forces explicit narrowing at each access point, catching structural assumption errors at compile time instead of runtime.
- **Trade-off:** More verbose property access; justified by the safety improvement for the most critical data pipeline in the app.

## S04: Code Quality & Readability

### Auth convention: getUser() for mutations, getSession() for reads
- **Decision:** Standardized all API modules to use `supabase.auth.getUser()` for mutations and `supabase.auth.getSession()` for reads. Public reads (unauthenticated) or RLS-guarded updates/deletes skip auth entirely.
- **Why:** `getUser()` makes a server round-trip to verify the user is still valid — appropriate for mutations where stale identity is dangerous. `getSession()` reads the locally cached session (auto-refreshing expired tokens) — appropriate for reads where a slightly stale identity is harmless and the network call is wasteful.
- **Trade-off:** Read-path auth errors are caught by RLS rather than client-side. Acceptable since RLS is the authoritative access control layer.

### Retained `as Type` casts for Supabase query results
- **Decision:** Kept `data as Recipe`, `data as Collection`, etc. casts on Supabase query results rather than removing them.
- **Why:** Domain types (Recipe, Collection, etc.) have richer typing than the auto-generated Supabase DB row types — e.g., `ingredients` is `Json` in DB types but `RecipeIngredient[]` in domain types. The casts are structurally necessary and can't be replaced with Supabase generics.
- **Trade-off:** Casts bypass TypeScript's structural checking at those points; mitigated by the generated DB types matching the actual DB schema.

### OAuth redirect consolidation into shared helper
- **Decision:** Extracted `handleOAuthRedirect(provider)` as a private function in `social-auth.ts`. Each provider function (Google, Apple non-iOS, Facebook) is a one-liner calling the shared helper.
- **Why:** All three providers had identical ~20-line redirect handling: `signInWithOAuth` → `openAuthSessionAsync` → URL parse → `setSession`. Triplication was a maintenance burden and divergence risk.
- **Trade-off:** The shared helper uses a union type `OAuthProvider` ('google' | 'apple' | 'facebook') instead of Supabase's broader `Provider` type — tighter contract but must be updated if new OAuth providers are added.

### Comment standard: retain only non-obvious explanations
- **Decision:** Removed all comments that restate the function name, describe what the next line obviously does, or are JSDoc with no additional insight. Retained comments that explain WHY (business logic, edge cases, platform workarounds).
- **Why:** ~254 lines of noise comments obscured the actually valuable explanations. Code should be self-documenting for WHAT; comments should explain WHY.
- **Trade-off:** Fewer comments means developers must read code to understand WHAT — accepted since the code is well-typed and well-named.

### Error convention: throw Supabase errors directly
- **Decision:** Standardized all API modules to throw Supabase error objects directly (`throw error`) rather than wrapping them in `new Error(message)`.
- **Why:** Supabase errors already contain descriptive messages, status codes, and error codes. Wrapping them in `new Error()` loses the structured information and adds no value.
- **Trade-off:** Callers must handle Supabase error shapes rather than plain Error objects; acceptable since all callers already do this.

## M006: Subscriptions

### Supabase-backed scan count over client-side tracking
- **Decision:** Track scan counts server-side in a `user_scan_counts(user_id, year_month TEXT, count INTEGER)` table with a Postgres RPC for atomic increment, rather than trusting any client-provided count.
- **Why:** Client-side count tracking can be bypassed by modifying local state or requests. Server-side atomic increment with `ON CONFLICT DO UPDATE` eliminates the read-then-write race condition and prevents manipulation.
- **Trade-off:** Every scan attempt requires a Supabase RPC call. Acceptable — scans already require multiple Supabase calls.

### year_month TEXT column over integer count with reset logic
- **Decision:** Store `year_month` as a TEXT column (e.g., `'2026-03'`) computed server-side via `TO_CHAR(NOW(), 'YYYY-MM')`, not a single rolling integer with a reset timestamp.
- **Why:** A new month automatically starts at count 0 with no cron job, migration, or reset logic needed. The RPC computes the current month server-side — client cannot spoof the month.
- **Trade-off:** Historical scan counts are retained per-month (minor storage overhead); useful for potential future analytics.

### Photo upload as "scan" unit, not recipe extraction
- **Decision:** A "scan" is counted when photos are successfully uploaded (at `createMultiPhotoScanJob` insert time), not when the edge function extracts recipes. Failed edge function calls do not consume the free count.
- **Why:** One photo upload can yield multiple recipes (multi-recipe scan). Counting extractions would penalize users for the app's feature of detecting multiple recipes. Counting at upload time gives users a predictable understanding of "3 scans = 3 photo uploads."
- **Trade-off:** A user whose upload succeeds but edge function fails is not charged a scan — this is the correct behavior per requirements.

### RevenueCat initialization in session provider
- **Decision:** Call `Purchases.configure({ apiKey, appUserID: user.id })` inside the Supabase session provider as soon as a user ID is available, not lazily at the paywall or scan screen.
- **Why:** Entitlement checks are needed throughout the app (scan gating, ad suppression). Lazy initialization causes race conditions where legitimate subscribers appear unentitled. Initializing alongside auth session establishment ensures RevenueCat is ready before any check runs.
- **Trade-off:** RevenueCat is initialized even for users who never hit the paywall. The SDK call is lightweight (local SDK configuration, not a network request).

### SubscriptionContext with useSubscription() hook over prop drilling
- **Decision:** Expose subscription state (`isSubscriber`, `scanCount`, `scansRemaining`) via a React context provider and `useSubscription()` hook, not via prop drilling.
- **Why:** `AdBanner` needs subscriber state deep in the component tree without touching every intermediate component. Context is the established pattern for cross-cutting app state (same approach as `SessionProvider`).
- **Trade-off:** Components that call `useSubscription()` must be inside `SubscriptionProvider`. `SubscriptionProvider` wraps the root layout.

### M006/S01 verification strategy: contract proof via Jest with mocked RPC
- **Decision:** S01 is verified entirely by Jest tests mocking `supabase.rpc` and `supabase.from` — no real DB call, no EAS build. The migration is written and deployable but not applied to remote until milestone DoD.
- **Why:** The slice has no native build requirements. Jest contract proof is sufficient to unblock S02/S03. Remote migration deployment is gated on the full milestone, not S01 completion.
- **Trade-off:** `database.types.ts` will not include `user_scan_counts` until the migration is applied to remote; `(supabase.rpc as Function)` cast is used until then per established pattern.

### Slice order: Supabase infrastructure → SDK integration → gating → ads → web billing → docs
- **Decision:** Build in the order: S01 (Supabase scan count), S02 (RevenueCat SDK + context), S03 (scan gating + paywall), S04 (ad suppression), S05 (web billing), S06 (docs + verification).
- **Why:** Server-side infrastructure is testable in Jest and has no native build requirement — proves the business logic before touching the SDK. RevenueCat SDK integration is the highest technical risk (EAS build requirement) and is addressed second. Each subsequent slice has a stable foundation.
- **Trade-off:** Web billing (S05) comes after the core native experience is working, which is the correct risk ordering given that native has higher App Store review stakes.

## M006/S02: SubscriptionContext verification strategy

### Export computeSubscriptionState as pure function for Jest testability
- **Decision:** Export `computeSubscriptionState(customerInfo, scanCount)` as a named pure function from `SubscriptionContext.tsx`, separate from the React context/hook.
- **Why:** Follows the AdBanner pattern (pure config/consent functions tested without renderer). Keeps subscription state logic testable in Node environment without React Native renderer infrastructure. The hook tests call the pure function directly; context wiring is covered by the provider wrapping _layout.tsx.
- **Trade-off:** Slight API surface expansion; negligible — the function is small and the separation is clean.

### RevenueCat configure in session.tsx with purchasesConfiguredRef guard
- **Decision:** `Purchases.configure()` lives in `session.tsx`'s `onAuthStateChange` handler, not inside `SubscriptionProvider`. A `purchasesConfiguredRef` prevents double-initialization across multiple auth events.
- **Why:** session.tsx already has the auth event loop and fires before SubscriptionProvider's useEffect runs with a user ID. This eliminates the initialization race condition. SubscriptionProvider only manages entitlement query state, not SDK lifecycle.
- **Trade-off:** SDK lifecycle is split across two files; mitigated by clear comments and the established ensureProfile precedent in session.tsx.

## M006/S03: Scan Gating + Paywall

### isSubscriber parameter over hook call in service layer
- **Decision:** `createMultiPhotoScanJob` accepts `options?: { isSubscriber?: boolean }` rather than accessing React context directly.
- **Why:** Service layer functions are plain async functions outside React. Passing `isSubscriber` as a parameter keeps the function testable in Jest without context infrastructure. The scan screen (which has context access) passes the value down.
- **Trade-off:** `isSubscriber` must be threaded through `ScanUploadOptions` → `uploadScanPhotos` → `createMultiPhotoScanJob`. Defaults to `false` at every level — safe/conservative.

### ScanLimitError caught before generic error path in handleUpload
- **Decision:** In `handleUpload`'s catch block, check `instanceof ScanLimitError` first and set `paywallVisible = true` rather than setting `uploadResult` error state.
- **Why:** Generic error UI is wrong for a limit-reached scenario — the user needs the paywall, not an error message. Explicit `instanceof` check before the fallthrough ensures the paywall fires on limit, generic error fires on everything else.
- **Trade-off:** Scan screen catch block has two branches; both branches are clearly typed.

### PaywallPlaceholder component with dynamic import for RevenueCatUI
- **Decision:** Create `PaywallPlaceholder.tsx` as the web + native paywall surface for S03. Native path: dynamic import `react-native-purchases-ui` with `presentPaywallIfNeeded`; fallback to `showAlert`. Web path: `showAlert` "Coming Soon" stub (replaced in S05).
- **Why:** Native RevenueCatUI requires EAS build — not available in local dev. Dynamic import with fallback (established S02/AdBanner pattern) allows the component to compile and partially function in all environments. Web placeholder is intentionally minimal — S05 replaces it with real Stripe checkout.
- **Trade-off:** Web subscribe button is non-functional until S05. Clearly documented as placeholder.
