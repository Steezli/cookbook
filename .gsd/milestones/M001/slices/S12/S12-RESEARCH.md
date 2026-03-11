# Phase 12: Remaining Screens - Research

**Researched:** 2026-03-08
**Domain:** React Native / Expo responsive screen rebuilds (collections, family, scan/draft, auth, profile, invite)
**Confidence:** HIGH

## Summary

Phase 12 covers six screen groups that all need the same treatment: rebuild from hardcoded StyleSheet.create to responsive, tokens-based, cookbook.pen-matching layouts at three breakpoints (mobile < 640, tablet 640-1279, web >= 1280). Every screen already exists with functional logic and API integrations -- the work is purely UI rebuilding using established patterns from Phase 10.

The critical additional requirement is social OAuth (Google, Apple, Facebook) on auth screens and the photo display in draft review. Social OAuth requires new packages (expo-auth-session, expo-apple-authentication) and Supabase OAuth provider configuration. The scan/draft screen needs the photo actually rendered (currently a placeholder) with responsive layout (collapsible on mobile, side-by-side on tablet/web).

**Primary recommendation:** Treat this as six independent UI rebuild tasks following the Phase 10 RecipeCard/RecipeList pattern -- each screen gets useBreakpoint(), tokens, PageContainer, and responsive inline styles. Social OAuth is the only genuinely new feature requiring research beyond established patterns.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Collections: Follow cookbook.pen exactly for collection list view layout and styling
- Collection detail screen uses RecipeCard grid -- if existing RecipeCard does not match .pen, update RecipeCard to match first, then reuse everywhere
- Create collection flow follows cookbook.pen exactly (modal or full screen -- whatever .pen shows)
- Scan flow presentation (modal vs full screen) follows cookbook.pen exactly
- Draft review follows Phase 8 decision + cookbook.pen: collapsible photo on mobile (starts visible, collapses to thumbnail on scroll), side-by-side photo + fields on tablet/web
- Multi-photo scans: follow cookbook.pen or Claude's discretion for gallery/carousel UX
- Scan upload supports both camera capture and photo library selection
- Auth screens: Follow cookbook.pen exactly for all styling, layout, and hero content
- Auth layout pattern from Phase 8: full-screen form on mobile, centered card on tablet, split hero + form on web
- Social login buttons included: Google, Apple, and Facebook
- Social auth via Supabase OAuth integration
- Family management: Follow cookbook.pen exactly for family member list, roles, invite flow, and admin controls
- Keep existing functionality: member list, roles, invite, remove member, transfer ownership
- Profile/Settings: Follow cookbook.pen exactly for all fields and sections; single scrollable page with avatar, display name, email, unit preference, logout
- Net-new screen implementation matching .pen spec at all 3 breakpoints
- Invite: Family-scoped invites; each invite link tied to a specific family
- Dual-path invite handling: existing users join directly; new users redirect to signup with token preserved
- Native share sheet (expo-sharing / Share API) for sending invite links, with copy-to-clipboard as fallback
- Link sharing primary, optional email entry below

### Claude's Discretion
- Exact empty state designs across all Phase 12 screens
- Loading skeleton patterns
- Error state handling
- Multi-photo gallery implementation approach for draft review
- Collection "add recipe" UX flow direction (from recipe detail vs from collection detail)
- Social auth SDK integration details (native vs web OAuth flows)
- Invite token preservation through signup flow implementation details

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SCREEN-05 | Collections screens rebuilt to cookbook.pen spec at all 3 breakpoints | Existing collections API is complete (CRUD + add/remove recipes). UI needs full rebuild with tokens, useBreakpoint, RecipeCard grid on detail screen. |
| SCREEN-06 | Family management screens rebuilt to cookbook.pen spec at all 3 breakpoints | Existing family API (list, create, invite, members) is functional. UI rebuild with responsive layout, tokens, member cards. |
| SCREEN-07 | Scan/Draft screens rebuilt to cookbook.pen spec at all 3 breakpoints with scan photo display in draft review | Scan upload exists (expo-image-picker for library, needs camera capture). DraftReview has photo placeholder -- must render actual photo. Mobile: collapsible photo. Tablet/Web: side-by-side. |
| SCREEN-08 | Auth screens (Login, Sign Up, Forgot Password) rebuilt to cookbook.pen spec at all 3 breakpoints | Existing auth logic is solid (signInWithPassword, signUp, password reset). Needs responsive layout (mobile: full-screen, tablet: centered card, web: split hero + form) plus social OAuth buttons. |
| SCREEN-09 | Profile/Settings screen implemented to cookbook.pen spec at all 3 breakpoints | Current profile.tsx (242 lines) has unit preference + logout. Needs avatar, display name editing, full responsive rebuild. |
| SCREEN-10 | Invite screen implemented to cookbook.pen spec at all 3 breakpoints | Current invite/[token].tsx works (auto-accept + manual accept). Needs responsive UI, share sheet for sending invites, copy-to-clipboard fallback. |
</phase_requirements>

