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
