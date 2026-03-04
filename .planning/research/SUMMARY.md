# Project Research Summary

**Project:** Family Recipe Vault — v1.1 Responsive Design + Monetization
**Domain:** Universal Expo app (iOS, Android, Web) — design-first UI rebuild with public browsing and subscription monetization
**Researched:** 2026-03-03
**Confidence:** MEDIUM-HIGH (stack and architecture HIGH from direct codebase audit; monetization MEDIUM from official but evolving SDKs)

## Executive Summary

This project is a v1.1 milestone on an existing Expo SDK 52 / React Native 0.76 family recipe app that is fully built for mobile. The v1.0 codebase has auth, family spaces, recipe CRUD, scan/OCR, comments, ratings, and RLS-gated visibility — all working on mobile. v1.1 adds three things: (1) a design-first responsive rebuild across mobile/tablet/web breakpoints using a `.pen` design file as the single source of truth, (2) a public recipe browsing surface for unauthenticated users, and (3) monetization via subscription-gated scanning and minimal ads on public screens only. The fundamental architecture is sound — the work is evolutionary, not a rewrite.

The recommended approach is strictly dependency-ordered: design tokens and the breakpoint hook must come first because every subsequent screen and component depends on them. The root navigation must convert from a flat Stack to a Tabs group before any screen work begins, because all screen implementations target the new tab-group file structure. Public browsing is a separate `(public)/` route group with its own layout — this keeps authenticated and unauthenticated surfaces cleanly separated without conditional logic spread across shared components. Ads and subscription gating are deliberately last because they require dev builds and have the most integration risk.

The primary risks are: (1) design-to-code drift across 9+ screens if tokens are not extracted before implementation begins — recovery cost is HIGH if allowed to bake in, (2) the AdMob SDK failing `expo export --platform web` if not platform-branched from the start — treat this as a build blocker on day one of the ads phase, and (3) subscription entitlement gating implemented as a hardcoded route guard rather than a feature-flag-friendly abstraction — the PROJECT.md explicitly marks scan gating as a hypothesis, so the gate must be bypassable without a code deploy.

## Key Findings

### Recommended Stack

The existing stack (Expo SDK 52, Expo Router v4, react-native-web 0.21, Supabase) requires no major additions for the responsive layout work — `useWindowDimensions` is built in and a custom `useBreakpoint()` hook is 20 lines of code. No responsive library is needed. For fonts, `@expo-google-fonts/dm-sans` and `@expo-google-fonts/bricolage-grotesque` directly match the `.pen` design tokens. For image thumbnails, `expo-image` (already in the SDK ecosystem) provides disk caching over the signed Supabase Storage URLs.

Monetization requires two new native SDKs: `react-native-google-mobile-ads ^14.0.0` (AdMob, iOS/Android only — no web support) and `react-native-purchases ^9.10.5` (RevenueCat, iOS/Android with web via separate Stripe billing). Both require a dev build — neither works in Expo Go. The AdMob SDK must be isolated behind platform-specific file extensions (`.native.tsx`) from day one or the web build will break. RevenueCat is strongly preferred over raw `react-native-iap` because it handles receipt validation, cross-platform entitlement sync, and webhook delivery to Supabase out of the box.

**Core technologies:**
- `useBreakpoint()` hook (hand-rolled, 20 lines): breakpoint detection at `mobile < 768 / tablet < 1440 / web >= 1440` — no external library needed
- `expo-router/ui` (already installed): custom tab/sidebar layouts; use `.web.tsx` platform extensions for sidebar vs. tab-bar layouts
- `lucide-react-native ^0.475.0` + `react-native-svg ~15.8.0`: icon set matching cookbook.pen designs exactly
- `@expo-google-fonts/dm-sans` + `@expo-google-fonts/bricolage-grotesque`: fonts matching `.pen` `$font-body` and `$font-display` tokens
- `expo-image ~2.0.0`: cached image rendering for recipe thumbnails (signed URL cache invalidation handled automatically)
- `react-native-google-mobile-ads ^14.0.0`: AdMob banner ads, iOS/Android only; requires dev build and ATT permission prompt on iOS
- `react-native-purchases ^9.10.5`: RevenueCat IAP + subscription management with Supabase webhook integration
- Hand-coded `src/lib/responsive/tokens.ts`: all 20 cookbook.pen `$` variables as TypeScript constants — no design token pipeline needed

### Expected Features

