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

# Architecture Research

**Domain:** Family recipe vault — responsive design + deferred features integration
**Researched:** 2026-03-03
**Confidence:** HIGH (existing code inspected directly; patterns from official Expo docs)

---

## What This Document Covers

This is a v1.1 integration-focused update to the original v1.0 architecture file. It answers:

1. How responsive mobile/tablet/web layouts integrate with the existing Expo Router architecture
2. How breakpoint detection should work
3. How the tab bar to sidebar navigation transition works across breakpoints
4. How public browsing routes integrate alongside authenticated routes
5. Where ads and subscription checks fit in the component tree
6. How design tokens are extracted from cookbook.pen and consumed in code

---

## Current Architecture State (v1.0 Baseline)

### Router Structure (as-built)

```
app/
  _layout.tsx              Stack root + SessionProvider
  index.tsx                Home (placeholder with link list)
  settings.tsx             Settings (flat, no group)
  (auth)/
    _layout.tsx            Stack group — login/signup/password flows
    login.tsx
    signup.tsx
    forgot-password.tsx
    reset-password.tsx
    logout.tsx
  (family)/
    _layout.tsx            Stack group
    index.tsx              Family list
    family/[id].tsx        Family detail + member management
  (scan)/
    _layout.tsx            Stack group
    index.tsx              Scan upload
    draft/[id].tsx         Draft review + edit
  invite/
    [token].tsx            Invite accept (unauthenticated-capable)
  recipes/
    index.tsx              Recipe list (search + filter)
    [id].tsx               Recipe detail (session-aware)
    [id]/edit.tsx          Edit recipe (owner only)
    create.tsx             Create recipe
  collections/
    index.tsx              Collections list
    [id].tsx               Collection detail
    create.tsx             Create collection
```

### Critical v1.0 Facts for Integration

- All navigation uses `Stack` (no `Tabs` group exists yet)
- `SessionProvider` wraps the root Stack — session is available app-wide
- No Tabs layout in the current codebase — home screen (`app/index.tsx`) is a plain link list
- Inline `StyleSheet.create()` objects throughout — no shared design token file
- `useWindowDimensions` is NOT currently used anywhere
- Navigation is entirely discoverable via the home link list (known gap)
- `app.json` has `"orientation": "portrait"` — this needs to change for web/tablet

---

## v1.1 Target Architecture

### System Overview

```
┌────────────────────────────────────────────────────────────────────┐
│                      Root Layout (_layout.tsx)                      │
│  SessionProvider + ThemeProvider + FontProvider                     │
├────────────────────────────────────────────────────────────────────┤
│                    ResponsiveShell component                        │
│  useBreakpoint() → mobile | tablet | web                           │
│                                                                     │
│  mobile (< 768px)    tablet (768–1439px)    web (>= 1440px)         │
│  ┌──────────────┐    ┌────────────────────┐  ┌───────────────────┐  │
│  │  Tabs layout │    │  Tabs + top header │  │ Sidebar + content │  │
│  │  (5 tab bar) │    │  (no bottom bar)   │  │  (260px fixed)    │  │
│  └──────────────┘    └────────────────────┘  └───────────────────┘  │
├────────────────────────────────────────────────────────────────────┤
│                    Route Groups                                     │
│                                                                     │
│  (tabs)/            — authenticated tab root                        │
│  (public)/          — unauthenticated browsing (recipes only)       │
│  (auth)/            — login, signup, password flows                 │
│  (scan)/            — scan pipeline (subscription-gated)            │
├────────────────────────────────────────────────────────────────────┤
│                    Feature Modules (src/features/)                  │
│  auth  family  recipes  scan  collections  comments  ratings  units │
├────────────────────────────────────────────────────────────────────┤
│              Backend (Supabase — unchanged from v1.0)              │
│  Auth | Database (RLS) | Storage | Edge Functions | Realtime       │
└────────────────────────────────────────────────────────────────────┘
```

---

## Breakpoint Detection

### Pattern: Single `useBreakpoint` Hook

Centralise all breakpoint logic here. Every screen that needs responsive layout imports this one hook.

```typescript
// src/lib/responsive/useBreakpoint.ts
import { useWindowDimensions } from "react-native";

export type Breakpoint = "mobile" | "tablet" | "web";

const BREAKPOINTS = {
  tablet: 768,
  web: 1440,
} as const;

export function useBreakpoint(): Breakpoint {
  const { width } = useWindowDimensions();
  if (width >= BREAKPOINTS.web) return "web";
  if (width >= BREAKPOINTS.tablet) return "tablet";
  return "mobile";
}

export function useIsTabletOrAbove(): boolean {
  const bp = useBreakpoint();
  return bp === "tablet" || bp === "web";
}
```

**Why `useWindowDimensions` over `Platform.select`:**
`Platform.select` returns a static value at render time; `useWindowDimensions` re-renders when the window resizes (essential for web). This is the correct pattern for responsive Expo web apps.

**Breakpoints match cookbook.pen exactly:** 390px mobile, 768px tablet, 1440px web.

---

## Responsive Layout Architecture

### The `(tabs)` Route Group (new)

The biggest structural change in v1.1 is converting the root navigation from Stack to a Tabs group. This is what enables the tab bar on mobile and the sidebar on web.

**New file: `app/(tabs)/_layout.tsx`**

```typescript
// app/(tabs)/_layout.tsx
import { Tabs } from "expo-router";
import { useBreakpoint } from "@/lib/responsive/useBreakpoint";
import { MobileTabBar } from "@/components/navigation/MobileTabBar";
import { WebSidebar } from "@/components/navigation/WebSidebar";
import { TabletHeader } from "@/components/navigation/TabletHeader";

export default function TabsLayout() {
  const breakpoint = useBreakpoint();

  if (breakpoint === "web") {
    // Web: render sidebar + Slot directly (no Tabs component)
    return <WebSidebarLayout />;
  }

  // Mobile + tablet: use Expo Router Tabs
  return (
    <Tabs
      tabBar={(props) =>
        breakpoint === "mobile" ? (
          <MobileTabBar {...props} />
        ) : (
          null  // tablet: header-based nav, no bottom bar
        )
      }
      screenOptions={{ headerShown: breakpoint === "tablet" }}
    >
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="recipes" options={{ title: "Recipes" }} />
      <Tabs.Screen name="scan" options={{ title: "Scan" }} />
      <Tabs.Screen name="collections" options={{ title: "Collections" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
    </Tabs>
  );
}
```

### Navigation Per Breakpoint

| Breakpoint | Navigation Pattern | Implementation |
|------------|--------------------|----------------|
| Mobile (< 768px) | Bottom tab bar (5 tabs) | Custom `MobileTabBar` component |
| Tablet (768–1439px) | Top header bar with nav icons | `TabletHeader` component, `tabBar={null}` in Tabs |
| Web (>= 1440px) | Fixed left sidebar (260px) | `WebSidebar` + `Slot` outside Tabs |

### Tab Items (from cookbook.pen Component/TabBar)

The design shows 5 tabs:
1. Home (`layout-grid` icon) — `(tabs)/index`
2. Recipes (`book-open` icon) — `(tabs)/recipes`
3. Scan (`camera` icon) — `(tabs)/scan` (gated)
4. Collections (`heart` icon) — `(tabs)/collections`
5. Profile (`user` icon) — `(tabs)/profile`

### Sidebar Items (from cookbook.pen Home - Web sidebar)

The sidebar shows labeled nav items with active state (warm fill):
- Home, My Recipes, Scan Recipe, Collections, Family, Profile/Settings

---

## File Structure Changes

### New Files Required

```
app/
  (tabs)/
    _layout.tsx            NEW — Tabs root with breakpoint-aware nav
    index.tsx              MOVED from app/index.tsx (home screen)
    recipes.tsx            NEW — thin shell re-exporting recipes/index
    scan.tsx               NEW — thin shell re-exporting (scan)/index
    collections.tsx        NEW — thin shell re-exporting collections/index
    profile.tsx            NEW — profile/settings screen

  (public)/
    _layout.tsx            NEW — public browsing wrapper (no auth required)
    recipes/
      index.tsx            NEW — public recipe browse list
      [id].tsx             NEW — public recipe detail

src/
  lib/
    responsive/
      useBreakpoint.ts     NEW — breakpoint hook
      tokens.ts            NEW — design tokens from cookbook.pen variables
    theme/
      index.ts             NEW — theme context (optional, if dark mode needed)

  components/
    navigation/
      MobileTabBar.tsx     NEW — 5-tab bottom bar
      TabletHeader.tsx     NEW — horizontal header nav for tablet
      WebSidebar.tsx       NEW — 260px fixed sidebar for web
      NavItem.tsx          NEW — shared nav item (icon + label + active state)

    layout/
      PageContainer.tsx    NEW — max-width centering shell for web
      AdSlot.tsx           NEW — ad unit wrapper (public screens only)
      SubscriptionGate.tsx NEW — wraps scan feature, checks entitlement
```

### Modified Files

```
app/_layout.tsx            ADD FontProvider, ADD ThemeProvider, KEEP SessionProvider
app/(auth)/_layout.tsx     KEEP — no changes needed
app/(family)/_layout.tsx   KEEP — no changes needed
app/(scan)/_layout.tsx     KEEP — subscription check added at entry
app/index.tsx              REPLACE with redirect to (tabs)/index
app.json                   REMOVE "orientation": "portrait" (blocks landscape tablet/web)
```

---

## Design Token Extraction

### From cookbook.pen `variables` block

All tokens are defined in the `.pen` file's `variables` section. Extract them verbatim as a TypeScript constant. This is the source of truth — do not invent values.

```typescript
// src/lib/responsive/tokens.ts

export const colors = {
  // Accents
  accentWarm: "#E8784E",      // primary CTA, active nav items
  accentBlue: "#007AFF",      // legacy (v1.0); retire in v1.1
  accentCoral: "#FF6B6B",
  accentGreen: "#22C55E",
  accentYellow: "#FCD34D",

  // Backgrounds
  bgPage: "#FFFFFF",
  bgCard: "#F6F7F8",
  bgCardWarm: "#FFFBF5",

  // Borders
  borderDefault: "#E5E7EB",
  borderSubtle: "#F3F4F6",

  // Text
  textPrimary: "#1A1A1A",
  textSecondary: "#6B7280",
  textTertiary: "#9CA3AF",
  textDisabled: "#D1D5DB",
  white: "#FFFFFF",

  // Badge backgrounds
  badgeCoralBg: "#FFF1F0",
  badgeGreenBg: "#F0FDF4",
  badgeYellowBg: "#FFFBEB",
} as const;

export const radii = {
  sm: 12,
  md: 16,
  lg: 20,
  pill: 100,
} as const;

export const fonts = {
  display: "Bricolage Grotesque",  // headings, titles, wordmarks
  body: "DM Sans",                 // all body text, labels, navigation
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

// Breakpoints (pixels, same as cookbook.pen frame widths)
export const breakpoints = {
  tablet: 768,
  web: 1440,
} as const;
```

### Font Loading

Both fonts are Google Fonts available via `@expo-google-fonts`:

