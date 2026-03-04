# Phase 8: Design Foundation - Research

**Researched:** 2026-03-03
**Domain:** Design tokens, responsive breakpoints, Expo font loading, cookbook.pen screen design
**Confidence:** HIGH (stack decisions; architecture patterns verified against official docs and current package state)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Extract all 24 existing cookbook.pen `$` variables into `tokens.ts` as TypeScript constants
- Add a font size scale (named sizes mapped from actual .pen usage: xs, sm, base, lg, xl, 2xl, 3xl)
- Add shadow tokens (sm, md, lg) for consistent card/modal elevation
- No spacing scale — spacing stays ad-hoc per .pen design values
- Token structure (flat vs nested): Claude's discretion
- Sign Up and Forgot Password follow the same layout pattern as the existing Login screen (mobile = full-screen form, tablet = centered card on gray bg, web = split hero + form). Different fields/copy, same structure.
- Profile/Settings: Single scrollable page with avatar, display name, email, unit preference (metric/imperial), and logout button. Not sectioned.
- Invite: Link sharing as primary interaction (generate/copy invite link), with optional email entry below.
- Draft Review: Collapsible photo on mobile — photo shown initially, collapses to thumbnail as user scrolls into extracted fields. Tablet/web: side-by-side (photo left, fields right).
- Mobile: <640px, Tablet: 640–1279px, Web: 1280+
- Native breakpoint detection via `useWindowDimensions` — iPad split-screen and multitasking adapt correctly
- Hook returns `{ breakpoint: 'mobile' | 'tablet' | 'web', width: number }`

### Claude's Discretion
- Token file structure (flat namespace vs nested by category)
- Font size scale exact values (derive from .pen screen analysis)
- Shadow token values
- Font loading implementation (splash hold, error fallback)
- Exact .pen design details for new screens (spacing, copy, icons) within the decided layout patterns

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DESIGN-01 | Design token system (`tokens.ts`) extracting all cookbook.pen `$` variables as TypeScript constants | Flat-with-category-prefix pattern; `src/lib/tokens.ts` location; no external library needed |
| DESIGN-02 | Breakpoint detection hook (`useBreakpoint`) returning mobile/tablet/web at thresholds | `useWindowDimensions` from react-native; works on web via react-native-web (already installed); thresholds: <640, 640–1279, 1280+ |
| DESIGN-03 | Font loading for Bricolage Grotesque and DM Sans via `@expo-google-fonts` | Two packages need installation; `expo-font` (v14.0.11) already installed; `expo-splash-screen` needs install; root `_layout.tsx` is the integration point |
| DESIGN-04 | Missing screen designs in cookbook.pen: Sign Up, Forgot Password, Profile/Settings, Invite, Draft Review (all 3 breakpoints each) | Layout patterns locked; design deliverable — not a code task; must exist before Phase 12 |
</phase_requirements>

---

## Summary

Phase 8 establishes the design primitives that every subsequent phase imports: a token file, a breakpoint hook, loaded fonts, and five new screen designs in cookbook.pen. Three of the four requirements (DESIGN-01, DESIGN-02, DESIGN-03) are pure code deliverables. DESIGN-04 is a design deliverable in cookbook.pen — it produces no code itself but unblocks Phase 12.

The code deliverables are low-risk. `useWindowDimensions` from `react-native` is already fully functional on web via `react-native-web` (already in package.json), and it re-renders on window resize — no custom event listener is needed. Font loading via `@expo-google-fonts` follows a well-documented pattern; the only new packages required are `@expo-google-fonts/bricolage-grotesque`, `@expo-google-fonts/dm-sans`, and `expo-splash-screen`. The `expo-font` package (v14.0.11) is already a transitive dependency.

The most important architectural decision for DESIGN-01 is token file structure. A flat-with-category-prefix namespace (`colorBrand`, `colorBackground`, `radiusMd`, etc.) is recommended over deeply nested objects — it eliminates destructuring verbosity at import sites, works naturally with TypeScript's `typeof tokens` pattern for type safety, and is idiomatic for React Native projects where Tailwind is unavailable.

