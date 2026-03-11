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

### Array-always response schema
- **Decision:** Claude prompt always requests `{ "recipes": [...] }` even for single-recipe images — the array has length 1 in that case
- **Why:** Uniform response shape eliminates branching in the parser. Backward compat with legacy single-object format is handled as a fallback in `parseMultiScanResult` for robustness.
- **Trade-off:** Slightly more verbose prompt; negligible cost
