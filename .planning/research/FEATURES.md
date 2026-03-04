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