**Primary recommendation:** Use flat-with-category-prefix token structure, `useFonts` from each `@expo-google-fonts` package combined into one call in `_layout.tsx`, and `useWindowDimensions` directly in the breakpoint hook with no third-party library.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `react-native` (useWindowDimensions) | already installed (RN 0.76.0) | Breakpoint detection on native and web | Built-in; works on web via react-native-web; auto-updates on resize |
| `expo-font` | 14.0.11 (already installed transitively) | Font asset loading infrastructure | Required peer of @expo-google-fonts packages |
| `@expo-google-fonts/bricolage-grotesque` | 0.3.0 (latest as of 2026-03) | Display font (Bricolage Grotesque) | Official Expo-maintained Google Fonts package |
| `@expo-google-fonts/dm-sans` | 0.4.2 (latest as of 2026-03) | Body font (DM Sans) | Official Expo-maintained Google Fonts package |
| `expo-splash-screen` | ~0.29.x (install via `npx expo install`) | Hold splash screen while fonts load | Standard companion to expo-font in Expo Router |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| None | — | No additional libraries needed | The entire design primitive stack is built on already-present or lightweight new packages |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `@expo-google-fonts` packages | Self-hosted font files in `assets/fonts/` | Self-hosting avoids network dependency at dev time but requires manual font file management and no auto-update path |
| `useWindowDimensions` hook | `react-native-responsive-screen`, `react-native-size-matters` | Third-party libs add bundle weight with no benefit here — thresholds are fixed and simple |
| Flat-prefix token file | Nested token object (`tokens.color.brand`, etc.) | Nested requires destructuring at every import site; flat is more ergonomic for `StyleSheet`-based code |

**Installation (new packages only):**
```bash
npx expo install @expo-google-fonts/bricolage-grotesque @expo-google-fonts/dm-sans expo-splash-screen
```

Note: `expo-font` is already installed as a transitive dependency of `expo` SDK 54. No explicit install needed but it should be listed explicitly in `package.json` for clarity.

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── lib/
│   ├── tokens.ts          # DESIGN-01: all design constants
│   └── hooks/
│       └── useBreakpoint.ts  # DESIGN-02: breakpoint hook
app/
└── _layout.tsx            # DESIGN-03: font loading integration
```

These three files are the complete code surface of Phase 8. No feature directory is needed — tokens and the breakpoint hook are app-wide shared primitives, not feature-specific.

### Pattern 1: Flat-with-Category-Prefix Token Structure

**What:** All tokens in a single `tokens.ts` file exported as named constants using a category prefix. No nesting.

**When to use:** Always for this project. The inline `StyleSheet` pattern used throughout the project (`StyleSheet.create({ ... })`) benefits from flat access — no destructuring step is needed.

**Example:**
```typescript
// src/lib/tokens.ts
// Source: project convention + React Native StyleSheet pattern

// Colors (extracted from cookbook.pen $ variables)
export const colorBrand = '#your-brand-color';
export const colorBackground = '#your-bg-color';
export const colorSurface = '#your-surface-color';
export const colorBorder = '#your-border-color';
export const colorTextPrimary = '#your-primary-text';
export const colorTextSecondary = '#your-secondary-text';
// ... all 24 cookbook.pen $ color/radius/font variables

// Font size scale (derive exact values from .pen screen analysis)
export const fontSizeXs = 12;
export const fontSizeSm = 14;
export const fontSizeBase = 16;
export const fontSizeLg = 18;
export const fontSizeXl = 20;
export const fontSize2xl = 24;
export const fontSize3xl = 30;

// Font families (strings matching useFonts keys)
export const fontFamilyDisplay = 'BricolageGrotesque_600SemiBold';
export const fontFamilyBody = 'DMSans_400Regular';
export const fontFamilyBodyMedium = 'DMSans_500Medium';
export const fontFamilyBodyBold = 'DMSans_700Bold';

// Border radii (from cookbook.pen $ variables)
export const radiusSm = 8;
export const radiusMd = 12;
export const radiusLg = 16;
export const radiusFull = 9999;

// Shadows
export const shadowSm = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.08,
  shadowRadius: 2,
  elevation: 2,
};
export const shadowMd = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.10,
  shadowRadius: 4,
  elevation: 4,
};
export const shadowLg = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.12,
  shadowRadius: 8,
  elevation: 8,
};
```

**Usage at a call site:**
```typescript
import { colorBrand, fontSizeBase, radiusMd, shadowMd } from '@/lib/tokens';