## Standard Stack

### Core (Already Installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| expo-router | ~6.0.23 | File-based routing | Already used for all navigation |
| expo-image-picker | ^17.0.10 | Photo library + camera capture | Already installed, used in scan upload |
| @supabase/supabase-js | ^2.49.1 | Backend, auth, OAuth | Already integrated |
| lucide-react-native | ^0.577.0 | Icons | Project standard |
| react-native-safe-area-context | ~5.6.0 | Safe area insets | Used in PageContainer |

### New Dependencies Required
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| expo-auth-session | ~6.x | OAuth redirect handling for Google/Facebook | Required for web OAuth flow with Supabase |
| expo-apple-authentication | ~7.x | Native Apple Sign In on iOS | Required for Apple OAuth (App Store policy) |
| expo-clipboard | ~7.x | Copy invite link to clipboard | Fallback for share sheet |
| expo-web-browser | ~14.x | Open OAuth browser for Google/Facebook on native | Peer dependency for expo-auth-session |

### Not Needed
| Instead of | Why Not |
|------------|---------|
| expo-sharing | Share API from react-native already available and used in DraftManager.tsx |
| expo-camera | expo-image-picker with `launchCameraAsync` covers camera capture without separate camera package |
| Custom image component | React Native `Image` + Expo Image suffice for photo display in draft review |

**Installation:**
```bash
npx expo install expo-auth-session expo-apple-authentication expo-clipboard expo-web-browser
```

## Architecture Patterns

### Recommended Project Structure
No new directories needed. All screens already have file-system routes:
```
app/
  (auth)/
    login.tsx          # Rebuild: responsive + social OAuth
    signup.tsx         # Rebuild: responsive + social OAuth
    forgot-password.tsx # Rebuild: responsive
  (tabs)/
    collections/
      index.tsx        # Rebuild: responsive grid
      [id].tsx         # Rebuild: responsive + RecipeCard grid
      create.tsx       # Rebuild: responsive
    family/
      index.tsx        # Rebuild: responsive
      [id].tsx         # Rebuild: responsive + invite share
    profile.tsx        # Full rebuild: responsive + avatar + display name
    invite/
      [token].tsx      # Rebuild: responsive
  scan/
    index.tsx          # Rebuild: responsive scan upload
    draft/
      [id].tsx         # Rebuild: responsive + actual photo display
```

### Pattern 1: Responsive Screen Rebuild (Phase 10 Established Pattern)
**What:** Replace StyleSheet.create with inline responsive styles using useBreakpoint + tokens
**When to use:** Every screen in this phase
**Example:**
```typescript
import { useBreakpoint } from '@/lib/hooks/useBreakpoint';
import { PageContainer } from '@/components/nav/PageContainer';
import { fontFamilyDisplay, textPrimary, fontSize2xl, bgPage } from '@/lib/tokens';

export default function SomeScreen() {
  const { breakpoint } = useBreakpoint();
  const isMobile = breakpoint === 'mobile';

  return (
    <PageContainer>
      <View style={{
        padding: isMobile ? 16 : 32,
        flexDirection: breakpoint === 'web' ? 'row' : 'column',
      }}>
        {/* content */}
      </View>
    </PageContainer>
  );
}
```

### Pattern 2: Auth Screen Three-Breakpoint Layout
**What:** Mobile: full-screen form. Tablet: centered card (max-width ~480). Web: split layout (hero left + form right)
**When to use:** Login, Signup, Forgot Password screens
**Example:**
```typescript
const { breakpoint } = useBreakpoint();

// Mobile: full-screen form, no card wrapper
// Tablet: centered card with max-width
// Web: flex-row split -- hero image/branding left, form card right

const containerStyle = breakpoint === 'web'
  ? { flexDirection: 'row' as const, flex: 1 }
  : { flex: 1, justifyContent: 'center' as const, alignItems: 'center' as const };

const formStyle = breakpoint === 'mobile'
  ? { flex: 1, padding: 24 }
  : { maxWidth: 480, width: '100%' as const, padding: 32, ...shadowMd, borderRadius: radiusMd };
```