**Must have (P1 — v1.1 complete):**
- Design token system (JS constants from cookbook.pen `$` variables) — gates all screen work
- `useBreakpoint()` hook (390/768/1440 breakpoints) — gates all responsive layouts
- Adaptive navigation: bottom tab bar (mobile/tablet), 260px fixed sidebar (web)
- Home screen rebuilt as a real dashboard with quick-access to Scan, Recipes, Collections, Family
- All existing screens rebuilt to cookbook.pen spec at all 3 breakpoints (8 screens)
- 5 missing screen designs created before implementation: Sign Up, Forgot Password, Profile/Settings, Invite, Draft Review
- Public recipe browsing list (unauthenticated, `visibility = 'public'` only)
- Public recipe detail (read-only, attribution, Sign In CTA)
- Photo thumbnails wired into recipe list cards (Supabase Storage URLs + expo-image)
- Scan photo displayed in draft review screen

**Should have (P2 — if P1 stable, may slip to v1.2):**
- Ad placement on public browsing screens (AdMob on native, static placeholders or AdSense on web)
- Subscription gating on scan feature via RevenueCat (requires dev build setup + paywall UI)

**Defer (v2+):**
- Recipe structured data markup (schema.org/Recipe) for SEO
- Affiliate ingredient links (meaningful only at significant traffic volume)
- Grocery list integration (separate product validation needed first)
- Web subscriptions via RevenueCat Web Billing / Stripe (defer until native subscription hypothesis validated)

**Anti-features to avoid:**
- Ads visible to authenticated users — destroys family vault trust proposition
- Interstitial/full-screen ads — breaks cooking flow, violates AdMob best practices
- Auto-redirect unauthenticated users to login — blocks organic discovery and SEO crawlers
- Paywall at cold start — users must experience scan value before being asked to pay
- Bottom tab bar replicated on web — web users find it jarring and keyboard-inaccessible

### Architecture Approach

The architecture splits cleanly into three route groups: `(tabs)/` for authenticated flows, `(public)/` for unauthenticated recipe browsing, and `(auth)/` for login/signup flows (unchanged from v1.0). The biggest structural change in v1.1 is converting the root navigation from a flat Stack to a Tabs group — this enables the breakpoint-aware tab bar / sidebar layout. The `(tabs)/_layout.tsx` reads `useBreakpoint()` and renders either a `MobileTabBar`, a `TabletHeader`, or a `WebSidebar` with `<Slot>`. The `(public)/` group has its own layout with a `PublicNavBar` (logo + Sign In CTA) and never shows authenticated chrome.

**Major components:**
1. `useBreakpoint()` — single breakpoint hook at `src/lib/responsive/useBreakpoint.ts`; all layout decisions import this; never use `Platform.select` for responsive layouts (static on web, does not react to window resize)
2. `tokens.ts` — single source of truth for all colors, spacing, radii, fonts from cookbook.pen; all screens import from here, zero inline magic numbers
3. `(tabs)/_layout.tsx` — breakpoint-aware navigation root; renders MobileTabBar / TabletHeader / WebSidebar conditionally
4. `(public)/` route group — unauthenticated recipe browse + detail; queries Supabase with anon key; RLS `visibility = 'public'` policy already enforces access without new policies
5. `AdSlot` component — appears only inside `(public)/` screens; session-checks defensively and returns null for authenticated users; platform-branched `.native.tsx` / `.web.tsx` to isolate AdMob SDK from web bundle
6. `SubscriptionGate` — layout-level wrapper around `(scan)/_layout.tsx`; reads `profiles.scan_entitlement` boolean initially (Supabase), upgrades to RevenueCat entitlement in the monetization phase; must be feature-flag bypassable

### Critical Pitfalls

1. **StyleSheet.create styles do not react to browser resize** — All dimension-sensitive values must be computed inside components from `useWindowDimensions()`, not cached in module-level `StyleSheet.create`. Static styles (colors, radii) can stay in StyleSheet.create; anything breakpoint-sensitive must be derived via `useBreakpoint()`. Establish this pattern in the first responsive component and enforce project-wide before any screen work begins.

2. **Design-to-code drift across 9 screens x 3 breakpoints** — Extract all cookbook.pen `$` tokens into `tokens.ts` before writing any screen code. All 5 missing screen designs must be completed in cookbook.pen before their implementation begins. Run a design review after screens 1-2 to catch drift early; recovery cost is HIGH if drift bakes across 14+ screens.

