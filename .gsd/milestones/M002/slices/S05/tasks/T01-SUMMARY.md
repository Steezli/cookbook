---
id: T01
parent: S05
milestone: M002
provides:
  - GdprConsentBanner mounted in public layout (renders on web)
  - GDPR→ATT consent sequencing in root layout
  - Dev server unblocked by conditional AdMob plugin guard
key_files:
  - app/(public)/_layout.tsx
  - app/_layout.tsx
  - app.config.ts
key_decisions:
  - Conditional AdMob plugin inclusion — only load react-native-google-mobile-ads Expo plugin when the package is installed (fs.existsSync check), preventing dev server crash on web
patterns_established:
  - Consent sequencing pattern — async useEffect in root layout checks GDPR status first, then conditionally triggers ATT on iOS
observability_surfaces:
  - "console.warn('[ConsentSequence]', error)" on any failure in the GDPR→ATT flow
  - GdprConsentBanner visibility indicates pending web consent
  - AsyncStorage key '@ads_consent_status' for persisted consent value
duration: 15min
verification_result: passed
completed_at: 2026-03-11
blocker_discovered: false
---

# T01: Mount GdprConsentBanner and wire GDPR→ATT consent sequencing

**Mounted GdprConsentBanner in public layout and added GDPR→ATT consent sequencing useEffect in root layout; fixed pre-existing dev server crash from uninstalled AdMob plugin.**

## What Happened

Three changes were made:

1. **Public layout** (`app/(public)/_layout.tsx`): Wrapped the `Stack` in a `View` with `flex:1` and added `<GdprConsentBanner />` after the Stack. The banner renders as a fixed-bottom overlay on web when consent is unknown; returns null on native.

2. **Root layout** (`app/_layout.tsx`): Added a `useEffect` that runs the GDPR→ATT consent sequence on mount — calls `getConsentStatus()`, and if status is `'obtained'` and platform is iOS, calls `requestTrackingPermission()`. Wrapped in try/catch with `console.warn('[ConsentSequence]', error)`. On web, this silently resolves since consent starts as 'unknown' and ATT returns 'not-applicable'.

3. **App config** (`app.config.ts`): Fixed a pre-existing dev server crash — S04 added `react-native-google-mobile-ads` as an Expo config plugin, but the package isn't installed (it's native-only, intended for EAS Build). Added an `fs.existsSync` guard so the plugin is only included when the package is present.

## Verification

- `npx tsc --noEmit` — zero errors
- `npx jest --passWithNoTests` — 474 tests passed, zero failures
- Browser: navigated to `http://localhost:8081/` (public route) — GdprConsentBanner visible at page bottom with "Decline" and "Accept" buttons
- Browser assertions: `[data-testid='gdpr-consent-banner']` visible, `[data-testid='gdpr-accept-button']` visible, `[data-testid='gdpr-decline-button']` visible, cookie consent text visible
- Browser console: no `[ConsentSequence]` warnings (correct — on web, consent is 'unknown' so ATT is not triggered)
- No new console errors from consent code (only pre-existing Supabase 401)

### Slice-level checks (T01 progress)

- ✅ `npx tsc --noEmit` — zero errors
- ✅ `npx jest --passWithNoTests` — 474 tests pass
- ✅ GdprConsentBanner visible at bottom of public pages on web
- ⬜ `+not-found.tsx` design tokens — not in T01 scope
- ⬜ Root ErrorBoundary — not in T01 scope
- ⬜ DraftEditor TouchableOpacity→Pressable — not in T01 scope (currently has TouchableOpacity)
- ⬜ accessibilityLabel count increase — not in T01 scope (currently 4 matches)

## Diagnostics

- Check browser console for `[ConsentSequence]` warnings to detect GDPR→ATT flow failures
- Check `AsyncStorage.getItem('@ads_consent_status')` for persisted consent value on web
- GdprConsentBanner visibility indicates pending consent (when consent is 'unknown' or 'required')
- On iOS, ATT prompt appears after GDPR consent is 'obtained'; failures are warned, never crash

## Deviations

- **app.config.ts fix**: The dev server was completely broken by S04's addition of the `react-native-google-mobile-ads` plugin (package not installed). Fixed with a conditional `fs.existsSync` guard. This was necessary to run the dev server for browser verification and was a pre-existing issue, not introduced by T01.

## Known Issues

- Pre-existing Supabase 401 errors on public page load (missing API key in some requests) — not related to T01

## Files Created/Modified

- `app/(public)/_layout.tsx` — imports and renders GdprConsentBanner after Stack
- `app/_layout.tsx` — imports consent/ATT modules; adds GDPR→ATT sequencing useEffect
- `app.config.ts` — conditional AdMob plugin inclusion (fs.existsSync guard)