### Pattern 3: Collapsible Photo in Draft Review (Mobile)
**What:** Photo starts visible, collapses to thumbnail on scroll
**When to use:** Draft review screen, mobile breakpoint only
**Example approach:**
```typescript
// Use ScrollView onScroll to detect scroll position
// When scrolled past threshold, shrink photo to thumbnail
// Animated.Value drives height transition
// Tablet/Web: photo always visible in side column
const scrollY = useRef(new Animated.Value(0)).current;
const photoHeight = scrollY.interpolate({
  inputRange: [0, 200],
  outputRange: [300, 60],
  extrapolate: 'clamp',
});
```

### Pattern 4: Supabase Social OAuth
**What:** Google, Apple, Facebook login via Supabase signInWithOAuth
**When to use:** Auth screens
**Example:**
```typescript
import { supabase } from '@/lib/supabase';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

// For Google/Facebook on native:
async function signInWithGoogle() {
  const redirectUrl = AuthSession.makeRedirectUri({ path: 'auth/callback' });
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: redirectUrl },
  });
  if (data?.url) {
    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
    // Handle result...
  }
}

// For Apple on iOS -- use native module:
import * as AppleAuthentication from 'expo-apple-authentication';
async function signInWithApple() {
  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
  });
  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token: credential.identityToken!,
  });
}
```

### Anti-Patterns to Avoid
- **StyleSheet.create for dimension-sensitive styles:** Project constraint -- all breakpoint-dependent styles must be inline, computed from useBreakpoint()
- **Tailwind CSS classes:** Not available in React Native (ScanPhotoUpload.tsx web component uses them -- needs full rewrite to RN)
- **Hardcoded colors:** Use tokens.ts constants, never raw hex in new code
- **Dimensions.get('window'):** Use useBreakpoint() which uses useWindowDimensions internally
- **TouchableOpacity:** Project uses Pressable consistently in Phase 10+ code
- **position: 'fixed':** Does not work in React Native, use Modal component instead

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| OAuth flows | Custom OAuth redirect handling | expo-auth-session + expo-web-browser | Handles PKCE, deep linking, browser session cleanup |
| Apple Sign In | Custom Apple auth | expo-apple-authentication | Required by Apple for native Sign In with Apple |
| Clipboard | Manual clipboard API | expo-clipboard | Cross-platform, handles web + native |
| Image picking | Custom camera/gallery UI | expo-image-picker (already installed) | Handles permissions, camera + library, multi-select |
| Share sheet | Custom share dialog | React Native Share API (already used in DraftManager.tsx) | Native share sheets on iOS/Android, web fallback |
| Responsive containers | Per-screen padding/max-width | PageContainer component | Already built, tested, consistent |
| Scroll-based animations | Manual scroll listeners | Animated API (already available in RN) | Handles interpolation, native driver |

**Key insight:** Every screen in this phase has existing business logic and API layer. The work is purely UI layer -- do not modify API functions, Supabase queries, or data models.

## Common Pitfalls

### Pitfall 1: ScanPhotoUpload Uses Web HTML/Tailwind
**What goes wrong:** The existing `src/features/scans/ScanPhotoUpload.tsx` uses HTML elements (`<div>`, `<input>`, `className`) while `src/features/scan/ScanPhotoUpload.tsx` (different path) uses React Native. There are TWO scan photo upload components in different directories.
**Why it happens:** v1.0 had a web-only scan component; v1.1 added a React Native version.
**How to avoid:** Use the React Native version at `src/features/scan/ScanPhotoUpload.tsx` as the base. The web HTML version should be deprecated or platform-branched.
**Warning signs:** Build errors about `className` or `div` not being valid React Native elements.

### Pitfall 2: FlatList on Web Requires flex Workaround
**What goes wrong:** FlatList inside flex containers shows zero height on web.
**Why it happens:** React Native Web FlatList needs explicit flex constraints.
**How to avoid:** Use `flexGrow: 1, flexBasis: 0` instead of `flex: 1`. Set `key={numColumns}` when numColumns changes per breakpoint.
**Warning signs:** Empty space where list should render on web.

