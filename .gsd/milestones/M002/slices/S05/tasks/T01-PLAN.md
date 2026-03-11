---
estimated_steps: 5
estimated_files: 4
---

# T01: Mount GdprConsentBanner and wire GDPR→ATT consent sequencing

**Slice:** S05 — UX Polish
**Milestone:** M002

## Description

S04 built the GdprConsentBanner component and ATT module but explicitly deferred two integration items to S05: (1) mounting the banner in the app layout so it actually renders on web, and (2) wiring the GDPR→ATT consent sequencing so GDPR consent resolves first, then ATT is prompted on iOS. This task closes both gaps, completing the ADS-05 and ADS-03 integration requirements.

## Steps

1. Read `app/(public)/_layout.tsx` and `src/features/ads/GdprConsentBanner.tsx`. Mount `GdprConsentBanner` inside the public layout so it renders on web public pages. The banner already returns null on native, so no platform guard is needed at the layout level. Position it to render after the Stack (not inside it) so it overlays content.

2. Read `app/_layout.tsx`, `src/features/ads/consent.ts`, and `src/features/ads/att.ts`. Add a `useConsentSequence` hook (or inline useEffect) in the root layout that: (a) calls `getConsentStatus()`, (b) if status is `'obtained'` and `Platform.OS === 'ios'`, calls `requestTrackingPermission()` from att.ts. Wrap in try/catch with `console.warn('[ConsentSequence]', error)`. This runs once on app mount.

3. Verify the consent module imports resolve correctly — `consent.ts` and `att.ts` use dynamic imports for native SDKs, so the web path should work without native modules installed. Confirm no new dependencies needed.

4. Run `npx tsc --noEmit` to verify zero TypeScript errors.

5. Run `npx jest --passWithNoTests` to verify all 474+ tests still pass with no regressions. Then start the dev server and browser-verify: navigate to a public route and confirm GdprConsentBanner appears at the bottom (on web, when consent is unknown).

## Must-Haves

- [ ] GdprConsentBanner mounted in `app/(public)/_layout.tsx` and renders on web
- [ ] GDPR→ATT sequencing useEffect in `app/_layout.tsx` — GDPR first, then ATT on iOS
- [ ] Console warning on consent sequence failure for observability
- [ ] Zero TypeScript errors
- [ ] All existing tests pass (no regressions)

## Verification

- `npx tsc --noEmit` — zero errors
- `npx jest --passWithNoTests` — 474+ tests pass
- Browser: navigate to public route → GdprConsentBanner visible at page bottom on web
- Browser: no console errors from consent sequence on web (ATT returns 'not-applicable')

## Observability Impact

- Signals added/changed: `console.warn('[ConsentSequence]', error)` on any failure in the GDPR→ATT flow — surfaces consent pipeline failures for debugging
- How a future agent inspects this: Check browser console for `[ConsentSequence]` warnings; check `AsyncStorage.getItem('@ads_consent_status')` for persisted consent value; GdprConsentBanner visibility indicates pending consent
- Failure state exposed: Consent sequence failures are caught and warned (never crash the app); banner non-appearance when expected indicates a mounting or consent status issue

## Inputs

- `src/features/ads/GdprConsentBanner.tsx` — complete, exported, not yet mounted (S04)
- `src/features/ads/consent.ts` — unified consent API with `getConsentStatus()`, `requestConsent()` (S04)
- `src/features/ads/att.ts` — ATT module with `requestTrackingPermission()` (S04)
- `app/(public)/_layout.tsx` — currently just bare `<Stack>` with no extra components
- `app/_layout.tsx` — root layout with fonts, splash screen, SessionProvider
- S04 Summary Forward Intelligence: "GdprConsentBanner exists and is exported but NOT integrated into any layout yet — S05 needs to add it"
- DECISIONS.md: "GDPR consent check before ATT prompt" — this is the ordering to follow

## Expected Output

- `app/(public)/_layout.tsx` — imports and renders GdprConsentBanner after Stack
- `app/_layout.tsx` — new useEffect running GDPR→ATT consent sequencing on mount
- No new files created; no new dependencies
