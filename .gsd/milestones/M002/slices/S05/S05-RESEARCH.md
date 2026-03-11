# S05: UX Polish — Research

**Date:** 2026-03-11

## Summary

S05 is the final polish slice for M002, responsible for integrating deferred follow-ups from S01–S04, fixing UX gaps, and performing UAT verification. The codebase is in strong shape — 474 tests pass, zero TypeScript errors, and all prior slices are complete. The work breaks into three categories: (1) integration items explicitly deferred to S05 by prior slices (GdprConsentBanner layout integration, GDPR→ATT sequencing), (2) UX quality gaps discovered during code exploration (missing accessibility labels across 35+ touchable screens, no pull-to-refresh anywhere, no loading skeletons, inconsistent error handling patterns, `+not-found.tsx` doesn't use design tokens, `TouchableOpacity` mixed with `Pressable` in DraftEditor), and (3) UAT verification required by M002's definition of done (multi-recipe photo scan E2E, Google Rich Results Test, production ad config verification).

The scope is manageable but broader than a typical slice. The integration items are well-defined (S04 explicitly documented what needs wiring). The UX gaps are incremental improvements, not architectural changes. The UAT items are verification-only — no new features.

## Recommendation

Structure S05 into focused tasks:

1. **Integration wiring** — Mount `GdprConsentBanner` in the public layout, wire GDPR→ATT consent sequencing in the ad pipeline, verify the combined flow
2. **UX quality pass** — Standardize error states, add accessibility labels to all interactive elements, migrate DraftEditor from TouchableOpacity to Pressable, style `+not-found.tsx` with design tokens, add pull-to-refresh to key list screens (recipes, collections, public browse)
3. **UAT verification** — Run the web app and verify SEO structured data renders, verify ad config reads env vars correctly, exercise scan flow, TypeScript clean, full test suite green

Skip loading skeletons in this slice — they're nice-to-have but add significant component complexity. The existing `ActivityIndicator` loading states are functional and consistent. Skeletons can be added in a future polish pass.

## Don't Hand-Roll

| Problem | Existing Solution | Why Use It |
|---------|------------------|------------|
| GDPR consent persistence | `consent.ts` unified API with `getConsentStatus`/`requestConsent`/`setWebConsentStatus` | Already built and tested (38 tests) — just wire into layout |
| ATT prompting | `att.ts` with `requestTrackingPermission` | Already built — wire as step 2 after GDPR consent resolves |
| SEO validation | Google Rich Results Test (external tool) | M002 defines this as the acceptance criteria for SEO-01 |
| Design tokens | `src/lib/tokens.ts` — 60+ tokens covering colors, fonts, radii, shadows | Every screen already uses these; `+not-found.tsx` is the sole exception |
| Ad unit ID config | `getBannerAdUnitId()` reads env vars with test-ID fallback | Already built (13 tests) — just set production env vars to activate |

## Existing Code and Patterns

- `src/features/ads/GdprConsentBanner.tsx` — Built and exported but **not mounted** in any layout. Returns null on native (UMP handles consent natively). On web, renders fixed-bottom banner with Accept/Decline → persists to AsyncStorage.
- `src/features/ads/consent.ts` — Unified consent API. `requestConsent()` triggers UMP form on native, returns `'required'` on web (signals banner should show). `canShowPersonalizedAds(status)` is pure function.
- `src/features/ads/att.ts` — ATT module. `requestTrackingPermission()` prompts on iOS, returns `'not-applicable'` on other platforms. DECISIONS.md says: GDPR first, then ATT based on GDPR purpose-one consent.
- `src/features/ads/AdBanner.tsx` — Already consent-gated in `NativeAdBanner` via useEffect. Runs `getConsentStatus()` → `requestConsent()` → sets `requestNonPersonalizedAdsOnly`. This triggers UMP on native at ad-render time.
- `app/(public)/_layout.tsx` — Currently just `<Stack screenOptions={{ headerShown: false }} />`. This is where `GdprConsentBanner` should be mounted for web.
- `app/_layout.tsx` — Root layout with font loading, splash screen, SessionProvider. Alternative mounting point for GdprConsentBanner if it should appear on all web screens.
- `app/+not-found.tsx` — Uses plain `StyleSheet.create` with hardcoded values instead of design tokens. Only screen not using the token system.
- `src/features/scans/DraftEditor.tsx` — **Only file** using `TouchableOpacity` (9 usages). All other screens use `Pressable`. Inconsistent.
- `src/components/nav/PageContainer.tsx` — Wraps screen content with consistent padding/max-width per breakpoint. All screens use it.
- `src/lib/hooks/useBreakpoint.ts` — Returns `'mobile' | 'tablet' | 'web'` based on window width. Used everywhere.

## Constraints

- **No pull-to-refresh in any list screen** — `RefreshControl` is not imported or used anywhere in the codebase. Adding it to FlatList-based screens (recipes, collections, public browse, family) is straightforward but requires threading `refreshing` state through each screen.
- **No accessibility labels on interactive elements** — Only `GdprConsentBanner.tsx` and `AdBanner.tsx` have `accessibilityRole`/`accessibilityLabel`. The remaining 35+ files with `Pressable` components have zero accessibility markup. Full coverage is a significant but mechanical effort.
- **No ErrorBoundary** — No React error boundary exists anywhere in the app. Unhandled JS errors in any screen component will crash the entire app. Adding one at the root layout is a meaningful resilience improvement.
- **`as any` type assertions on router paths** — 20+ instances of `router.push('/path' as any)` across the app. This is an Expo Router typed routes limitation (dynamic segments need type assertions). Not a bug, but could be cleaned up with a route helper if desired.
- **UAT requiring real-device testing** — S04 Summary notes: UMP consent form requires a configured AdMob account. Real-device ATT prompt requires iOS device build. These are operational verification items that can't be automated in this slice — document as verified-to-the-extent-possible and note what requires manual pre-release testing.
- **Google Rich Results Test requires production URL** — S03 noted JSON-LD is client-rendered. We can verify the markup exists in the browser DOM but can't run the Google tool without deploying to `berven.app`.

## Common Pitfalls

- **GdprConsentBanner positioning conflicts with AdSlot** — Both use `position: 'absolute'` at the bottom of the screen. If both render simultaneously on a public screen, they'll overlap. Solution: GdprConsentBanner should render in the root or public layout with higher z-index, and dismiss permanently after the user's choice.
- **GDPR→ATT sequencing complexity** — The recommended flow (GDPR first, then ATT) requires coordinating two async consent flows. The simplest approach is: check GDPR consent at app launch → if consent obtained and iOS → trigger ATT. Don't over-engineer — this can be a simple sequential check in a useEffect in the root layout.
- **Pull-to-refresh on web** — React Native's `RefreshControl` renders poorly on web (visible spinner pull gesture doesn't work on desktop browsers). Guard with `Platform.OS !== 'web'` to avoid visual artifacts.
- **Accessibility label coverage trap** — Adding labels to every Pressable is mechanical but tedious. Focus on the highest-impact screens first: navigation (tab bar, sidebar), core flows (scan upload, draft review), and public screens (recipe browse, recipe detail).
- **DraftEditor TouchableOpacity migration** — `TouchableOpacity` has opacity animation on press; `Pressable` doesn't by default. When migrating, add `style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}` to maintain the visual feedback.