3. **AdMob SDK breaks web build if not platform-branched from the start** — `react-native-google-mobile-ads` has no web support and any file that imports it will fail `expo export --platform web`. Define `AdSlot.native.tsx` and `AdSlot.web.tsx` before writing any ad logic. Confirm `expo export --platform web` succeeds before the ads phase begins.

4. **FlatList vertical scroll broken inside flex:1 containers on web** — react-native-web's FlatList has a known, longstanding issue with height resolution in flex containers. Fix: use `flexGrow: 1, flexBasis: 0` instead of `flex: 1`, or switch to `ScrollView` + `map()` on web (FlatList virtualization has no benefit on web). Also set `key={numColumns}` on FlatList whenever `numColumns` changes via breakpoint.

5. **Subscription gate too rigid for a hypothesis** — Implement gating via a `useEntitlement()` hook that reads from Supabase `profiles.scan_entitlement` initially, not a hardcoded route redirect. This allows the gate to be toggled server-side without a code deploy, enables A/B testing, and provides a migration path to RevenueCat without changing navigation code.

6. **expo-image-picker permission call silently fails on web** — `requestMediaLibraryPermissionsAsync()` must be wrapped in a `Platform.OS !== 'web'` check. On web, `launchImageLibraryAsync` uses a standard `<input type="file">` and requires no permission. Fix this before any subscription gating work touches the scan upload component.

## Implications for Roadmap

Based on the dependency graph from FEATURES.md and the build order recommendation from ARCHITECTURE.md, the following 6-phase structure is recommended:

### Phase 1: Foundation — Tokens, Breakpoints, Fonts
**Rationale:** Every other phase depends on this. The breakpoint hook, design tokens, and font loading are zero-risk additive changes that unlock all subsequent screen work. This phase can be validated in isolation before any screen is rebuilt.
**Delivers:** `tokens.ts`, `useBreakpoint()` hook, font loading in root layout, `app.json` orientation unlock
**Addresses:** Design-to-code drift pitfall (Pitfall 8 from PITFALLS.md), StyleSheet.create resize pitfall (Pitfall 1)
**Avoids:** Shadow inconsistency — shadow tokens established here propagate everywhere
**Research flag:** No research needed — established patterns with official Expo docs

### Phase 2: Navigation Restructure — Tabs Group + Adaptive Nav
**Rationale:** Converting from flat Stack to Tabs group is the structural prerequisite for all screen implementations. Doing this before screen work ensures all subsequent files land in the correct route group. The three navigation components (MobileTabBar, TabletHeader, WebSidebar) are the highest-risk components in v1.1 and should be proven before any screen content is added to them.
**Delivers:** `(tabs)/_layout.tsx` with breakpoint-aware nav, `MobileTabBar`, `TabletHeader`, `WebSidebar`, `NavItem`, `PageContainer`, root redirect from `app/index.tsx`
**Implements:** Route group separation pattern; tab-to-sidebar navigation transition
**Avoids:** Persistent bottom tab bar on web (anti-feature), hamburger menu on mobile (anti-feature)
**Research flag:** No research needed — Expo Router custom tabs are well-documented; all architectural decisions already resolved in ARCHITECTURE.md

### Phase 3: Home Screen + Core Authenticated Screens
**Rationale:** The home screen validates the full token/breakpoint/font/navigation pipeline end-to-end before committing to rebuilding all other screens. Core recipe screens (list, detail, create, edit) are highest-value and highest-usage and represent the bulk of implementation work.
**Delivers:** Rebuilt home dashboard, recipe list with photo thumbnails + responsive grid (1/2/3-col), recipe detail with responsive layout, create/edit forms with centered max-width on web
**Addresses:** Home screen navigation gap (features undiscoverable in v1.0), photo thumbnails in recipe lists, scan photo in draft review
**Avoids:** FlatList scroll broken on web (Pitfall 3), iOS-only clearButtonMode (Pitfall 4), hardcoded `Dimensions.get("window")` percentage calculations (ARCHITECTURE.md anti-pattern 3)
**Research flag:** No research needed for screen rebuilds — patterns established in Phases 1-2; draft review split-pane layout may need a quick implementation spike