```bash
npx expo install @expo-google-fonts/bricolage-grotesque @expo-google-fonts/dm-sans expo-font
```

Load in `app/_layout.tsx` before rendering:

```typescript
import { useFonts } from "expo-font";
import { BricolageGrotesque_700Bold } from "@expo-google-fonts/bricolage-grotesque";
import { DMSans_400Regular, DMSans_500Medium, DMSans_600SemiBold } from "@expo-google-fonts/dm-sans";
import * as SplashScreen from "expo-splash-screen";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    "Bricolage Grotesque": BricolageGrotesque_700Bold,
    "DM Sans": DMSans_400Regular,
    "DM Sans Medium": DMSans_500Medium,
    "DM Sans SemiBold": DMSans_600SemiBold,
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <SessionProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </SessionProvider>
  );
}
```

---

## Public Browsing Route Architecture

### The Problem

v1.0 has no public routes. Authenticated session gates everything in `recipes/index` via `useSession`. Public browsing must be available to unauthenticated users, but the recipe detail screen already handles the unauthenticated case partially (shows "log in to comment").

### The Solution: `(public)` Route Group

Separate public browsing into its own group with its own layout. This keeps auth-gated routes clean and makes the public surface explicit.

```
app/
  (public)/
    _layout.tsx       — No auth check; shows pubNavBar (back + sign-in CTA)
    recipes/
      index.tsx       — Public recipe browse (visibility = 'public' only, no auth)
      [id].tsx        — Public recipe detail (read-only, shows sign-in CTA for comments)
```

### How Auth + Public Route Coexist

```
app/
  (tabs)/
    recipes/index.tsx    AUTHENTICATED list (all visibility levels user can see)
    recipes/[id].tsx     AUTH-AWARE detail (edit/delete/rate if owner, comments if logged in)

  (public)/
    recipes/index.tsx    UNAUTHENTICATED list (public visibility only, no family filter)
    recipes/[id].tsx     UNAUTHENTICATED detail (read-only, sign-in CTAs)
```

**Data access:** The public routes query Supabase without a session token. RLS on the `recipes` table already permits `visibility = 'public'` for `anon` role. No new RLS policies required — this is the existing `public_recipes` RLS policy.

**Navigation flow:**
- Unauthenticated user arrives → lands on `(public)/recipes` (or home screen with "Browse Public Recipes" CTA)
- Clicks "Sign In" → navigates to `(auth)/login`
- After login → redirects to `(tabs)/index`

### Public Layout (`app/(public)/_layout.tsx`)

```typescript
export default function PublicLayout() {
  return (
    <Stack
      screenOptions={{
        header: () => <PublicNavBar />,  // logo + "Sign In" CTA
        headerShown: true,
      }}
    />
  );
}
```

### Attribution