## Open Risks

- **UMP SDK testing gap** — The consent module's native UMP path is tested only via mocks. First real-device test may reveal API shape mismatches. S05 can't close this gap without a physical device build — document and flag for pre-release.
- **Client-side JSON-LD indexability** — Google may deprioritize client-rendered structured data. Can't verify with Rich Results Test without production deployment. Accepted risk per M002 scope.
- **Multi-recipe detection accuracy with real photos** — Edge function multi-recipe detection is prompt-based. Accuracy with real cookbook photos is untested. S05 UAT should attempt this if a Supabase backend is available, but may need to defer to pre-release testing.
- **AdMob production IDs not yet set** — `.env.example` documents the four `EXPO_PUBLIC_ADMOB_*` vars, but actual production values aren't configured. The app falls back to test IDs gracefully. Setting real IDs is an operational step, not a code change.

## Skills Discovered

| Technology | Skill | Status |
|------------|-------|--------|
| Expo | `expo/skills@expo-dev-client` (9.4K installs) | available — useful for native build setup but not needed for S05 UX polish |
| Expo | `expo/skills@expo-deployment` (9.3K installs) | available — relevant if deploying for UAT but not core to this slice |
| React Native | `callstackincubator/agent-skills@react-native-best-practices` (7K installs) | available — could inform accessibility and UX patterns |
| Supabase | `supabase/agent-skills@supabase-postgres-best-practices` (31.9K installs) | available — not needed for this slice (no DB changes) |
| Frontend Design | `frontend-design` | installed — load for any visual/UI refinement tasks |

## Sources

- S01-SUMMARY: Follow-ups — test with real multi-recipe cookbook page photos, edge function parser sync
- S02-SUMMARY: Follow-ups — exercise full multi-draft flow with real data, loading skeleton for DraftListView
- S03-SUMMARY: Follow-ups — validate with Google Rich Results Test against production URL
- S04-SUMMARY: Follow-ups — integrate GdprConsentBanner into app root layout, wire GDPR→ATT sequencing, set production ADMOB env vars, real-device UMP testing
- Codebase exploration: 35+ files with Pressable but only 2 with accessibility labels, zero RefreshControl usage, zero ErrorBoundary, DraftEditor is sole TouchableOpacity user, +not-found.tsx doesn't use design tokens