### Pitfall 3: Social OAuth Provider Configuration Missing
**What goes wrong:** signInWithOAuth returns error because providers not configured in Supabase dashboard.
**Why it happens:** OAuth requires Supabase project config (client IDs, secrets, redirect URIs) before code works.
**How to avoid:** Document that Supabase dashboard configuration is a prerequisite. Code the UI and OAuth calls, but test will require dashboard setup.
**Warning signs:** "Provider not enabled" errors from Supabase.

### Pitfall 4: Apple Sign In Only Available on iOS
**What goes wrong:** AppleAuthentication.signInAsync crashes or is unavailable on Android/web.
**Why it happens:** Apple Sign In native module only works on iOS.
**How to avoid:** Check `AppleAuthentication.isAvailableAsync()` before showing button. On web/Android, use signInWithOAuth for Apple instead of native module.
**Warning signs:** Crash on Android when tapping Apple Sign In button.

### Pitfall 5: Invite Token Lost During Signup Redirect
**What goes wrong:** User clicks invite link, redirected to signup, token not carried through.
**Why it happens:** The `next` param must be preserved across the auth flow.
**How to avoid:** Existing pattern already handles this -- login.tsx and signup.tsx both read `next` from useLocalSearchParams and pass it through. Verify this chain remains intact after rebuild.
**Warning signs:** User signs up from invite link but does not auto-join family.

### Pitfall 6: Draft Review Photo URL Retrieval
**What goes wrong:** Photo placeholder remains because actual photo URL is not fetched from Supabase storage.
**Why it happens:** DraftReview currently shows placeholder text instead of loading the scan photo.
**How to avoid:** Fetch the scan job's photo URL from Supabase storage using the job ID. The scan_jobs table should reference the storage path.
**Warning signs:** "Original photo would be displayed here" text still visible.

### Pitfall 7: Camera Launch on Web
**What goes wrong:** `ImagePicker.launchCameraAsync()` does not work on web.
**Why it happens:** Browser security model does not allow direct camera access the same way.
**How to avoid:** On web, only show photo library option or use the browser's native file input with `capture` attribute. Platform-branch the scan upload UI.
**Warning signs:** Crash or "camera not available" on web when tapping camera button.

## Code Examples

### Responsive Collection List with RecipeCard Grid
```typescript
// Follow Phase 10 recipe list pattern exactly
import { getNumColumns } from '@/components/recipes/recipeCardUtils';

const { breakpoint } = useBreakpoint();
const numColumns = getNumColumns(breakpoint);

<FlatList
  data={collections}
  numColumns={numColumns}
  key={numColumns}
  columnWrapperStyle={numColumns > 1 ? { gap: 16 } : undefined}
  contentContainerStyle={{ gap: 16 }}
  style={{ flexGrow: 1, flexBasis: 0 }}
  renderItem={({ item }) => <CollectionCard collection={item} />}
/>
```

### Auth Screen Responsive Layout Shell
```typescript
const { breakpoint } = useBreakpoint();

if (breakpoint === 'web') {
  return (
    <View style={{ flexDirection: 'row', flex: 1, backgroundColor: bgPage }}>
      {/* Hero panel -- left side */}
      <View style={{ flex: 1, backgroundColor: accentWarm, justifyContent: 'center', alignItems: 'center' }}>
        {/* App branding, illustration per cookbook.pen */}
      </View>
      {/* Form panel -- right side */}
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <View style={{ maxWidth: 400, width: '100%', padding: 40 }}>
          {/* Form fields */}
        </View>
      </View>
    </View>
  );
}

// Tablet: centered card
if (breakpoint === 'tablet') {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: bgPage }}>
      <View style={{ maxWidth: 480, width: '100%', padding: 32, ...shadowMd, borderRadius: radiusMd, backgroundColor: white }}>
        {/* Form fields */}
      </View>
    </View>
  );
}

// Mobile: full-screen form
return (
  <View style={{ flex: 1, padding: 24, justifyContent: 'center', backgroundColor: bgPage }}>
    {/* Form fields */}
  </View>
);
```

### Social Login Button Row
```typescript
<View style={{ gap: 12, marginTop: 16 }}>
  <Pressable style={socialButtonStyle} onPress={signInWithGoogle}>
    <GoogleIcon />
    <Text style={socialButtonText}>Continue with Google</Text>
  </Pressable>

  {Platform.OS === 'ios' ? (
    <AppleAuthentication.AppleAuthenticationButton
      buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
      buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
      onPress={signInWithApple}
      style={{ height: 48 }}
    />
  ) : (
    <Pressable style={socialButtonStyle} onPress={signInWithAppleOAuth}>
      <AppleIcon />
      <Text style={socialButtonText}>Continue with Apple</Text>
    </Pressable>
  )}

  <Pressable style={socialButtonStyle} onPress={signInWithFacebook}>
    <FacebookIcon />
    <Text style={socialButtonText}>Continue with Facebook</Text>
  </Pressable>
</View>
```