const styles = StyleSheet.create({
  button: {
    backgroundColor: colorBrand,
    borderRadius: radiusMd,
    ...shadowMd,
  },
  label: {
    fontSize: fontSizeBase,
  },
});
```

### Pattern 2: useBreakpoint Hook

**What:** A thin wrapper around `useWindowDimensions` that maps pixel width to a named breakpoint.

**When to use:** Any component that renders differently across mobile/tablet/web. Called inside the component body (not cached in StyleSheet.create — this is the v1.1 mandate from STATE.md).

**Critical constraint from STATE.md:** "All dimension-sensitive styles must be computed inside components from `useBreakpoint()` — NOT cached in `StyleSheet.create`."

**Example:**
```typescript
// src/lib/hooks/useBreakpoint.ts
// Source: React Native docs (useWindowDimensions) + project CONTEXT.md thresholds

import { useWindowDimensions } from 'react-native';

export type Breakpoint = 'mobile' | 'tablet' | 'web';

export interface BreakpointResult {
  breakpoint: Breakpoint;
  width: number;
}

export function useBreakpoint(): BreakpointResult {
  const { width } = useWindowDimensions();

  let breakpoint: Breakpoint;
  if (width >= 1280) {
    breakpoint = 'web';
  } else if (width >= 640) {
    breakpoint = 'tablet';
  } else {
    breakpoint = 'mobile';
  }

  return { breakpoint, width };
}
```

**Usage:**
```typescript
// Inside a component — NOT in StyleSheet.create
function MyScreen() {
  const { breakpoint } = useBreakpoint();

  return (
    <View style={{ padding: breakpoint === 'mobile' ? 16 : 32 }}>
      ...
    </View>
  );
}
```

### Pattern 3: Font Loading in _layout.tsx

**What:** Load both font families in the root layout using `useFonts` and hold the splash screen until loading resolves.

**When to use:** Exactly once, in `app/_layout.tsx`. All screens downstream inherit loaded fonts.

**Expo Router behavior note (MEDIUM confidence):** There are documented cases where Expo Router on Android in development builds can override `SplashScreen.preventAutoHideAsync()`. This does not affect release builds and is not a blocker. The `return null` guard (while fonts load) is the reliable pattern.

**Example:**
```typescript
// app/_layout.tsx
// Source: https://docs.expo.dev/develop/user-interface/fonts/ (official Expo docs)

import { useFonts } from '@expo-google-fonts/bricolage-grotesque/useFonts';
import {
  BricolageGrotesque_400Regular,
  BricolageGrotesque_600SemiBold,
  BricolageGrotesque_700Bold,
} from '@expo-google-fonts/bricolage-grotesque';
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_700Bold,
} from '@expo-google-fonts/dm-sans';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { SessionProvider } from '@/features/auth/session';

// Call at module level — before any component renders
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    BricolageGrotesque_400Regular,
    BricolageGrotesque_600SemiBold,
    BricolageGrotesque_700Bold,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  // Return null keeps splash visible; fontsLoaded || fontError proceeds either way
  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <SessionProvider>
      <Stack screenOptions={{ headerTitle: 'Cookbook' }} />
    </SessionProvider>
  );
}
```

**Note on combining useFonts from two packages:** The pattern above passes all fonts into a single `useFonts` call from one package's hook. Alternatively, import `useFonts` from `expo-font` directly and pass all variants from both packages — this is equivalent. The single-call pattern is simpler.

**Alternative (using expo-font directly):**
```typescript
import { useFonts } from 'expo-font';
import { BricolageGrotesque_600SemiBold } from '@expo-google-fonts/bricolage-grotesque';
import { DMSans_400Regular } from '@expo-google-fonts/dm-sans';