Public recipe detail shows `"Added by [profile.display_name]"`. The `profiles` table has `visibility = 'public'` for family members (from v1.0 RLS policy that allows family members to see each other's profiles). For public recipe attribution, the query joins `recipes` with `profiles` on `owner_user_id` — this works because public recipe authors implicitly opt into attribution when they set visibility = 'public'.

---

## Ads Integration

### Placement Decision

Ads appear **only on public browsing screens**. Never in authenticated family flows. This matches cookbook.pen designs (no ad elements on any authenticated screen) and is explicitly out of scope for v1.0 per the constraints.

### Component Tree Position

```
(public)/
  _layout.tsx
    PublicLayout
      ↓
  recipes/index.tsx
    PublicBrowseScreen
      SearchBar
      RecipeGrid
      AdSlot               ← injected between recipe sections, not modal/overlay
        BannerAd           ← react-native-google-mobile-ads BannerAd
  recipes/[id].tsx
    PublicRecipeDetail
      HeroImage
      RecipeBody
      AdSlot               ← after ingredients, before steps
      SignInCTA            ← instead of CommentThread
```

### Library Choice

Use `react-native-google-mobile-ads` (Invertase). This is the actively maintained successor to `@react-native-firebase/admob`. It works with Expo dev builds (requires `expo-dev-client`, not compatible with Expo Go).

```typescript
// src/components/layout/AdSlot.tsx
import { BannerAd, BannerAdSize, TestIds } from "react-native-google-mobile-ads";
import { useSession } from "@/features/auth/session";

const AD_UNIT_ID = __DEV__
  ? TestIds.BANNER
  : "ca-app-pub-XXXXXXXX/YYYYYYYY";  // configure per platform

export function AdSlot() {
  const { session } = useSession();

  // Never show ads to authenticated users
  if (session) return null;

  return (
    <BannerAd
      unitId={AD_UNIT_ID}
      size={BannerAdSize.BANNER}
      requestOptions={{ requestNonPersonalizedAdsOnly: true }}
    />
  );
}
```

**Important:** Ads are conditionally null for authenticated sessions even if somehow `AdSlot` renders in an auth context. Defense in depth.

---

## Subscription Gating (Scan Feature)

### Placement Decision

The scan feature entitlement check belongs at the **layout level** of `(scan)/`, not scattered in individual screens. This means the check fires once when the user enters the scan group.

### Component Tree Position

```
app/
  (scan)/
    _layout.tsx           — SubscriptionGate wraps the Stack
      SubscriptionGate
        Stack
          index.tsx       — Upload screen
          draft/[id].tsx  — Draft review
```

### Gate Implementation

```typescript
// app/(scan)/_layout.tsx
import { Stack, router } from "expo-router";
import { SubscriptionGate } from "@/components/layout/SubscriptionGate";

export default function ScanLayout() {
  return (
    <SubscriptionGate feature="scan" onDenied={() => router.replace("/paywall")}>
      <Stack screenOptions={{ headerTitle: "Recipe Scanner" }} />
    </SubscriptionGate>
  );
}
```

```typescript
// src/components/layout/SubscriptionGate.tsx
import { useEntitlement } from "@/features/subscription/useEntitlement";

interface Props {
  feature: "scan";
  onDenied: () => void;
  children: React.ReactNode;
}

export function SubscriptionGate({ feature, onDenied, children }: Props) {
  const { hasEntitlement, isLoading } = useEntitlement(feature);

  if (isLoading) return <LoadingScreen />;
  if (!hasEntitlement) {
    onDenied();
    return null;
  }

  return <>{children}</>;
}
```

### Entitlement Source

Use RevenueCat (`react-native-purchases`) for mobile IAP and Stripe for web. The `useEntitlement` hook abstracts this:

```typescript
// src/features/subscription/useEntitlement.ts
import { Platform } from "react-native";

export function useEntitlement(feature: "scan") {
  // Phase 1: read from user profile table (Supabase column `scan_entitlement: boolean`)
  // This allows server-side granting for beta/testing without IAP setup
  // Phase 2: replace with RevenueCat SDK check on native, Stripe on web
}
```

**Phase strategy:** Start with a Supabase `profiles.scan_entitlement` boolean column. Gate via this. Wire up RevenueCat/Stripe in a dedicated monetization phase.

---

## Home Screen Navigation Fix

### Current Problem

`app/index.tsx` is a "Phase 1 foundation" placeholder with a link list. Features like recipes and families are undiscoverable unless you know to tap the links.

### v1.1 Solution

The home screen becomes a real dashboard in `app/(tabs)/index.tsx` with:
- Quick-action cards: "Scan Recipe", "Browse Recipes", "My Family"
- Recent recipes section (last 3-4)
- Public recipe teaser (if no session)

`app/index.tsx` is replaced with a redirect:

```typescript
// app/index.tsx (v1.1 — just a redirect)
import { Redirect } from "expo-router";

export default function Root() {
  return <Redirect href="/(tabs)" />;
}
```

---

## Responsive Content Width

On web at 1440px, content in the main area (right of sidebar) should not stretch to fill all remaining width. The design shows a centered content column.

```typescript
// src/components/layout/PageContainer.tsx
import { useBreakpoint } from "@/lib/responsive/useBreakpoint";

const MAX_CONTENT_WIDTH = {
  mobile: undefined,     // full width
  tablet: undefined,     // full width within tab content
  web: 900,             // max-width within sidebar content area
};

export function PageContainer({ children, style }: Props) {
  const bp = useBreakpoint();
  const maxWidth = MAX_CONTENT_WIDTH[bp];

  return (
    <View style={[styles.container, maxWidth ? { maxWidth, alignSelf: "center", width: "100%" } : {}, style]}>
      {children}
    </View>
  );
}
```

---

## Data Flow Changes

### Existing Flow (unchanged)

```
[Authenticated User Action]
  ↓
[Screen] → [Feature API (src/features/*/api.ts)] → [Supabase client]
  ↓                                                       ↓
[State (useState)] ←───────────── [RLS-filtered results] ←┘
```

### New Public Flow

```
[Unauthenticated User Browses]
  ↓
[(public)/recipes/index.tsx] → [searchPublicRecipes()] → [Supabase anon key]
  ↓                                                              ↓
[State (useState)] ←────────────── [visibility='public' only] ←─┘
```

`searchPublicRecipes()` is a new function in `src/features/recipes/search.ts` that:
- Does NOT import the session
- Passes no auth headers (uses anon key)
- Filters `visibility = 'public'` explicitly (belt-and-suspenders over RLS)

### New Subscription Entitlement Flow

```
[User enters (scan) group]
  ↓
[SubscriptionGate]
  ↓
[useEntitlement("scan")] → [Supabase profiles.scan_entitlement]
  ↓
[allowed] → render scan screens
[denied]  → redirect to paywall route
```

---

## Integration Points: New vs Modified

### New Components (no existing code touched)

| Component | Location | Purpose |
|-----------|----------|---------|
| `useBreakpoint` | `src/lib/responsive/useBreakpoint.ts` | Breakpoint detection hook |
| `tokens.ts` | `src/lib/responsive/tokens.ts` | Design tokens from cookbook.pen |
| `MobileTabBar` | `src/components/navigation/MobileTabBar.tsx` | 5-tab bottom nav |
| `TabletHeader` | `src/components/navigation/TabletHeader.tsx` | Horizontal header nav |
| `WebSidebar` | `src/components/navigation/WebSidebar.tsx` | 260px fixed sidebar |
| `NavItem` | `src/components/navigation/NavItem.tsx` | Shared nav item component |
| `PageContainer` | `src/components/layout/PageContainer.tsx` | Max-width centering on web |
| `AdSlot` | `src/components/layout/AdSlot.tsx` | Ad unit (public only) |
| `SubscriptionGate` | `src/components/layout/SubscriptionGate.tsx` | Scan entitlement gate |
| `PublicNavBar` | `src/components/navigation/PublicNavBar.tsx` | Public page header + Sign In CTA |
| `(tabs)/_layout.tsx` | `app/(tabs)/_layout.tsx` | Breakpoint-aware tab/sidebar root |
| `(public)/_layout.tsx` | `app/(public)/_layout.tsx` | Public browsing layout |
| `(public)/recipes/index.tsx` | new screen | Public recipe browse |
| `(public)/recipes/[id].tsx` | new screen | Public recipe detail |

### Modified Files (existing code changed)

| File | Change | Risk |
|------|--------|------|
| `app/_layout.tsx` | Add FontProvider, font loading, keep SessionProvider | LOW — additive |
| `app/index.tsx` | Replace with `<Redirect href="/(tabs)" />` | LOW — one line |
| `app/(scan)/_layout.tsx` | Add SubscriptionGate wrapper | LOW — wraps existing Stack |
| `app.json` | Remove `"orientation": "portrait"` | LOW |
| `src/features/recipes/search.ts` | Add `searchPublicRecipes()` function | LOW — new export |

### Screens Needing Responsive Styles Applied

These screens exist and work but need their inline styles updated to use tokens and be breakpoint-aware. This is the bulk of v1.1 implementation work:

| Screen | Breakpoint Work Needed |
|--------|------------------------|
| `recipes/index.tsx` | Tablet: 2-column grid; Web: 3-column grid |
| `recipes/[id].tsx` | Web: two-column (recipe left, sidebar info right) |
| `recipes/create.tsx` | Web: centered form with max-width |
| `collections/index.tsx` | Tablet: 2-column; Web: 3-column |
| `(family)/index.tsx` | Web: list with detail panel |
| `(scan)/index.tsx` | Subscription gate + responsive photo picker |
| `(scan)/draft/[id].tsx` | Web: split-pane (photo left, draft right) |
| `settings.tsx` | Web: centered narrow form |

---

## Architectural Patterns

### Pattern 1: Breakpoint-Conditional Layout (not Platform.select)

**What:** Use `useBreakpoint()` returning `"mobile" | "tablet" | "web"` to conditionally render layout variants.

**When to use:** Any component that changes structure (not just styles) between breakpoints.

**Trade-offs:** Re-renders on window resize (correct and necessary for web). On native, `useWindowDimensions` is stable (orientation only, not arbitrary resize).

```typescript
function RecipeList() {
  const bp = useBreakpoint();
  const numColumns = bp === "web" ? 3 : bp === "tablet" ? 2 : 1;

  return (
    <FlatList
      numColumns={numColumns}
      key={numColumns}  // IMPORTANT: force remount when columns change
      ...
    />
  );
}
```

### Pattern 2: Route Group Separation for Auth Boundary

**What:** `(tabs)/` for authenticated flows, `(public)/` for unauthenticated browsing. Each group has its own `_layout.tsx` that applies different chrome (tab bar vs public nav bar).

**When to use:** When unauthenticated users need a different chrome/navigation wrapper than authenticated ones, with different data access requirements.

**Trade-offs:** Two sets of recipe screens. The trade-off is worth it because the data access patterns, chrome, and feature sets are genuinely different. Sharing would require conditional logic throughout.

### Pattern 3: Token File as Single Source of Truth

**What:** `src/lib/responsive/tokens.ts` holds all values extracted from cookbook.pen. Screens import from tokens, not from inline magic numbers.

**When to use:** Always, for every v1.1 screen touched. Do not introduce new magic color/spacing values.

**Trade-offs:** Requires discipline to not add new values inline. The benefit is that token changes propagate everywhere.

### Pattern 4: Gate at Layout, Not Screen

**What:** Subscription check in `(scan)/_layout.tsx`, not in `(scan)/index.tsx` or `(scan)/draft/[id].tsx`. Auth guard in `(tabs)/_layout.tsx` not per-screen.

**When to use:** When a group of screens shares the same access requirement.

**Trade-offs:** If a screen needs a different access rule, it cannot be in the same group. This is by design — move it to the right group.

---

## Anti-Patterns

### Anti-Pattern 1: Responsive via Platform.select

**What people do:** `Platform.select({ web: sidebarStyle, default: tabStyle })` to control layout.

**Why it's wrong:** Platform.select is static. A web user resizing their browser to tablet width does not get the tablet layout. On web you must use `useWindowDimensions`.

**Do this instead:** `useBreakpoint()` hook based on `useWindowDimensions`.

### Anti-Pattern 2: Inline Magic Numbers

**What people do:** `backgroundColor: "#E8784E"` inline in a StyleSheet.

**Why it's wrong:** Diverges from design over time. v1.0 has `#007AFF` (iOS blue) throughout; cookbook.pen uses `#E8784E` (warm accent) as the primary. Each new screen that uses `#007AFF` is technical debt.

**Do this instead:** Import from `tokens.colors.accentWarm`.

### Anti-Pattern 3: Hardcoded Dimensions in Photo Gallery

**What people do:** `width: Dimensions.get("window").width * 0.7` for photo carousel (present in `recipes/[id].tsx`).

**Why it's wrong:** On web the window is much wider. The 70% calculation produces a photo that is 1000px wide on a 1440px screen.

**Do this instead:** Use `PageContainer` max-width + percentage within that constrained width, or cap at a fixed px value on web.

### Anti-Pattern 4: Showing Ads in Auth Flows

**What people do:** Reuse `AdSlot` in a shared component that renders across both public and authenticated screens.

**Why it's wrong:** Family recipe privacy is the core promise. Ads in family flows break trust.

**Do this instead:** `AdSlot` checks `useSession()` and returns null if a session exists. Additionally, `AdSlot` only renders inside the `(public)/` route group by convention.

### Anti-Pattern 5: FlatList with Changing numColumns Without key Prop

**What people do:** Change `numColumns` on FlatList when breakpoint changes without changing the `key` prop.

**Why it's wrong:** FlatList does not support dynamic `numColumns`. React will log a warning and items may not re-layout.

**Do this instead:** Set `key={numColumns}` on the FlatList to force a full remount when columns change.

---

## Build Order Recommendation

Build in dependency order to avoid blocked work:

1. **Tokens + useBreakpoint** — Everything else depends on this. Zero risk, additive.

2. **Font loading** — Required before any screen can render with cookbook.pen typography. Additive to `_layout.tsx`.

3. **`(tabs)` route group + navigation components** — This restructures the root. Do this before any screen work so all subsequent screen work targets the correct group.

4. **Home screen** — First real screen with new design. Validates the token/breakpoint/font pipeline end-to-end.

5. **Responsive recipe screens** — Core feature screens. Highest usage, highest value.

6. **`(public)` route group + public screens** — New surface area with new data access. Depends on tokens/breakpoint being in place.

7. **Ad slots** — Depends on `(public)` screens existing.

8. **Subscription gate** — Depends on `(scan)` group (unchanged structure), entitlement mechanism.

9. **Remaining screens** — Create, edit, collections, family, settings, scan, draft.

---

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0–1k users | Current monolith + Supabase free/pro tier — fine as-is |
| 1k–100k users | Cache public recipe lists at CDN or Supabase edge; add `created_at` indexes for public browse pagination |
| 100k+ users | Public browse could be statically generated (Next.js or Expo static export); auth flows stay in Expo native |

### First Bottleneck: Public Recipe Browse

The unauthenticated public browse path will receive the most traffic (SEO, social sharing). It queries `recipes` with `visibility = 'public'`. Add a composite index `(visibility, created_at DESC)` if not already present.

---

## Sources

- Expo Router custom tabs docs: https://docs.expo.dev/router/advanced/custom-tabs/
- Expo Router protected routes: https://docs.expo.dev/router/advanced/protected/
- Expo Router UI (headless tabs): https://docs.expo.dev/versions/latest/sdk/router-ui/
- Authentication patterns: https://docs.expo.dev/router/advanced/authentication/
- react-native-google-mobile-ads: https://docs.page/invertase/react-native-google-mobile-ads
- RevenueCat + Expo ad-free subscriptions: https://www.revenuecat.com/blog/engineering/ad-free-subscriptions-in-react-native/
- Cookbook.pen design file (local): directly inspected for token values, breakpoints, navigation patterns, sidebar dimensions

---

*Architecture research for: v1.1 responsive design + deferred features integration*
*Researched: 2026-03-03*

# Stack Research

**Domain:** Responsive design + monetization additions to Expo/React Native family recipe app
**Researched:** 2026-03-03
**Confidence:** MEDIUM (versions verified via WebSearch npm; some SDK-specific compatibility is LOW confidence where Expo SDK 52 → SDK upgrade path is unclear)

---

## Context: What Already Exists (Do Not Re-Research)

The project runs on:
- `expo ^54.0.33` paired with `react-native 0.76.0` — this is **Expo SDK 52** (expo package version ≠ SDK version; SDK 52 targets RN 0.76)
- `expo-router ^4.0.22` — Expo Router v4 (file-based routing, already in place)
- `react-native-web ^0.21.0` — web renderer already installed
- `@supabase/supabase-js`, `expo-image-picker`, `react-native-safe-area-context`, `react-native-screens`

The stack additions below address ONLY what is missing for v1.1 goals.

---

## Recommended Stack Additions

### Responsive Layout System

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `useWindowDimensions` (React Native built-in) | N/A — built-in | Breakpoint detection at runtime | Already available in React Native; hook-based so updates when orientation/window changes; no extra package needed |
| Custom `useBreakpoint` hook (project-built) | N/A — hand-rolled | Named breakpoint abstraction (`mobile`/`tablet`/`web`) over raw pixel values | Centralizes the three breakpoints (390/768/1440) into one place; eliminates scattered magic numbers; 20 lines of code, zero dependency |

**Pattern:** Build a `useBreakpoint()` hook in `lib/hooks/useBreakpoint.ts` that wraps `useWindowDimensions` and returns `{ breakpoint: 'mobile' | 'tablet' | 'web', width }`. All layout decisions reference this. No external library needed — the design has exactly three breakpoints and no fluid grid.

**Do NOT add:** `react-native-responsive-screen`, `@expo/match-media`, or `react-native-media-query` — these add dependencies for what 20 lines of code can do given fixed breakpoints.

### Navigation Structure (Web Sidebar vs. Mobile Tabs)

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `expo-router/ui` (already installed via expo-router) | `^4.0.22` | Custom tab layout components for web sidebar | Ships with expo-router; unstyled, flexible — lets you render a sidebar at 1440px and a bottom tab bar at 390px from the same route config |

**Pattern:** Use platform-specific file extensions (`_layout.web.tsx` / `_layout.tsx`) or conditional rendering inside the layout based on `useBreakpoint()`. The .pen designs show: mobile = bottom nav bar, tablet = compact sidebar (implied), web = 260px left sidebar. Expo Router v4 custom tabs (`expo-router/ui`) support this without additional packages.

**Do NOT add:** A separate navigation library. Expo Router already owns navigation; adding React Navigation directly creates routing conflicts.

### Icons (Lucide — matching .pen designs)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `lucide-react-native` | `^0.475.0` | Icon components matching cookbook.pen icon set | All icon rendering throughout the app — .pen designs use lucide exclusively (`book-open`, `megaphone`, `arrow-right`, etc.) |
| `react-native-svg` | `~15.8.0` | SVG rendering required by lucide-react-native | Required peer dependency; check Expo SDK 52 compatibility table |

**Note on versions:** `lucide-react-native` 0.475.0+ has a React peer dependency issue (`^16.5.1 || ^17.0.0 || ^18.0.0`) when using React 19. Expo SDK 52 uses React 18.2.0, so this is NOT a problem for the current stack. If upgrading to SDK 54+ (React 19.1), use `--legacy-peer-deps` or wait for a lucide update. Confidence: MEDIUM (based on SDK 52 + React 18 compatibility, verified against reported issues).

### Typography (DM Sans + Bricolage Grotesque — from .pen design tokens)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@expo-google-fonts/dm-sans` | `^0.2.3` | Body font (`$font-body` in .pen) | All body text, UI labels, form inputs |
| `@expo-google-fonts/bricolage-grotesque` | `^0.2.3` | Display font (`$font-display` in .pen) | Headings, wordmark, recipe titles |
| `expo-font` | `~12.0.10` | Font loading (likely already a transitive dep) | Required to load Google font packages |

**Note:** Both font packages exist on npm and are maintained by the Expo team. The .pen variables file explicitly names `"DM Sans"` as `$font-body` and `"Bricolage Grotesque"` as `$font-display`. Use `useFonts()` from `expo-font` to load both before rendering. Confidence: HIGH (packages verified on npm, .pen tokens confirmed).

### Image Handling (Photo Thumbnails in Recipe Lists)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `expo-image` | `~2.0.0` | Performant cached image component | Recipe list photo thumbnails, scan photo display in draft review — the two known gaps from PROJECT.md |

**Why expo-image over React Native's `<Image>`:** Built-in disk + memory caching using SDWebImage (iOS) and Glide (Android). Supabase Storage URLs with signed tokens expire — expo-image handles cache invalidation gracefully. Provides `contentFit`, `placeholder` (blurhash), and `transition` props for thumbnail-quality UX. Cross-platform including web.

**Compatibility note:** `expo-image ~2.0.0` targets Expo SDK 52 / RN 0.76. The package is maintained by Expo and versioned alongside SDK releases. Confidence: HIGH (official Expo SDK package).

### Ads Integration (Public Browse Screens Only)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `react-native-google-mobile-ads` | `^14.0.0` | AdMob banner + interstitial ads on iOS/Android | Mobile/native: Public Browse screen only; two ad formats match .pen designs (320×50 mobile banner, 728×90 leaderboard) |
| `expo-tracking-transparency` | `~3.1.0` | iOS ATT permission prompt (required for AdMob) | Required on iOS before showing personalized ads; App Store rejection risk without it |
| `expo-build-properties` | `~0.13.0` | Configure `useFrameworks: static` for iOS | Required by react-native-google-mobile-ads config plugin for Expo managed workflow |

**Critical constraint — web:** `react-native-google-mobile-ads` does NOT support the web platform. For web public browse, ads must be implemented separately via a Web Component that injects Google AdSense, rendered only when `Platform.OS === 'web'`. This is a known gap in the universal Expo ad ecosystem — no unified solution exists. Keep web ads as a deferred feature or use a placeholder that matches the .pen AdBanner/Leaderboard design.

**Expo Go incompatibility:** This library requires a development build (EAS Build or local). Expo Go cannot run it. Plan for development build workflow for any work touching ads.

**Config plugin issue:** There is a reported bug with the config plugin and Expo SDK 54. The current project is on SDK 52 where this is less likely to be an issue. Verify before upgrading SDK. Confidence: MEDIUM (library confirmed working on React Native, Expo config plugin has reported issues on SDK 54).

### Subscription Gating (Scan Feature)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `react-native-purchases` | `^9.10.5` | RevenueCat SDK for iOS/Android IAP subscriptions | Gating the scan feature behind a subscription entitlement; manages StoreKit (iOS) and Google Play Billing (Android) |
| `react-native-purchases-ui` | `^9.10.5` | Pre-built paywall UI components | Optional — use if you want RevenueCat's managed paywall UI instead of building custom screens |

**Why RevenueCat over raw `react-native-iap`:** RevenueCat handles receipt validation server-side, cross-platform entitlement sync, subscription analytics, and webhook delivery to Supabase (so you can set `has_scan_entitlement = true` on the user profile via an Edge Function). With raw `react-native-iap`, you build all of this yourself. RevenueCat is free up to $2.5K/month revenue.

**Expo Go compatibility:** `react-native-purchases` includes a Preview API Mode that auto-mocks purchases inside Expo Go, so the rest of the app remains testable. Real purchases require a development build.

**Web support:** RevenueCat supports web subscriptions (Stripe) but this requires a separate RevenueCat web SDK setup, not `react-native-purchases`. Defer web subscriptions to a later milestone.

**Supabase integration:** RevenueCat webhooks → Supabase Edge Function → update `profiles.scan_entitlement` column. This is the recommended pattern for RLS-gated features. Confidence: HIGH (official Expo + RevenueCat partnership, verified version 9.10.5 on npm as of 2026-03-03).

---

## Design Token Integration

The `.pen` file at line 16439 defines these variables. They should be hand-coded as a TypeScript constants file — no design token tooling needed.

```typescript
// lib/tokens.ts — hand-coded from cookbook.pen variables
export const colors = {
  'accent-warm': '#E8784E',
  'accent-green': '#22C55E',
  'accent-coral': '#FF6B6B',
  'accent-blue': '#007AFF',
  'accent-yellow': '#FCD34D',
  'bg-card': '#F6F7F8',
  'bg-card-warm': '#FFFBF5',
  'bg-page': '#FFFFFF',
  'border-default': '#E5E7EB',
  'border-subtle': '#F3F4F6',
  'text-primary': '#1A1A1A',
  'text-secondary': '#6B7280',
  'text-tertiary': '#9CA3AF',
  'text-disabled': '#D1D5DB',
  'badge-coral-bg': '#FFF1F0',
  'badge-green-bg': '#F0FDF4',
  'badge-yellow-bg': '#FFFBEB',
  white: '#FFFFFF',
} as const;

export const radii = {
  sm: 12, md: 16, lg: 20, pill: 100,
} as const;

export const fonts = {
  body: 'DM Sans',
  display: 'Bricolage Grotesque',
} as const;
```

**Do NOT add:** Style Dictionary, Theo, or any design-token-to-code pipeline. The .pen file is JSON and has 20 variables. A constants file is simpler, faster, and more maintainable for this project size.

---

## Installation

```bash
# Icons (lucide) — requires react-native-svg
npx expo install react-native-svg
npm install lucide-react-native

# Typography (Google Fonts)
npm install @expo-google-fonts/dm-sans @expo-google-fonts/bricolage-grotesque expo-font

# Image handling
npx expo install expo-image

# Ads (iOS/Android only, requires dev build)
npx expo install react-native-google-mobile-ads expo-tracking-transparency expo-build-properties

# Subscriptions (requires dev build)
npm install react-native-purchases react-native-purchases-ui
```

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Custom `useBreakpoint` hook | NativeWind v4 (Tailwind CSS) | If you want utility-class styling throughout the app; NOT recommended here because NativeWind v4 has version conflicts with Expo SDK 54's Reanimated v4, and the project already uses StyleSheet-based styles |
| `expo-image` | React Native `<Image>` | Never — no disk caching, no blurhash placeholder, no `contentFit`; always use `expo-image` for remote images |
| RevenueCat (`react-native-purchases`) | `react-native-iap` (raw IAP) | If you want zero third-party dependency for purchases and are willing to build receipt validation, cross-platform entitlement sync, and webhooks yourself |
| AdMob (`react-native-google-mobile-ads`) | No ads at launch | Acceptable. The PROJECT.md says "minimal ads on public browsing screens only" — ads are a hypothesis. Defer until public browsing traffic exists to validate if ad revenue is worth the EAS Build complexity |
| Hand-coded design tokens | Style Dictionary / Theo | If design tokens come from a managed Figma/design system with hundreds of variables and multiple themes |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `expo-ads-admob` | Officially deprecated by Expo; unmaintained | `react-native-google-mobile-ads` |
| NativeWind v4 with Expo SDK 52 | Technically compatible but introduces Tailwind configuration complexity into a project that already uses StyleSheet patterns across 86 files — migration cost is high relative to the benefit | Stick with StyleSheet + design token constants |
| NativeWind v5 (Tailwind v4) | In beta as of late 2025; explicit migration friction from v4 | Not yet; wait for stability |
| Separate routing library (React Navigation directly) | Expo Router v4 wraps React Navigation; adding it directly causes duplicated navigators and unpredictable behavior | Use `expo-router/ui` for custom layouts |
| `react-native-responsive-screen` | Percentage-based sizing library designed for fluid grids; overkill for three fixed breakpoints | Custom `useBreakpoint()` hook |

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| `lucide-react-native ^0.475.0` | React 18.x (Expo SDK 52) | Peer dep issue with React 19 (SDK 54+); use `--legacy-peer-deps` if upgrading SDK |
| `react-native-svg ~15.8.0` | Expo SDK 52 / RN 0.76 | Required by lucide-react-native; check `npx expo install react-native-svg` to get Expo-pinned version |
| `react-native-google-mobile-ads ^14.0.0` | Expo managed workflow with config plugin | Reported config plugin issue on SDK 54; stable on SDK 52 |
| `react-native-purchases ^9.10.5` | Expo SDK 52 managed workflow | Requires EAS Build or dev build for real purchases; mocks in Expo Go |
| `expo-image ~2.0.0` | Expo SDK 52 / RN 0.76 | Always use `npx expo install` to get SDK-matched version |

---

## Stack Patterns by Variant

**For the web layout (1440px sidebar):**
- Use `_layout.web.tsx` (platform-specific file) to render a sidebar layout
- The mobile `_layout.tsx` keeps the existing bottom tab/stack pattern
- `expo-router/ui` `<Tabs>` is unstyled — wrap it in a flex row with a `<View style={{ width: 260 }}>` sidebar
- No new package needed

**For the tablet layout (768px):**
- Same navigation as mobile (bottom tabs) but with wider content columns
- `useBreakpoint()` returns `'tablet'` and layout components add horizontal padding / max-width constraints
- Recipe cards shift from single-column to two-column grid using `FlatList numColumns={breakpoint === 'tablet' ? 2 : 1}`

**For ads on web:**
- Render a `Platform.OS === 'web'` guard around a web-only component
- Inside, inject an AdSense `<script>` tag via `react-native-web`'s `dangerouslySetInnerHTML` equivalent on a `<div>` (accessible via `View` on web)
- Alternatively: skip web ads in v1.1 — traffic unlikely to justify the complexity at this stage

---

## Sources

- [Expo SDK 54 changelog](https://expo.dev/changelog/sdk-54) — Confirmed SDK 54 = RN 0.81 (current project is SDK 52 = RN 0.76)
- [react-native-purchases npm](https://www.npmjs.com/package/react-native-purchases) — Version 9.10.5 confirmed current as of 2026-03-03
- [react-native-google-mobile-ads docs](https://docs.page/invertase/react-native-google-mobile-ads) — No web support confirmed; Expo config plugin required
- [Lucide React Native guide](https://lucide.dev/guide/packages/lucide-react-native) — react-native-svg peer dep requirement
- [lucide React peer dep issue](https://github.com/lucide-icons/lucide/issues/2845) — React 19 compatibility problem documented; not relevant for SDK 52
- [@expo-google-fonts/bricolage-grotesque npm](https://www.npmjs.com/package/@expo-google-fonts/bricolage-grotesque) — Package exists and available
- [NativeWind + Expo SDK 54 issues](https://medium.com/@matthitachi/nativewind-styling-not-working-with-expo-sdk-54-54488c07c20d) — Reanimated v4 conflict documented (LOW confidence, single source)
- [Expo in-app purchases guide](https://docs.expo.dev/guides/in-app-purchases/) — Official Expo recommendation of react-native-purchases
- [RevenueCat Expo tutorial](https://expo.dev/blog/expo-revenuecat-in-app-purchase-tutorial) — Official Expo blog endorsement

---

*Stack research for: v1.1 responsive design + monetization additions to Expo/React Native family recipe app*
*Researched: 2026-03-03*

# Feature Research

**Domain:** Responsive recipe app — design-first rebuild with public browsing and monetization
**Researched:** 2026-03-03
**Confidence:** HIGH (design patterns confirmed against cookbook.pen; navigation patterns confirmed via Expo Router docs; ad placement via Google AdMob guidelines; subscription via RevenueCat + Expo official docs)

---

## Context: What Already Exists (v1.0)

The following are fully built and NOT in scope here. Research focuses only on what v1.1 adds.

- Auth (signup, login, password reset, session persistence)
- Family spaces (create, invite, manage roles)
- Recipe CRUD (ingredients, steps, metadata, tags, collections)
- Photo-to-recipe scanning (OCR, confidence scoring, multi-image)
- Comments (threaded, family-scoped), ratings (half-star)
- Unit conversion engine (metric/imperial)
- Per-recipe visibility (private/family/public) with Supabase RLS

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Responsive recipe card grid | Every recipe app since Pinterest shows image cards in a grid; single-column mobile list feels dated | MEDIUM | cookbook.pen specifies: 260px-wide horizontal scroll cards on mobile, 2-col grid on tablet, 3-4 col grid on web. 16:9 image ratio at 150px height mobile, taller on web. |
| Adaptive navigation — tab bar on mobile, sidebar on web | Web users expect a left nav sidebar; mobile users expect a bottom tab bar. Wrong nav on wrong platform = confusion | HIGH | cookbook.pen shows: tab bar (Home, Recipes, Collections, Scan, Family) on mobile/tablet. On web (1440px): 260px-wide left sidebar with 6 nav items (Home, My Recipes, Collections, Scan Recipe, Family, Settings). Implementation: platform-specific layout files in Expo Router using `.native.tsx` vs `.tsx` extensions |
| Photo thumbnails in recipe list views | Recipes without photos feel skeletal; users scan visually | LOW | Supabase Storage URLs exist from v1.0. Need to wire thumbnail display into list cards — currently placeholder. |
| Scan photo visible in draft review | Users uploaded a photo; not seeing it during review feels broken | LOW | The photo is stored in v1.0 but draft review screen shows placeholder. Display existing storage URL. |
| Public recipe attribution | If a recipe is public, users expect to see who created it | LOW | cookbook.pen shows avatar + display name + "added by" label in Public Recipe Detail. Uses `profiles` table FK already in schema. |
| "Sign In" prompt in public browsing header | Non-authenticated users expect a clear path to create an account or sign in | LOW | cookbook.pen shows: logo left, "Sign In" button right on mobile public browse. On web: "Sign In" + "Get Started" buttons in top-right. This is a standard conversion pattern. |
| Search + filter chips on public browse | Unauthenticated users need to navigate recipe catalog without an account | MEDIUM | cookbook.pen Public Browse shows search bar + filter chips (All, Breakfast, Dinner, Desserts, Vegetarian). Feeds into existing search infrastructure. |
| Home screen navigation to all features | v1.0 home is a dead end — features are undiscoverable | MEDIUM | cookbook.pen Home shows: greeting header, search, featured recipes horizontal scroll, quick-access sections to Scan, Collections, Family. Currently none of these are tappable from home. |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required, but valued.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Design-first token-based UI system | Consistent look across 3 breakpoints; enables future design changes without per-component rework | HIGH | cookbook.pen already defines all design tokens as `$` variables (`$accent-warm`, `$text-primary`, `$bg-card`, `$radius-lg`, etc.). These must be mapped to a JS theme object at build time so all screens share one source of truth. Fonts: Bricolage Grotesque (headings) + DM Sans (body). |
| Tablet sidebar-style navigation | Tablet users using a keyboard/trackpad expect sidebar nav, not a bottom tab bar. Most React Native apps don't bother | MEDIUM | cookbook.pen Tablet Home (768px) keeps a top header (not sidebar), but Web (1440px) switches to full sidebar. Tablet may use a collapsible/mini sidebar or keep top nav — this is a design gap to resolve. |
| Subscription-gated scan feature | Positions scanning as the premium value driver; ad-supported free tier uses public browsing as funnel | HIGH | RevenueCat is the standard Expo solution for this. Supports iOS App Store, Google Play, and web via RevenueCat Web Billing. Single entitlement check gates the scan flow. Requires dev builds (not Expo Go). |
| Minimal, clearly labeled ads on public screens only | Recipe apps that show ads to logged-in users lose retention. Ads limited to unauthenticated public browsing respects the family vault experience | MEDIUM | cookbook.pen defines two ad components: `Component/AdBanner/Mobile` (320x50px) and `Component/AdBanner/Leaderboard` (728x90px). The design uses a "Sponsored" label with subdued `$text-tertiary` styling — non-intrusive by design. AdMob guidance confirms: fixed-height container, label as "Sponsored", no placement adjacent to interactive elements. |
| Public browsing as SEO/discoverability funnel | Public recipes indexed by search engines drive organic traffic to sign-up | HIGH | Requires Expo Router web rendering to produce valid HTML. Recipe structured data (schema.org/Recipe) boosts search ranking. This is how AllRecipes and Food Network grow. Unauthenticated browsing with "Sign In to save" conversion is the standard pattern. |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Ads visible to authenticated family users | Maximize ad revenue across all users | Destroys the "family heirloom vault" trust proposition. Feels extractive when grandma's recipes sit next to ads. Conflicts with PROJECT.md constraint. | Ads on public browsing screens only. Subscription removes ads entirely. |
| Interstitial / full-screen ads | Higher CPM than banners | Recipe apps require uninterrupted cooking flow. AdMob guidelines specifically flag interstitials as harmful when shown during active content consumption. | Fixed-position banner ads between content sections only. |
| Auto-redirect unauthenticated users to login | Protect all content | Blocks the organic discovery funnel entirely. Most recipe users browse before committing to sign-up. SEO crawlers can't index gated content. | Show public recipes freely. Gate saving, commenting, and scanning behind auth. Prompt with "Sign in to save" on interaction. |
| Offline mode | Users cook in kitchens with spotty wifi | High implementation complexity conflicts with real-time RLS model. Supabase's offline story is immature. | Pre-load recipe detail into React Query cache on navigation so it survives brief connectivity gaps — not full offline. |
| Persistent bottom tab bar on web | Simpler than building two navigation systems | Web users find bottom navigation jarring. Keyboard users can't use it effectively. Goes against web conventions. | Platform-specific layout files — tab bar on `.native.tsx`, sidebar on `.tsx`. |
| Hamburger menu on mobile | Familiar on web, saves space | Hides navigation from mobile users; increases tap depth for core features. Bad for "grandma-friendly" usability. | Bottom tab bar with 4-5 icons. Flat nav hierarchy. |
| Paywall at cold start | Maximize subscription conversion | Prevents any trial of value. Users need to experience the product before paying. | Gate only the scan feature, after the user has seen it demonstrated in the home screen. |

---

## Feature Dependencies

```
[Responsive Layout System]
    └──required by──> [All 3-breakpoint Screens]
                          └──required by──> [Design Token System]

[Design Token System]
    └──must exist before──> [Any screen implementation]

[Public Recipe Browsing]
    └──requires──> [Unauthenticated Supabase query (already exists via RLS)]
    └──requires──> [Public Browse Screen (new)]
    └──enables──> [Ad Placement on Public Screens]
    └──enables──> [SEO / structured data]

[Ad Placement]
    └──requires──> [Public Browse Screen]
    └──conflicts with──> [Authenticated family screens]

[Subscription Gating]
    └──requires──> [RevenueCat SDK (needs dev build)]
    └──gates──> [Scan Feature (existing)]
    └──removes──> [Ads for subscriber]

[Home Screen Navigation]
    └──requires──> [Adaptive Navigation (tab bar / sidebar)]
    └──unlocks──> [Feature discoverability]

[Adaptive Navigation]
    └──requires──> [Platform-specific Expo Router layout files]
    └──splits into──> [Tab bar (mobile/tablet)]
                   └──> [Sidebar (web)]

[Photo Thumbnails in Lists]
    └──requires──> [Existing Supabase Storage URLs (v1.0)]
    └──requires──> [Responsive card component]

[Scan Photo in Draft Review]
    └──requires──> [Existing scan job storage (v1.0)]
    └──requires──> [Draft review screen update only]
```

### Dependency Notes

- **Design token system must be first.** Every screen in cookbook.pen references `$` variables. Without a shared theme object, each screen implementation will diverge and become hard to maintain across 3 breakpoints.
- **Responsive layout system before any screen rebuild.** The breakpoint hook/utility (mobile 390px, tablet 768px, web 1440px) gates all screen work.
- **Adaptive navigation before home screen.** Home screen links to features via the nav structure. Wrong nav = broken home.
- **Public browse before ad placement.** Ads have no surface to render until the public screen exists.
- **RevenueCat requires a dev build.** Cannot be tested in Expo Go. Must be scheduled for a phase that includes native build setup.
- **Subscription gating is independent of ads.** They can ship in separate phases. Subscriber entitlement check gates scan; ads gate public browsing. They interact (subscriber = no ads) but don't block each other's implementation.

---

## MVP Definition

This is a subsequent milestone (v1.1) — the "minimum" here means minimum to complete the stated goal of responsive design + deferred features.

### Must Ship in v1.1

- [ ] Design token system (JS theme object matching cookbook.pen `$` variables) — gates all other work
- [ ] Responsive layout system (breakpoint hook at 390/768/1440px) — gates all screen work
- [ ] Adaptive navigation (tab bar mobile/tablet, sidebar web) — gates home screen and all nav
- [ ] Home screen with navigation to recipe features — currently features are undiscoverable
- [ ] All existing screens rebuilt to match cookbook.pen designs at all 3 breakpoints
- [ ] Missing screen designs created: Sign Up, Forgot Password, Profile/Settings, Invite, Draft Review
- [ ] Public recipe browsing screen (list view, unauthenticated)
- [ ] Public recipe detail screen (unauthenticated, with attribution)
- [ ] "Sign In" prompt in public browsing (conversion entry point)
- [ ] Photo thumbnails in recipe list views
- [ ] Scan photo display in draft review

### Add When Core Is Stable

- [ ] Ad placement on public browsing screens (requires public screens complete + AdMob integration)
- [ ] Subscription gating on scan feature via RevenueCat (requires dev build setup)

### Future Consideration (v2+)

- [ ] Recipe structured data markup (schema.org/Recipe) for SEO — high value but low urgency at current scale
- [ ] Affiliate ingredient links — meaningful revenue only at significant traffic volume
- [ ] Grocery list integration — expands scope significantly, needs product validation first

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Design token system | HIGH (enables everything) | LOW | P1 |
| Responsive layout system (breakpoint hook) | HIGH | LOW | P1 |
| Adaptive navigation (tab bar / sidebar) | HIGH | MEDIUM | P1 |
| Home screen navigation | HIGH | MEDIUM | P1 |
| All screens rebuilt at 3 breakpoints | HIGH | HIGH | P1 |
| Missing screen designs (5 screens) | HIGH | MEDIUM | P1 |
| Public recipe browsing (list + detail) | HIGH | MEDIUM | P1 |
| Sign In prompt in public screens | MEDIUM | LOW | P1 |
| Photo thumbnails in list views | MEDIUM | LOW | P1 |
| Scan photo in draft review | MEDIUM | LOW | P1 |
| Ad placement on public screens | MEDIUM | MEDIUM | P2 |
| Subscription gating via RevenueCat | MEDIUM | HIGH | P2 |

**Priority key:**
- P1: Must ship for v1.1 milestone to be complete
- P2: Should ship in v1.1 if P1 is stable; can slip to v1.2

---

## Responsive UX Patterns (From Research + cookbook.pen)

### Recipe Card Grid Behavior by Breakpoint

| Breakpoint | Grid | Card Width | Image Height | Layout Type |
|------------|------|------------|--------------|-------------|
| Mobile (390px) | Horizontal scroll (1 row) for featured | 260px fixed | 150px | ScrollView horizontal |
| Mobile (390px) | 1-col vertical list for browse | fill | 160-180px | FlatList vertical |
| Tablet (768px) | 2-col grid for browse | ~50% - gaps | 180px | FlatList numColumns=2 |
| Web (1440px) | 3-4 col grid for browse | ~280-320px | 200px | FlatList numColumns=3/4 |

### Navigation Pattern by Platform

| Platform | Width | Nav Pattern | Implementation |
|----------|-------|-------------|----------------|
| Mobile | 390px | Bottom tab bar (5 tabs: Home, Recipes, Collections, Scan, Family) | Expo Router Tabs with `tabBarPosition: 'bottom'` |
| Tablet | 768px | Top header with hamburger OR mini sidebar (design gap — needs resolution) | TBD; tablet breakpoint in cookbook.pen keeps top header |
| Web | 1440px | Left sidebar 260px (Home, My Recipes, Collections, Scan Recipe, Family, Settings) | Expo Router with platform-specific layout `.tsx` vs `.native.tsx`; `tabBarPosition: 'left'` or custom `<Slot>` + sidebar component |

### Public Browsing UX Pattern

| Element | Mobile (390px) | Web (1440px) |
|---------|----------------|--------------|
| Header | Logo left + "Sign In" button right | Logo left + search center + "Sign In" + "Get Started" right |
| Search | Full-width bar below logo | 480px fixed width in header |
| Filter chips | Horizontal scroll below search | Left-aligned chip row with sort controls right |
| Recipe grid | 1-col vertical list | 3-col grid |
| Ad placement | 320x50 banner between content sections | 728x90 leaderboard below header |
| Back navigation | Arrow-left + "Cookbook" logo in nav bar | Sidebar link or breadcrumb |

### Ad Placement Rules (Confirmed via AdMob Guidelines)

1. Ads on public browsing screens only — never on authenticated family/recipe screens
2. Fixed-height container pre-allocated (320x50 mobile banner, 728x90 web leaderboard) — no layout shift when ad loads
3. Labeled "Sponsored" — cookbook.pen uses subdued `$text-tertiary` styling with megaphone icon
4. Minimum 8px buffer between ad and any interactive element
5. Position: between recipe grid sections or below the filter row — not adjacent to "Add Recipe" or any save/action button
6. No interstitials, no autoplay, no overlays — PROJECT.md constraint

### Subscription Gating Pattern (RevenueCat)

1. RevenueCat entitlement check on scan screen mount — if no active entitlement, show paywall
2. Paywall displays before scan upload UI — user sees value proposition before purchase prompt
3. Cross-platform: iOS (App Store), Android (Google Play), Web (RevenueCat Web Billing)
4. Subscriber entitlement = scan access + ad-free experience (future enforcement)
5. Requires Expo dev build — not compatible with Expo Go

### Design-First Workflow (From cookbook.pen)

cookbook.pen is a `.pen` format design file defining:
- Design tokens as `$` variables (`$accent-warm`, `$text-primary`, `$bg-card`, `$radius-lg`, `$radius-pill`, `$font-body`, etc.)
- Reusable components (`Component/Button/Primary`, `Component/Button/Secondary`, `Component/Input`, `Component/AdBanner/Mobile`, etc.) referenced by ID across screens
- 9 screens × 3 breakpoints (Mobile 390px, Tablet 768px, Web 1440px)
- 5 missing screens needing design before implementation: Sign Up, Forgot Password, Profile/Settings, Invite, Draft Review

The design-first workflow for this codebase:
1. Extract all `$` token values into a JS theme object (`theme.ts`)
2. Implement reusable components to exactly match the `Component/` specs (sizes, padding, radii, colors)
3. Build each screen against the `.pen` spec, checking all 3 breakpoints using Expo's responsive utilities
4. Missing screens must be designed first (in the `.pen` format, or as a design spec) before implementation

---

## Competitor Feature Analysis

| Feature | AllRecipes / Food Network | Paprika / Yummly | Our Approach |
|---------|--------------------------|------------------|--------------|
| Public browsing | Always available, heavily SEO optimized | Paprika: offline-first, private; Yummly: public | Public for `visibility = 'public'` recipes only; family recipes stay private |
| Navigation | Web sidebar or top nav; mobile bottom tabs | Mobile-only bottom tabs | Platform-appropriate: bottom tabs native, sidebar web |
| Ad placement | Aggressive — inline, popups, pre-roll video | No ads (subscription only) | Minimal — public screens only, banner format, clearly labeled |
| Subscription | No (ad-supported) / yes (Food Network Kitchen) | Yes (Paprika $4.99 one-time) | Yes — scan feature gated; free tier has public browsing + ads |
| Responsive design | Fully responsive, CSS-based | Mobile app only | Expo universal app, full 3-breakpoint coverage |
| Photo scan | No | No (manual import only) | Yes — primary differentiator |

---

## Sources

- cookbook.pen design file (direct inspection) — screen layouts, component specs, token definitions
- [Expo Router Drawer Documentation](https://docs.expo.dev/router/advanced/drawer/) — MEDIUM confidence; drawer + sidebar + tabBarPosition patterns
- [Expo Router Native Tabs](https://docs.expo.dev/router/advanced/native-tabs/) — MEDIUM confidence; platform-specific layout files pattern
- [RevenueCat for Expo](https://expo.dev/blog/expo-revenuecat-in-app-purchase-tutorial) — HIGH confidence; official Expo blog
- [RevenueCat iOS + Android + Web](https://www.revenuecat.com/blog/engineering/build-a-single-expo-app-with-subscriptions-on-ios-android-and-web-using-revenuecat/) — MEDIUM confidence; official RevenueCat engineering blog
- [Google AdMob Banner Ad Guidance](https://support.google.com/admob/answer/6128877) — HIGH confidence; official AdMob policy
- [Google AdMob Implementation Guidance](https://support.google.com/admob/answer/2936217) — HIGH confidence; official AdMob policy
- [NativeWind v4 Responsive Design](https://www.nativewind.dev/docs/core-concepts/responsive-design) — MEDIUM confidence; official NativeWind docs (note: default breakpoints tuned for web, need custom mobile breakpoints)
- [Expo Media Queries blog](https://blog.expo.dev/media-queries-with-react-native-for-ios-android-and-web-e0b73ed5777b) — MEDIUM confidence; official Expo blog
- Bootstrapped Ventures (recipe SEO patterns) — LOW confidence; practitioner blog

---

*Feature research for: Responsive recipe app — design-first rebuild with public browsing, adaptive navigation, ads, subscription gating*
*Researched: 2026-03-03*

# Pitfalls Research

**Domain:** Responsive web expansion + public browsing + monetization for existing React Native recipe app
**Researched:** 2026-03-03
**Confidence:** HIGH (codebase audited directly; web search corroborated)

---

## Critical Pitfalls

### Pitfall 1: StyleSheet.create Styles Are Cached at Module Initialization — Won't React to Window Resize on Web

**What goes wrong:**
All current screens use `StyleSheet.create({...})` with hardcoded pixel values defined outside of component functions. On iOS/Android these values are set once and never need to change. On web, the browser window can resize at any time, but `StyleSheet.create` runs once at module load — the cached style objects never update. The result: breakpoint-responsive layouts that appear to work at initial load but don't adapt if the user resizes their browser window.

**Why it happens:**
The pattern is idiomatic and correct for native. Developers don't realize it's fundamentally incompatible with browser resize events. The app looks fine on a first render at a given viewport, masking the bug.

**How to avoid:**
Move all dimension-sensitive values out of `StyleSheet.create` and derive them inside the component from `useWindowDimensions()`. Use the hook to compute a current breakpoint (`mobile < 768`, `tablet < 1024`, `desktop >= 1024`) and apply different style objects based on that value. Static styles (colors, border radii, font weights) can stay in `StyleSheet.create`; anything that varies by breakpoint must be computed inline or via a hook that returns fresh values per render.

```typescript
// WRONG — cached, never updates on resize
const styles = StyleSheet.create({ container: { width: 320 } });

// RIGHT — recomputes on every resize
function useBreakpoint() {
  const { width } = useWindowDimensions();
  if (width >= 1024) return 'desktop';
  if (width >= 768) return 'tablet';
  return 'mobile';
}
```

**Warning signs:**
Layout looks correct on first load but breaks when browser is resized. `StyleSheet.create` called with computed values that reference `Dimensions.get('window')` instead of `useWindowDimensions`.

**Phase to address:**
Responsive layout system phase (design-first UI rebuild). Establish the breakpoint hook and pattern in the first responsive component, then enforce it project-wide before any screen-level work begins.

---

### Pitfall 2: expo-image-picker Requires a Permission Grant Dialog That Doesn't Exist on Web

**What goes wrong:**
`ScanPhotoUpload.tsx` calls `ImagePicker.requestMediaLibraryPermissionsAsync()` before every image pick. On iOS/Android, this shows the OS permission prompt. On web, this call is a no-op — but the code then checks `permissionResult.status !== "granted"` and blocks the user if the result isn't exactly `"granted"`. Depending on the expo-image-picker version, the web platform may return `"granted"`, `"undetermined"`, or an unexpected value. A status mismatch blocks the entire scan feature on web silently (no error to the user, just no picker).

Additionally, `launchCameraAsync` is not available in browsers unless the device has a camera and the browser supports `getUserMedia`. The current code only offers `launchImageLibraryAsync`, which is the safer path — but the permission guard pattern is still fragile on web.

**Why it happens:**
The permission pattern is copy-pasted from standard React Native patterns. Nobody tests the web path during mobile-first development.

**How to avoid:**
Wrap permission requests in a platform check:

```typescript
import { Platform } from 'react-native';

async function pickImages() {
  if (Platform.OS !== 'web') {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { showPermissionError(); return; }
  }
  // proceed with launchImageLibraryAsync
}
```

On web, `launchImageLibraryAsync` renders a standard `<input type="file">` — no permission required. Test the full scan flow in a browser before shipping.

**Warning signs:**
Scan upload button does nothing on web. `permissionResult.status` logged as something other than `"granted"` in the browser console.

**Phase to address:**
Scan gating / platform compatibility phase. Fix before any subscription gating work touches this component.

---

### Pitfall 3: FlatList Vertical Scroll Is Broken Inside a flex:1 Container on Web

**What goes wrong:**
`RecipesListScreen` uses `FlatList` inside a `View style={{ flex: 1 }}` container. On native, `flex: 1` constrains the list to the screen height and enables native scroll. On web, `flex: 1` on a `View` whose ancestor chain doesn't have explicit heights results in the FlatList collapsing to zero height or the entire page scrolling instead of the list. This is a known, long-standing react-native-web issue with multiple GitHub threads.

**Why it happens:**
Web CSS flexbox height resolution differs from React Native's Yoga-based layout engine. On the web, percentage-based heights require every ancestor to have an explicit height. The root Expo Router layout likely doesn't establish a viewport-height constraint that cascades correctly to nested views.

**How to avoid:**
On web, FlatList generally requires one of these approaches:
- Wrap the FlatList container with `{ flexGrow: 1, flexBasis: 0 }` rather than `{ flex: 1 }`
- Use `contentContainerStyle={{ flexGrow: 1 }}` on the FlatList
- For recipe list pages (which are typically full-page on web), consider switching to a simple `ScrollView` + `map()` on web since FlatList's virtualization provides no performance benefit on web anyway

Add a platform branch in recipe list screens:

```typescript
const { width } = useWindowDimensions();
const isWeb = Platform.OS === 'web';
// use ScrollView + map on web, FlatList on native
```

**Warning signs:**
Recipe list appears blank on web. Browser scrollbar appears on `<html>` or `<body>` instead of the list container. FlatList renders all items but doesn't scroll.

**Phase to address:**
Responsive layout phase, specifically the recipe list and collections screens.

---

### Pitfall 4: iOS-Only TextInput Props Cause Silent Failures on Web (clearButtonMode)

**What goes wrong:**
`RecipesListScreen` uses `clearButtonMode="while-editing"` on its search TextInput. This prop is iOS-only — it silently does nothing on Android and web. On web, users expect the standard browser clear affordance (`×` button or pressing Escape). The code as written provides no clear mechanism on any non-iOS platform.

**Why it happens:**
React Native docs list `clearButtonMode` as iOS-specific, but no TypeScript error fires and the prop is accepted silently on all platforms.

**How to avoid:**
Replace with a cross-platform pattern: render a custom clear button `Pressable` that becomes visible when `searchQuery.length > 0`:

```typescript
<View style={{ flexDirection: 'row' }}>
  <TextInput value={searchQuery} onChangeText={setSearchQuery} style={{ flex: 1 }} />
  {searchQuery.length > 0 && (
    <Pressable onPress={() => setSearchQuery('')}>
      <Text>✕</Text>
    </Pressable>
  )}
</View>
```

**Warning signs:**
Search bar has no clear button on Android or web. `clearButtonMode` prop appears in a non-iOS component.

**Phase to address:**
Design-first UI rebuild phase — fix this while rebuilding the search component to match cookbook.pen designs.

---

### Pitfall 5: Shadow Styles Are Not Cross-Platform — Break on Web Without boxShadow

**What goes wrong:**
Every card in the app (recipe list, scan hub, draft review) uses `shadowColor`, `shadowOffset`, `shadowOpacity`, `shadowRadius`, and `elevation`. This combination works on iOS (shadow props) and Android (elevation). On web, react-native-web translates iOS shadow props to CSS `box-shadow`, but `elevation` is an Android concept with no web equivalent. The result is that card shadows may look inconsistent or be absent on web depending on which props are dominant.

**Why it happens:**
The dual-prop pattern is idiomatic RN but was never designed for three platforms. React-native-web's translation handles the iOS props but drops Android elevation silently.

**How to avoid:**
For the web UI rebuild, use a design token approach: define a `cardShadow` style object that applies iOS shadow props (which react-native-web translates correctly to `box-shadow`) and keep `elevation` only for Android via `Platform.select`. Alternatively, during the responsive rebuild, use `Platform.select` to provide an explicit `boxShadow` string on web:

```typescript
const cardStyle = Platform.select({
  web: { boxShadow: '0 2px 4px rgba(0,0,0,0.1)' },
  ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  android: { elevation: 3 },
  default: { elevation: 3 },
});
```

**Warning signs:**
Cards appear flat (no shadow) on web. Cards look different between web and iOS screenshots.

**Phase to address:**
Design-first UI rebuild — establish a shared shadow token before rebuilding any screen.

---

### Pitfall 6: Ad SDK (AdMob) Cannot Run on Web — Dual-Track Ad Architecture Required

**What goes wrong:**
Google AdMob (react-native-google-mobile-ads) is a native-only SDK. It has no web support, requires a native development build, and will fail to compile for the web target. If ads are integrated using the AdMob SDK without platform branching, `expo export --platform web` will fail or produce a broken bundle.

Public browsing is the only ad-bearing surface in this project, and public browsing needs to work on web. This creates a conflict: the primary monetization mechanism for the web platform must be a completely different SDK than the one used for native.

**Why it happens:**
Teams pick AdMob for mobile first (correct choice) and assume they'll handle web later. "Later" arrives when the web build is broken with no clear path forward.

**How to avoid:**
Treat ads as a platform-specific module from the start. Define an `AdUnit` component that is platform-branched at the module level:
- `AdUnit.native.tsx` — wraps react-native-google-mobile-ads BannerAd
- `AdUnit.web.tsx` — wraps a web-compatible ad network (Google AdSense script injection, or a web SDK from a network that supports both)

Never import the AdMob SDK in a file that is bundled for web. Use Metro's platform extension resolution to isolate it.

For a recipe app at v1.1 scale, a simpler alternative is static ad placeholders (reserved space with `minHeight`) that link to sponsor pages, avoiding third-party SDK complexity entirely for the first iteration.

**Warning signs:**
`expo export --platform web` throws a native module error. AdMob SDK imported in a non-platform-branched file. No `.web.tsx` equivalent for any ad component.

**Phase to address:**
Public browsing + monetization phase. Define the `AdUnit` component boundary before implementing any ad logic.

---

### Pitfall 7: Subscription Gating Hypothesis May Be Wrong — Gate Must Be Bypassable

**What goes wrong:**
The PROJECT.md explicitly marks scan gating as a v1 hypothesis. If scan is gated behind a subscription from day one and the hypothesis is wrong (users won't pay), the scan feature becomes inaccessible to all free users and adoption collapses. Worse, if the gating implementation is hardcoded into the navigation or backend, removing or loosening it later requires invasive surgery across multiple layers.

**Why it happens:**
Subscription gating feels like a safe revenue decision. Developers implement it as a permanent wall rather than a configurable gate, then can't A/B test it.

**How to avoid:**
Implement gating as a flag checked against an entitlement service, not a hardcoded route guard. The check pattern should be:

```typescript
const { hasScanAccess } = useEntitlements(); // resolves from RevenueCat or a local flag
if (!hasScanAccess) return <ScanPaywall />;
```

The entitlement can be overridden locally (feature flag) without changing navigation. This makes it possible to run the scan feature as free for a cohort, measure conversion, then decide whether the gate stays.

RevenueCat Web Billing requires separate product configuration for web vs. native (Stripe vs. App Store/Google Play), but entitlements unify across platforms using a shared `appUserID`. Configure this correctly from day one — retrofitting unified entitlements after separate native and web billing is painful.

**Warning signs:**
Route guard check is a hardcoded `if (!isPremium) router.replace('/paywall')` with no feature flag escape hatch. No plan to measure whether gated users convert or churn. Web and native subscription states are tracked separately without a unified entitlement layer.

**Phase to address:**
Subscription gating phase. Establish the entitlement abstraction before implementing any paywall UI.

---

### Pitfall 8: Design-to-Code Drift — cookbook.pen Is the Source of Truth Until It Isn't

**What goes wrong:**
The cookbook.pen file defines 9 screens × 3 breakpoints plus 8 reusable components — that's 35 screen designs plus components to implement. As implementation proceeds, small deviations accumulate: a developer uses `#374151` when the design says `#3F3F46`, spacing becomes 14px instead of 16px, corner radii drift from 12px to 10px. After 4-5 screens, no individual screen is "wrong enough" to notice, but the overall UI feels inconsistent and un-designed.

This is compounded by the 5 missing designs (Sign Up, Forgot Password, Profile/Settings, Invite, Draft Review) — if these are designed during implementation (not before), the developer designing them will absorb whatever drift has already occurred.

**Why it happens:**
Nobody enforces design tokens as a first-class code artifact. Colors, spacing, and radii are copy-pasted from design files during implementation and immediately become orphaned magic numbers. Subsequent implementations eyeball rather than extract from source.

**How to avoid:**
Before implementing any screen:
1. Extract all design tokens from cookbook.pen into a single `src/theme.ts` file (colors, spacing scale, border radii, type scale, shadows)
2. All screen implementations must import from `theme.ts` — no magic numbers in component files
3. Complete all 5 missing designs in cookbook.pen before writing any implementation code for those screens
4. Do a design review after the first 2 screens are implemented to catch drift early

```typescript
// src/theme.ts — single source of truth
export const colors = { primary: '#...', textPrimary: '#...', ... };
export const spacing = { sm: 8, md: 16, lg: 24, xl: 32 };
export const radii = { card: 12, chip: 16, button: 8 };
```

**Warning signs:**
Color values appear as inline hex strings in component files. Multiple similar-but-different values for the same semantic concept (e.g., `#374151` and `#3F3F46` and `#333` all used for body text). First screens implemented look noticeably different from last screens. Missing designs created by developers rather than in the design tool.

**Phase to address:**
First phase of the design-first UI rebuild — token extraction must precede all screen implementation work.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Hardcode pixel values in StyleSheet.create for all breakpoints | Ship one screen fast | Every responsive style becomes a merge conflict when designs change | Never — extract to theme tokens from the start |
| Use AdMob SDK without platform branching | Works immediately on native | Web build breaks, requires urgent surgery | Never — branch from day one |
| Gate scan with a hardcoded route guard (no feature flag) | Simple to implement | Can't A/B test, can't loosen gate without code deploy | Never — use entitlement abstraction |
| Skip the 5 missing designs and design-in-code | Unblocks implementation | Drift is baked in; those 5 screens will never match the others | Only if accepting those screens as perpetually inconsistent |
| Use FlatList for recipe lists on web without wrapping fix | Works on native | List collapses or page-scrolls incorrectly on web | Never after web support is added |
| Use RevenueCat native SDK without web billing config | Works for App Store/Play | Web users can't subscribe; entitlement state doesn't unify | Never if web is a real target |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| expo-image-picker | Calling `requestMediaLibraryPermissionsAsync()` on web | Gate the permission call with `Platform.OS !== 'web'` |
| expo-image-picker | Assuming `launchCameraAsync` works on web | Camera is unavailable in most browser contexts; only offer library picker on web |
| react-native-google-mobile-ads | Importing the SDK in a non-platform-branched file | Use `.native.tsx` / `.web.tsx` extensions; never import AdMob in a universal file |
| RevenueCat | Configuring only iOS/Android products | Web billing requires separate Stripe products in RevenueCat dashboard; entitlements shared via `appUserID` |
| RevenueCat | Different `appUserID` on web vs. native | Use Supabase `user.id` as `appUserID` on all platforms to unify subscription state |
| Supabase public recipes | Returning all public recipes without pagination | Public browsing at scale needs cursor-based pagination from day one; `LIMIT 20 OFFSET 0` breaks at 1000+ recipes |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| FlatList virtualization on web | Renders all rows, defeats purpose | Use `ScrollView` + `map()` on web for lists under ~200 items | Immediately — FlatList has no virtualization on react-native-web |
| `useWindowDimensions` in every leaf component | Re-renders entire tree on every pixel of resize | Create a `useBreakpoint()` hook that only re-renders at discrete breakpoints | At any viewport with many components |
| Thumbnail signed URL fetching per-recipe | N+1 fetch pattern, list flickers | Current code already batches this correctly — don't regress it during rebuild | At 20+ recipes in list |
| Web bundle size without route-based code splitting | Slow initial load on web (entire app JS served) | Expo Router auto-splits by route on web — don't import large native-only modules in route files | At bundle size > 500KB, which is likely with OCR + scan logic |
| Public recipe page without server-side caching | Every page load hits Supabase | Set `Cache-Control` headers on public recipe edge functions or use Supabase's CDN features | At modest traffic — food content gets spidered |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Public browsing bypasses RLS by using service role key client-side | Exposes private/family recipes to public | Public recipe queries must use the anon key and rely on RLS `visibility = 'public'` policy — already correct in architecture, must be verified during public browsing implementation |
| Ad script injection without CSP | XSS via ad network compromise | If using web ads that inject `<script>` tags, define a Content-Security-Policy that allowlists only your ad network domains |
| Subscription entitlement checked only client-side | Users manipulate local state to bypass paywall | Scan feature gating must verify entitlement server-side (Supabase edge function checks RevenueCat webhook-synced entitlement flag, not just client state) |
| Public recipe attribution leaks profile data | User's full name/email exposed unintentionally | Attribution must use `display_name` from profiles, not raw auth email; verify RLS on profile fields visible to anon users |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Ads inside recipe detail page (cooking context) | User following a recipe on screen while an ad shifts the layout mid-cook | Ads only in list/browse views, never inside recipe detail or during the step-by-step experience |
| Full-screen scan subscription paywall with no free taste | Users who haven't yet seen scan value won't convert | Show a "scan preview" (demo output from a sample recipe) before the paywall, so users understand what they're buying |
| Mobile tab bar navigation replicated on web (desktop) | Looks like a phone app on a widescreen browser | On web at `>= 1024px`, replace tab bar with a side navigation or top nav bar using Expo Router's platform-specific layout |
| Three-breakpoint designs treated as binary mobile/desktop | Tablet layout (768px) skipped or broken | All three breakpoints must be explicitly tested: rotate a simulator, resize a browser — don't just test mobile and 1440px |
| "Design done, now implement" sequential handoff for 5 missing screens | Developer implements without design review, drift bakes in | Design the 5 missing screens in cookbook.pen, review them against the 9 existing designs for consistency, then implement |

---

## "Looks Done But Isn't" Checklist

- [ ] **Responsive layout:** Resize the browser window from 390px to 1440px in a single drag — verify no layout collapses, text overflows, or scroll failures
- [ ] **Scan on web:** Complete a scan upload in Chrome — verify the file picker opens, upload succeeds, and job list updates without permission errors
- [ ] **Public browsing without auth:** Open a public recipe URL in an incognito window — verify the recipe loads, private/family recipes return 404, and no auth token is required
- [ ] **Ad isolation:** Verify no ad unit renders on any authenticated or family-specific screen — only public browsing list and public recipe detail
- [ ] **Subscription state on web:** Subscribe via web Stripe flow — verify the same account on iOS shows scan as unlocked without re-subscribing
- [ ] **FlatList on web:** Open recipe list in browser — verify the list scrolls correctly within the page container (not the entire page scrolling)
- [ ] **Shadow consistency:** Compare a recipe card rendered on iOS and on desktop web — shadows should be visually equivalent
- [ ] **Design token enforcement:** Grep for inline color hex strings in component files — there should be none after the rebuild; all colors import from `theme.ts`
- [ ] **Missing screen designs:** All 5 missing screens have approved cookbook.pen designs before any implementation begins
- [ ] **clearButtonMode removed:** Search `clearButtonMode` in codebase — should be zero after the rebuild

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| StyleSheet.create responsive breakdowns | MEDIUM | Audit every StyleSheet.create call, extract dimension-sensitive values to a useBreakpoint pattern; can be done file-by-file |
| Image picker permission bug on web | LOW | Wrap permission call in Platform.OS check — one-line fix per call site |
| FlatList scroll broken on web | LOW-MEDIUM | Replace FlatList with ScrollView+map on web per screen — 3-5 screens affected |
| AdMob imported in web bundle | HIGH | Requires extracting ad components into .native.tsx/.web.tsx files, auditing all import chains; rebuild may break in unexpected ways |
| Subscription state not unified across platforms | HIGH | Requires RevenueCat web billing setup + webhook re-sync + userID matching audit; cannot be fixed without testing on real purchases |
| Design drift across 14+ screens | MEDIUM-HIGH | Requires systematic design review against cookbook.pen for each screen, token extraction, and targeted fixes; can take as long as the original implementation |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| StyleSheet.create not reactive to resize | Responsive layout system phase (first phase) | Verify useWindowDimensions hook returns correct breakpoint on browser resize |
| Image picker permission on web | Scan gating / platform compat phase | Smoke test scan upload in Chrome before any subscription gating work |
| FlatList scroll broken on web | Responsive layout phase, recipe list screen | Scroll test in browser at 390px, 768px, 1440px |
| iOS-only clearButtonMode | Design-first UI rebuild, search component | Verify search clear works in browser and on Android |
| Shadow inconsistency across platforms | Design-first UI rebuild, token extraction step | Visual comparison of card on iOS sim vs. browser |
| AdMob on web | Public browsing + monetization phase (architecture step) | Confirm `expo export --platform web` succeeds before writing any ad logic |
| Subscription gating too rigid | Subscription gating phase | Verify entitlement can be toggled without code deploy (feature flag test) |
| Design-to-code drift | First phase (token extraction) and every screen after | Run a design review after implementing screens 1-2 before proceeding to the rest |
| Public attribution leaks profile data | Public browsing phase | Verify anon user cannot access raw email via public recipe API |

---

## Sources

- Codebase audit: `/app/recipes/index.tsx`, `/src/features/scan/ScanPhotoUpload.tsx`, `/src/features/scans/DraftReview.tsx`, `/app/(scan)/index.tsx`, `/app/index.tsx` — identified specific patterns at risk
- [Expo Web documentation](https://docs.expo.dev/workflow/web/) — platform capabilities and limitations
- [React Native Web compatibility](https://necolas.github.io/react-native-web/docs/react-native-compatibility/) — component-level compatibility matrix
- [react-native-web FlatList scroll issue #1436](https://github.com/necolas/react-native-web/issues/1436) — confirmed longstanding bug
- [StyleSheet.create caching on web (Bendyworks)](https://bendyworks.com/blog/implementing-react-native-responsive-design-part-2/) — confirmed cached styles don't update on resize
- [RevenueCat cross-platform subscriptions](https://www.revenuecat.com/blog/engineering/cross-platform-subscriptions-ios-android-web/) — web billing architecture
- [RevenueCat Expo web billing demo](https://github.com/RevenueCat/expo-web-billing-demo) — official example for unified entitlements
- [DebugBear food site CLS analysis](https://www.debugbear.com/blog/media-publisher-web-performance-recipe-food-sites) — ad CLS patterns in recipe publishing vertical
- [Expo tree shaking docs](https://docs.expo.dev/guides/tree-shaking/) — bundle splitting for web
- [Expo Router platform-specific modules](https://docs.expo.dev/router/advanced/platform-specific-modules/) — .native.tsx/.web.tsx pattern

---

*Pitfalls research for: adding responsive web/tablet support, public browsing, and monetization to existing Expo React Native recipe app*
*Researched: 2026-03-03*

# OpenCode tool permissions (fixing rejected `bash`)

**Date:** 2026-02-02

## Incoming issue

During plan execution, all shell commands via the `bash` tool were rejected (even `pwd` / `git status`), blocking automated execution.

## Findings

- The project contains a repo-local `opencode.json` at `./opencode.json` that is **empty** (invalid JSON).
- The user-level OpenCode config at `~/.config/opencode/opencode.json` contains a `permission` block that allows `read`/`external_directory` but does **not** mention `bash`.

From OpenCode SDK types, tool permissions are configurable via `permission.bash` (values: `"ask" | "allow" | "deny"`), optionally as pattern rules.

## Update (2026-02-03): subagent name mismatch can still block shell

Even with repo-level `"permission": { "bash": "allow" }`, shell calls can still be rejected if you grant permissions to the wrong agent identifier.

- In this repo, there are two similarly named agents: `Gsd-Executor` and `gsd-executor`.
- If `opencode.json` only grants tool permissions under `agent.Gsd-Executor`, then runs invoked as `gsd-executor` may still inherit a default-deny tool policy (depending on your global config / OpenCode defaults).

Recommended fix: grant `bash` (and `shell` if used) to both keys under `"agent"`, and restart the OpenCode session so config reloads.

## Recommended fix

### Option A (recommended): enable `bash` for this project

Make `./opencode.json` valid JSON and allow `bash`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "permission": {
    "bash": "allow"
  }
}
```

Restart OpenCode session after changes.

### Option B: enable `bash` globally

Add `"bash": "allow"` under the `permission` block in `~/.config/opencode/opencode.json`.

### Option C: prompt every time

Use `"bash": "ask"` to have OpenCode prompt you to allow/reject each time.

## Specialist routing log

- **PM**: triaged as tooling/permissions blocker; routed to **Tech Lead** for fastest unblock.
- **Tech Lead**: confirmed permission keys include `bash` and empty `opencode.json` is invalid JSON (likely causing hard rejection).