### Phase 4: Public Browsing Surface
**Rationale:** Public browsing is a new unauthenticated surface requiring its own route group, layout, and data access layer. It depends on the token/breakpoint/nav foundation but is independent of monetization. Shipping before ads ensures the surface exists before attempting ad integration.
**Delivers:** `(public)/` route group, `PublicNavBar`, public recipe list with search + filter chips, public recipe detail with attribution, Sign In CTA, `searchPublicRecipes()` with cursor-based pagination
**Addresses:** Public recipe attribution, Sign In prompt in public header, unauthenticated browse
**Avoids:** Auto-redirect unauthenticated users (anti-feature), public attribution leaking raw email (security — use `display_name`), anon key accidentally querying private recipes (belt-and-suspenders filter on `visibility = 'public'` beyond RLS)
**Research flag:** Light research recommended on cursor-based pagination approach for Supabase public recipe queries — the current search implementation was not designed for public-scale browsing

### Phase 5: Remaining Screens
**Rationale:** Collections, Family, Settings, auth screens, and scan/draft screens can ship after core recipe screens are validated. These have lower usage frequency and some (auth screens) have limited responsive requirements. The 5 missing designs must exist in cookbook.pen before implementation begins.
**Delivers:** Collections list/detail, family management screens, settings, auth screens rebuilt to cookbook.pen spec, invite screen, scan upload responsive layout, draft review split-pane on web
**Addresses:** All 5 missing screen designs (Sign Up, Forgot Password, Profile/Settings, Invite, Draft Review) — designs must precede implementation
**Avoids:** Developer-designed screens (PITFALLS.md Pitfall 8 — the most dangerous pattern; those 5 screens will never match the others if designed in code)
**Research flag:** No research needed; patterns identical to Phase 3 screen rebuilds

### Phase 6: Monetization — Ads + Subscription
**Rationale:** Ads and subscription gating are deliberately last because they require dev builds, have external service dependencies (AdMob account, RevenueCat project), and carry the most integration risk. By this phase all screens are stable and the public browsing surface exists, making ad placement straightforward. Subscription gating can be enabled via the Supabase entitlement flag before RevenueCat is wired, allowing paywall UI development and testing independently of real IAP.
**Delivers:** `AdSlot.native.tsx` + `AdSlot.web.tsx` (platform-branched), AdMob integration on public browse screens, `SubscriptionGate` component, RevenueCat SDK integration, paywall UI, `expo-tracking-transparency` ATT prompt on iOS
**Addresses:** Ad placement on public screens, subscription gating on scan feature
**Avoids:** AdMob SDK breaking web build (Pitfall 6), hardcoded subscription gate (Pitfall 7), ads visible to authenticated users (anti-feature), subscription state not unified across platforms (RevenueCat `appUserID` = Supabase `user.id` on all platforms)
**Research flag:** Deeper research needed before Phase 6 planning — AdMob config plugin behavior on Expo SDK 52 (MEDIUM confidence flag), RevenueCat web billing requires separate Stripe product configuration that is not covered by `react-native-purchases`, ATT prompt placement on iOS is policy-sensitive

### Phase Ordering Rationale

- Phases 1-2 are non-negotiable prerequisites: tokens/breakpoints gate all screen work; nav restructure gates all screen file locations
- Phase 3 before Phase 4 because recipe screens validate the full pipeline; public browsing adds new data access complexity that should land on proven infrastructure
- Phase 5 after Phase 3 because auth/collections/settings are lower risk and benefit from patterns proven in core recipe screens
- Phase 6 last because it requires dev builds, external account setup (AdMob app ID, RevenueCat project), and is a confirmed hypothesis — not blocking Phase 1-5 value delivery

### Research Flags

Phases needing deeper research during planning:
- **Phase 6 (Monetization):** AdMob config plugin on SDK 52 needs early validation; RevenueCat web billing architecture has documentation gaps; ATT prompt placement is policy-sensitive and should be researched before designing paywall UX

Phases with standard patterns (skip research-phase):
- **Phase 1 (Foundation):** Official Expo docs cover everything; tokens extracted directly from cookbook.pen
- **Phase 2 (Navigation):** Expo Router custom tabs well-documented; architecture decisions already resolved
- **Phase 3 (Core Screens):** Screen rebuilds follow patterns from Phases 1-2; no novel integration
- **Phase 4 (Public Browsing):** Supabase anon key + RLS is a known pattern; only pagination approach needs a quick decision
- **Phase 5 (Remaining Screens):** Same patterns as Phase 3

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Existing stack directly inspected; new packages verified on npm; all SDK 52 compatibility confirmed except AdMob config plugin (MEDIUM — reported issues on SDK 54, lower risk on SDK 52) |
| Features | HIGH | cookbook.pen design file inspected directly; AdMob guidelines from official policy; RevenueCat patterns from official Expo blog |
| Architecture | HIGH | Existing codebase audited directly; Expo Router patterns from official docs; route group separation is a proven pattern |
| Pitfalls | HIGH | Most pitfalls identified via direct codebase audit (StyleSheet.create, clearButtonMode, FlatList, image picker); web build risk for AdMob verified from official library docs |