### Share Invite Link
```typescript
import { Share, Platform } from 'react-native';
import * as Clipboard from 'expo-clipboard';

async function shareInviteLink(token: string) {
  const inviteUrl = `https://cookbook.app/invite/${token}`;

  try {
    await Share.share({
      message: `Join our family on Cookbook! ${inviteUrl}`,
      url: Platform.OS === 'ios' ? inviteUrl : undefined,
    });
  } catch {
    // Fallback: copy to clipboard
    await Clipboard.setStringAsync(inviteUrl);
    Alert.alert('Copied!', 'Invite link copied to clipboard.');
  }
}
```

## State of the Art

| Old Approach (Current Code) | Current Approach (Phase 12 Target) | Impact |
|-----|-----|-----|
| StyleSheet.create with hardcoded values | Inline styles with useBreakpoint() + tokens | Responsive at all 3 breakpoints |
| Raw hex colors (#007AFF, #666, etc.) | Token constants (accentBlue, textSecondary) | Consistent with design system |
| System fonts | fontFamilyDisplay/fontFamilyBody | Matches cookbook.pen typography |
| No responsive layout | PageContainer + breakpoint-aware containers | Proper mobile/tablet/web |
| Email/password only auth | Email/password + Google/Apple/Facebook OAuth | Reduced signup friction |
| Photo placeholder in draft review | Actual photo display with responsive layout | Complete scan flow |
| Basic share text | Native share sheet + clipboard fallback | Proper invite sharing |

## Open Questions

1. **Supabase OAuth Provider Configuration**
   - What we know: Code patterns for signInWithOAuth and signInWithIdToken are well-documented
   - What's unclear: Whether Google, Apple, and Facebook providers are already configured in the Supabase dashboard
   - Recommendation: Plan the UI and code, note that dashboard configuration is a prerequisite. If not configured, this is a setup task, not a code task.

2. **Scan Photo Storage Path**
   - What we know: Scan photos are uploaded via scan-upload.ts, DraftReview loads draft data via scanDraftService
   - What's unclear: Exact Supabase storage bucket and path format for retrieving the original scan photo
   - Recommendation: Investigate scan-upload.ts to find the storage path pattern, then build photo URL retrieval into draft review

3. **Profile Avatar Upload**
   - What we know: Profile/Settings needs avatar per CONTEXT.md
   - What's unclear: Whether profiles table has an avatar_url column, whether Supabase storage bucket for avatars exists
   - Recommendation: Check profiles table schema. If no avatar support exists, this may need a migration. Could be deferred if not in cookbook.pen spec.

4. **Two ScanPhotoUpload Components**
   - What we know: `src/features/scans/ScanPhotoUpload.tsx` uses web HTML; `src/features/scan/ScanPhotoUpload.tsx` uses React Native
   - What's unclear: Which one is canonical, whether the web HTML version is still referenced
   - Recommendation: Use the React Native version. The web HTML version should be deprecated or replaced.

## Sources

### Primary (HIGH confidence)
- Codebase analysis: All existing screen files, API modules, tokens, hooks, and established patterns read directly
- package.json: Exact dependency versions confirmed
- STATE.md: All project decisions and constraints from Phases 8-11

### Secondary (MEDIUM confidence)
- Supabase OAuth patterns: Based on Supabase JS v2 documentation patterns for signInWithOAuth and signInWithIdToken
- expo-auth-session / expo-apple-authentication: Based on Expo SDK 54 compatibility (versions need verification at install time)

### Tertiary (LOW confidence)
- OAuth provider dashboard configuration status: Unknown, needs verification

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all core libraries already installed and used; new deps are standard Expo packages
- Architecture: HIGH - patterns established in Phase 10, documented in STATE.md, verified in codebase
- Pitfalls: HIGH - identified from direct codebase analysis (two ScanPhotoUpload files, HTML in scan component, FlatList web issues all verified)
- Social OAuth: MEDIUM - code patterns are standard but dashboard config and native Apple auth on this specific project are unverified

**Research date:** 2026-03-08
**Valid until:** 2026-04-08 (stable -- no fast-moving dependencies)