const [fontsLoaded, fontError] = useFonts({
  BricolageGrotesque_600SemiBold,
  DMSans_400Regular,
});
```

### Anti-Patterns to Avoid

- **Caching breakpoint-dependent styles in StyleSheet.create:** `StyleSheet.create` runs once at module load — it cannot respond to window resize. Breakpoint styles MUST be inline or computed per render. (This is explicitly documented in STATE.md.)
- **Importing fonts from both packages' useFonts hooks simultaneously:** Only call `useFonts` once. Pass all font variants to a single `useFonts` call.
- **Using `Dimensions.get('window')` instead of `useWindowDimensions`:** `Dimensions.get` is a one-time snapshot and does not re-render on web window resize. Always use the hook.
- **Shadowing token names with local variables:** If you name a local variable `colorBrand`, you shadow the token silently. Use the token directly or alias with a descriptive name.
- **Providing fontFamily strings without loading:** If a font is applied via `fontFamily: 'BricolageGrotesque_600SemiBold'` but that variant was not included in `useFonts`, React Native will silently fall back to the system font.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Window resize detection on web | Custom `window.addEventListener('resize', ...)` | `useWindowDimensions` from react-native | react-native-web implements this hook correctly and handles cleanup |
| Font file bundling | Copy .ttf files into assets/ and load via `Font.loadAsync` | `@expo-google-fonts` packages | Google Fonts packages bundle the font files; no manual management or licensing research needed |
| Debounced resize hook | Custom debounce logic in useBreakpoint | No debounce needed | `useWindowDimensions` already batches React state updates; extra debouncing adds latency for no benefit at 3-breakpoint granularity |

**Key insight:** The entire breakpoint hook is ~15 lines. The font loading pattern is ~30 lines. The complexity is near-zero — the risk is in getting the specific thresholds and font variant names exactly right, not in building custom infrastructure.

---

## Common Pitfalls

### Pitfall 1: Wrong Font Variant String Keys

**What goes wrong:** Styles referencing `fontFamily: 'BricolageGrotesque_SemiBold'` (incorrect) instead of `fontFamily: 'BricolageGrotesque_600SemiBold'` (correct) — text falls back to system font silently.

**Why it happens:** The font variant key is the exact string exported by the package. No shorthand exists.

**How to avoid:** Always use the token constant (`fontFamilyDisplay` from `tokens.ts`) rather than the raw string. The token file is the single source of truth for font family strings. Verify the exact export names from `@expo-google-fonts/bricolage-grotesque` and `@expo-google-fonts/dm-sans` package contents.

**Warning signs:** Text renders in system sans-serif when you expect a custom font. Check for typos in fontFamily strings.

### Pitfall 2: Breakpoint-Sensitive Styles in StyleSheet.create

**What goes wrong:** `StyleSheet.create({ container: { padding: breakpoint === 'mobile' ? 16 : 32 } })` — `breakpoint` is not available at StyleSheet creation time, causing runtime errors or stale values.

**Why it happens:** `StyleSheet.create` runs at module initialization, not inside a component or hook. The window width is not available then.

**How to avoid:** For all dimension-sensitive values: compute inline, or compute in the component body using `useBreakpoint()` and pass as a `style` prop.

**Warning signs:** TypeScript will error if you try to call a hook outside a component; but if you use a module-level `Dimensions.get()` instead, TypeScript won't catch it and the value will be stale on web resize.

### Pitfall 3: SplashScreen.preventAutoHideAsync Called Too Late

**What goes wrong:** If `SplashScreen.preventAutoHideAsync()` is called inside a component or useEffect, the splash screen may have already auto-hidden before the call executes on first render.

**Why it happens:** The call must happen synchronously during module evaluation, before React renders anything.

**How to avoid:** Call `SplashScreen.preventAutoHideAsync()` at the **module level** in `_layout.tsx` (outside the component function, at the top of the file). This is the pattern shown in official Expo docs and confirmed to work.

**Warning signs:** On cold start, you see a flash of unstyled text (FOUT) before fonts load.

### Pitfall 4: Token Values Not Matching cookbook.pen

**What goes wrong:** The 24 `$` variables in cookbook.pen are the source of truth. If `tokens.ts` values diverge (color value copied incorrectly, radius off by a pixel), every screen in Phases 9–13 will be subtly wrong.

**Why it happens:** Manual extraction from .pen to TypeScript is error-prone.

**How to avoid:** Read cookbook.pen's variable definitions verbatim as the first step of creating `tokens.ts`. Do not guess or approximate values.

**Warning signs:** Colors appear slightly off compared to cookbook.pen previews; requires cross-checking at each phase.

### Pitfall 5: expo-splash-screen Not in package.json

**What goes wrong:** `expo-splash-screen` is a peer/sibling of `expo-font` but is NOT listed in the project's current `package.json`. It exists as a transitive dependency of `expo` SDK, but relying on it transitively without listing it will cause errors if the SDK reorganizes its dependencies.

**Why it happens:** The project was initialized without splash screen usage.

**How to avoid:** Install explicitly: `npx expo install expo-splash-screen`. Confirm it appears in `package.json` after install.

---

## Code Examples

### useBreakpoint with inline responsive styles

```typescript
// Source: React Native docs (useWindowDimensions), project CONTEXT.md thresholds
function AuthCard() {
  const { breakpoint } = useBreakpoint();

  const containerStyle = breakpoint === 'mobile'
    ? { flex: 1, padding: 24 }
    : breakpoint === 'tablet'
    ? { alignSelf: 'center' as const, width: 480, padding: 32, backgroundColor: colorBackground }
    : { flexDirection: 'row' as const, flex: 1 };

  return <View style={containerStyle}>{/* ... */}</View>;
}
```

### Tokens in StyleSheet (non-dimension-sensitive values only)

```typescript
// Non-breakpoint values CAN be in StyleSheet.create — colors, radii, font sizes are safe
import { colorBrand, radiusMd, fontSizeBase, fontFamilyBody } from '@/lib/tokens';

