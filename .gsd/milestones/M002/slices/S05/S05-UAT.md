# S05: UX Polish — UAT

**Milestone:** M002
**Written:** 2026-03-11

## UAT Type

- UAT mode: mixed (live-runtime browser verification + artifact-driven test verification + documented manual pre-release items)
- Why this mode is sufficient: S05 is integration wiring and UX polish — browser verification confirms visual and integration outcomes (consent banner, not-found page, SEO markup, ErrorBoundary), test suite confirms no regressions, and manual items requiring real devices or production URLs are documented for pre-release sign-off.

## Preconditions

- Dev server running: `npx expo start --web` at `http://localhost:8081`
- All dependencies installed: `npm install` complete
- No Supabase backend required for most checks (public pages render with fallback data)
- For real-photo multi-recipe scan: deployed Supabase edge function required
- For UMP consent form: configured AdMob account + iOS device/simulator required
- For Google Rich Results Test: production deployment to berven.app required

## Smoke Test

Navigate to `http://localhost:8081/` in a browser — the public recipe browse page loads with the GdprConsentBanner visible at the bottom showing "We use cookies and similar technologies" with Accept and Decline buttons.

## Test Cases

### 1. GDPR Consent Banner on Web

1. Open `http://localhost:8081/` in a browser (public route)
2. Scroll to bottom of viewport
3. **Expected:** GdprConsentBanner visible with cookie/technology consent message, "Decline" and "Accept" buttons, `[data-testid='gdpr-consent-banner']` in DOM

### 2. Not-Found Page Styling

1. Navigate to `http://localhost:8081/nonexistent-route`
2. **Expected:** Styled 404 page with cooking emoji (🍳), "Page not found" heading in Bricolage Grotesque, descriptive text in DM Sans, accentWarm "Go Home" pill button — no hardcoded hex colors

### 3. SEO Structured Data on Recipe Detail

1. Navigate to a public recipe detail page (e.g., `http://localhost:8081/recipe/{id}`)
2. Inspect page source or evaluate `document.querySelector('script[type="application/ld+json"]')?.textContent`
3. **Expected:** JSON-LD script tag present with `@type: "Recipe"`, `name`, `author`, `recipeIngredient`, `recipeInstructions`
4. Check meta tags: `document.querySelectorAll('meta[property^="og:"]')`
5. **Expected:** At least og:title, og:url, og:type, og:site_name present

### 4. ErrorBoundary Fallback

1. In browser console, run a test that triggers a React error in a child component (e.g., via React DevTools or a test route)
2. **Expected:** ErrorBoundary catches error, displays "Something went wrong" heading, emoji, description text, and "Try Again" button
3. Check console for `[ErrorBoundary]` log with error details and component stack

### 5. DraftEditor Pressable Migration

1. Run: `rg 'TouchableOpacity' src/features/scans/DraftEditor.tsx`
2. **Expected:** Zero matches — all replaced with Pressable

### 6. Accessibility Labels Coverage

1. Run: `rg 'accessibilityLabel' -g '*.tsx' src/ app/ | wc -l`
2. **Expected:** 46+ (up from ~4 baseline)

### 7. Pull-to-Refresh (Native Only)

1. On a native device/simulator, navigate to recipes list, collections, family, or public browse
2. Pull down on the list
3. **Expected:** RefreshControl spinner appears, data reloads
4. On web: no RefreshControl rendered (guarded by `Platform.OS !== 'web'`)

### 8. Full Test Suite

1. Run: `npx jest --passWithNoTests`
2. **Expected:** 483 tests pass, zero failures, 22 suites

### 9. TypeScript Compilation

1. Run: `npx tsc --noEmit`
2. **Expected:** Zero errors

## Edge Cases

### Consent Banner After Acceptance

1. Click "Accept" on the GdprConsentBanner
2. Reload the page
3. **Expected:** Banner does not reappear (consent persisted to AsyncStorage)

### ErrorBoundary Recovery

1. Trigger an error that shows the ErrorBoundary fallback
2. Click "Try Again"
3. **Expected:** Component tree re-renders, error state cleared, normal UI restored (if the underlying error was transient)

### Not-Found with Deep Invalid Path

1. Navigate to `http://localhost:8081/some/deeply/nested/invalid/path`
2. **Expected:** Same styled not-found page renders (Expo Router catches all unmatched routes)

## Failure Signals

- GdprConsentBanner not visible on public pages → check `app/(public)/_layout.tsx` for import and mount
- `[ConsentSequence]` warning in console → GDPR→ATT flow failed, check `app/_layout.tsx` useEffect
- `[ErrorBoundary]` error in console → a component crashed, check the logged component stack
- TypeScript errors → check `npx tsc --noEmit` output for file/line
- Test failures → check `npx jest --verbose` output for failing test and assertion

## Requirements Proved By This UAT

- **SCAN-MULTI** — Code path complete: data layer (S01), UI (S02), polish (S05). 483 tests prove parsing, multi-draft service, and UI logic. Real-photo E2E deferred to deployed backend.
- **SEO-01** — JSON-LD script tag and OG meta tags verified rendering in browser. 62 unit tests prove generation logic. Google Rich Results Test deferred to production URL.
- **ADS-04** — Env-var resolution verified by 13 unit tests. Dev server runs with conditional plugin guard. Production IDs are an operational config step.
- **ADS-05** — GdprConsentBanner renders on web public pages (browser verified). 38 consent + 11 consent-gated AdBanner tests pass. GDPR→ATT sequencing wired in root layout.
- **ADS-03** — ATT module built and GDPR→ATT sequencing wired. Real-device ATT prompt requires iOS build.

## Not Proven By This UAT

- Real-device UMP consent form presentation (requires configured AdMob account + iOS build)
- ATT prompt on physical iOS device (requires EAS Build + device)
- Google Rich Results Test validation (requires production deployment to berven.app)
- Real-photo multi-recipe scan end-to-end (requires deployed Supabase edge function + Claude API)
- Production AdMob ad rendering (requires setting EXPO_PUBLIC_ADMOB_* env vars with real unit IDs)
- Server-side rendering of SEO markup (SEO-02 — explicitly deferred to future milestone)

## Notes for Tester

- Pre-existing Supabase 401 errors appear in the browser console on public page load — these are from missing/expired API keys and are not related to S05 changes.
- The ErrorBoundary is best tested by temporarily introducing a throw in a child component; normal usage won't trigger it.
- Pull-to-refresh is native-only — it can't be tested in a web browser. Use iOS Simulator or Android Emulator.
- The consent banner only appears when consent status is 'unknown' or 'required'. After clicking Accept/Decline, it won't reappear unless AsyncStorage is cleared.
- 2 files still use TouchableOpacity (DraftManager.tsx, ScanJobList.tsx) — these were intentionally out of scope.
