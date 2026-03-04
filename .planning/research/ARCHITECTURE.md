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