const styles = StyleSheet.create({
  button: {
    backgroundColor: colorBrand,
    borderRadius: radiusMd,
  },
  text: {
    fontSize: fontSizeBase,
    fontFamily: fontFamilyBody,
  },
});
```

### Shadow tokens in use

```typescript
import { shadowMd, colorSurface, radiusMd } from '@/lib/tokens';

const cardStyle = {
  backgroundColor: colorSurface,
  borderRadius: radiusMd,
  ...shadowMd,  // Spread the shadow token object
};
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `AppLoading` from expo-app-loading | `return null` guard + `SplashScreen.hideAsync()` in useEffect | Expo SDK 49+ | AppLoading is deprecated; new pattern is cleaner |
| `Dimensions.addEventListener` + snapshot | `useWindowDimensions` hook | React Native 0.61+ | Hook auto-updates on resize; no manual subscription |
| `Font.loadAsync` imperatively | `useFonts` hook from @expo-google-fonts | expo-font 10+ | Hook pattern integrates with Suspense-like loading state |
| Individual font file imports per font | Scoped `useFonts` from package + per-variant imports | @expo-google-fonts v0.3+ | New package structure — each variant is a separate module |

**Deprecated/outdated:**
- `AppLoading` (expo-app-loading): Removed from SDK 49. Do not use.
- `Dimensions.get('window')` outside a component: Use `useWindowDimensions` hook instead.
- `useFonts` from `@expo-google-fonts/[font-name]` root import: New packages use `@expo-google-fonts/[font-name]/useFonts` subpath. Both may work but subpath is current.

---

## Open Questions

1. **cookbook.pen exact `$` variable values**
   - What we know: There are 24 `$` variables covering colors, font references, and radii.
   - What's unclear: The exact hex values, font-size numbers, and radius pixel values are not extractable from this research — they live in cookbook.pen.
   - Recommendation: The implementation task for DESIGN-01 must start by reading all `$` variables from cookbook.pen verbatim before writing any token value.

2. **Which Bricolage Grotesque and DM Sans weights are actually used in cookbook.pen**
   - What we know: Bricolage Grotesque is the display font, DM Sans is the body font. Both packages offer multiple weights.
   - What's unclear: Exact weights used (400/600/700? other?) are determined by .pen screen analysis.
   - Recommendation: Load only the weights that appear in cookbook.pen. Loading all 7 Bricolage + 18 DM Sans variants would add unnecessary bundle weight. Recommended starting set: BricolageGrotesque_600SemiBold + BricolageGrotesque_700Bold for display; DMSans_400Regular + DMSans_500Medium + DMSans_700Bold for body. Adjust after .pen analysis.

3. **Tablet nav pattern ambiguity in cookbook.pen (watch item from STATE.md)**
   - What we know: STATE.md explicitly flags "Tablet nav pattern (768px) is ambiguous in cookbook.pen — must be resolved in .pen before Phase 9 implements TabletHeader."
   - What's unclear: The tablet header design is incomplete/unclear in the current .pen file.
   - Recommendation: DESIGN-04 (the 5 new screen designs) is an opportunity to simultaneously resolve the tablet nav ambiguity. This should be a design deliverable within Phase 8 or clearly handed off as a blocker to Phase 9.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Jest 30 + ts-jest |
