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