**Overall confidence:** HIGH for responsive layout and public browsing phases; MEDIUM for monetization phase (AdMob config plugin on SDK 52 has a flag; RevenueCat web billing is newer territory)

### Gaps to Address

- **Tablet navigation (768px) design is ambiguous:** cookbook.pen shows a top header at 768px but the exact nav pattern is unresolved (hamburger? mini sidebar? icon-only tabs?). This is flagged as a design gap in FEATURES.md. Must be resolved in cookbook.pen before implementing `TabletHeader` in Phase 2.
- **AdMob config plugin on SDK 52:** STACK.md flags a reported issue on SDK 54; current project is SDK 52 which is lower risk — verify the config plugin behavior early in Phase 6 before proceeding with full ad integration.
- **RevenueCat web billing:** Web subscriptions require separate Stripe product configuration in the RevenueCat dashboard. Architecture plan defers web subscriptions to v2+; if this changes, entitlement unification across native and web (using Supabase `user.id` as RevenueCat `appUserID` on all platforms) must be configured from day one — retrofitting is painful.
- **Public recipe pagination:** The v1.0 recipes API was not designed for public browsing at scale. A composite index `(visibility, created_at DESC)` and cursor-based pagination should be added to `searchPublicRecipes()` before the public browsing screen is considered shippable.
- **5 missing screen designs:** Sign Up, Forgot Password, Profile/Settings, Invite, and Draft Review do not exist in cookbook.pen. These must be designed and reviewed for consistency before Phase 5 implementation begins. No developer should design these in code.

## Sources

### Primary (HIGH confidence)
- cookbook.pen design file (direct inspection) — all design tokens, breakpoints, component specs, screen layouts at 3 breakpoints
- Expo SDK 52 codebase (direct audit) — existing patterns, specific files with pitfalls identified
- [Expo Router custom tabs](https://docs.expo.dev/router/advanced/custom-tabs/) — tab bar and sidebar patterns
- [Expo Router protected routes](https://docs.expo.dev/router/advanced/protected/) — route group auth boundary pattern
- [RevenueCat for Expo](https://expo.dev/blog/expo-revenuecat-in-app-purchase-tutorial) — official Expo blog endorsement and tutorial
- [Google AdMob banner guidelines](https://support.google.com/admob/answer/6128877) — ad placement rules
- [react-native-purchases npm](https://www.npmjs.com/package/react-native-purchases) — version 9.10.5 confirmed current as of 2026-03-03

### Secondary (MEDIUM confidence)
- [react-native-google-mobile-ads docs](https://docs.page/invertase/react-native-google-mobile-ads) — no web support confirmed; config plugin requirements
- [RevenueCat cross-platform subscriptions](https://www.revenuecat.com/blog/engineering/cross-platform-subscriptions-ios-android-web/) — web billing architecture
- [Expo in-app purchases guide](https://docs.expo.dev/guides/in-app-purchases/) — official Expo recommendation of RevenueCat
- [Lucide React Native](https://lucide.dev/guide/packages/lucide-react-native) — react-native-svg peer dep; React 19 peer dep issue (not relevant for SDK 52)
- [Expo Media Queries blog](https://blog.expo.dev/media-queries-with-react-native-for-ios-android-and-web-e0b73ed5777b) — useWindowDimensions responsive pattern
- [react-native-web FlatList scroll issue #1436](https://github.com/necolas/react-native-web/issues/1436) — confirmed longstanding bug

### Tertiary (LOW confidence)
- [NativeWind + Expo SDK 54 issues](https://medium.com/@matthitachi/nativewind-styling-not-working-with-expo-sdk-54-54488c07c20d) — single source; informs decision to avoid NativeWind
- [StyleSheet.create caching on web](https://bendyworks.com/blog/implementing-react-native-responsive-design-part-2/) — confirms cached styles do not update on resize
- Bootstrapped Ventures (recipe SEO patterns) — practitioner blog; public browsing funnel rationale

---
*Research completed: 2026-03-03*
*Ready for roadmap: yes*