| Config file | `/Users/elinicholson/development/cookbook/jest.config.js` |
| Quick run command | `npx jest --testPathPattern="src/lib" --no-coverage` |
| Full suite command | `npx jest` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DESIGN-01 | `tokens.ts` exports are valid TypeScript constants and importable | unit | `npx jest --testPathPattern="tokens" --no-coverage` | Wave 0 |
| DESIGN-02 | `useBreakpoint()` returns correct breakpoint for widths 390, 768, 1440 | unit | `npx jest --testPathPattern="useBreakpoint" --no-coverage` | Wave 0 |
| DESIGN-03 | Fonts load in `_layout.tsx` | manual-only | N/A — requires native/browser render | N/A |
| DESIGN-04 | .pen designs exist for 5 screens × 3 breakpoints | manual-only | N/A — design deliverable, no code | N/A |

**Note on DESIGN-03 and DESIGN-04:** These cannot be automatically tested. DESIGN-03 is verified visually by running the app on device/simulator and confirming Bricolage Grotesque and DM Sans render (not system fallback). DESIGN-04 is verified by reviewing cookbook.pen for the completed screens.

**Note on `useBreakpoint` unit testing:** Since `useWindowDimensions` is a React hook, testing `useBreakpoint` requires either React Testing Library or a simple mock. The Jest environment is `node` (per jest.config.js), so RN component rendering is not available. The test should mock `useWindowDimensions` and test the breakpoint logic:

```typescript
// src/lib/hooks/__tests__/useBreakpoint.test.ts
jest.mock('react-native', () => ({
  useWindowDimensions: jest.fn(),
}));

import { useWindowDimensions } from 'react-native';
// Note: because useBreakpoint uses a hook internally, the logic
// should be extractable into a pure helper for testability
```

**Recommendation:** Extract the breakpoint-mapping logic into a pure function `getBreakpoint(width: number): Breakpoint` and test that. The hook simply calls `useWindowDimensions` and passes width to the pure function. This makes unit testing trivial without needing a React renderer.

### Sampling Rate
- **Per task commit:** `npx jest --testPathPattern="tokens|useBreakpoint" --no-coverage`
- **Per wave merge:** `npx jest`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/lib/__tests__/tokens.test.ts` — covers DESIGN-01 (token exports exist and have correct types)
- [ ] `src/lib/hooks/__tests__/useBreakpoint.test.ts` — covers DESIGN-02 (breakpoint logic correctness)

*(No framework install needed — Jest + ts-jest already configured)*

---

## Sources

### Primary (HIGH confidence)
- Official Expo Docs: https://docs.expo.dev/develop/user-interface/fonts/ — font loading pattern with SplashScreen
- Official Expo Docs: https://docs.expo.dev/versions/latest/sdk/splash-screen/ — SplashScreen API (SDK 52+)
- React Native Docs: https://reactnative.dev/docs/usewindowdimensions — useWindowDimensions API and behavior
- GitHub expo/google-fonts: https://github.com/expo/google-fonts/tree/main/font-packages/bricolage-grotesque — Bricolage Grotesque variants and install pattern
- GitHub expo/google-fonts: https://github.com/expo/google-fonts/tree/main/font-packages/dm-sans — DM Sans variants and install pattern
- Project package.json — expo-font 14.0.11 already installed as transitive dep
- Project package.json — react-native-web 0.21.0 already installed (confirms useWindowDimensions works on web)

### Secondary (MEDIUM confidence)
- WebSearch-verified: SplashScreen.preventAutoHideAsync() must be called at module level (multiple sources confirm, matches official docs)
- WebSearch-verified: Combined useFonts from expo-font directly works with multiple @expo-google-fonts packages
- GitHub expo/expo issue #40464 — Expo Router may override splash screen on Android dev builds; does not affect release builds

### Tertiary (LOW confidence)
- Package versions for @expo-google-fonts/bricolage-grotesque (0.3.0) and @expo-google-fonts/dm-sans (0.4.2): from WebSearch results — verify against npm at install time

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — `useWindowDimensions` is official RN API; @expo-google-fonts packages are official Expo-maintained; expo-font already installed; expo-splash-screen is standard
- Architecture: HIGH — token structure, hook shape, and font loading pattern all verified against official docs
- Pitfalls: HIGH — font string key pitfall and StyleSheet.create pitfall are verified against project STATE.md and RN behavior; splash screen timing pitfall verified via official docs pattern

**Research date:** 2026-03-03
**Valid until:** 2026-04-03 (30 days — expo-font and expo-google-fonts are stable packages)
