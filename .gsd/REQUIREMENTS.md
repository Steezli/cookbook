# Requirements

## Active

### QA-01 — Scan flow code consolidation
- Class: quality-attribute
- Status: active
- Description: Merge `src/features/scan/` and `src/features/scans/` into a single `src/features/scan/` directory. Remove duplicate files, fix all imports, ensure no broken references.
- Why it matters: Two directories for the same feature causes confusion, import inconsistency, and maintenance burden. Duplicate `scan-upload.ts` files exist.
- Source: user + investigation
- Primary owning slice: M003/S01
- Supporting slices: none
- Validation: unmapped
- Notes: Must not break any existing functionality. TypeScript must compile clean after consolidation.

### QA-02 — Scan UI web redesign
- Class: primary-user-loop
- Status: active
- Description: Web scan experience redesigned to feel native to web rather than a ported mobile layout. Upload zone, photo preview, and progress should use web-appropriate patterns.
- Why it matters: The web scan UI is described as "ugly af and clearly uses some design ideas from mobile" — web users deserve a first-class experience.
- Source: user
- Primary owning slice: M003/S03
- Supporting slices: M003/S01
- Validation: unmapped
- Notes: Must reference cookbook.pen designs. Verify across all breakpoints.

### QA-03 — Multi-draft UX polish
- Class: primary-user-loop
- Status: active
- Description: Multi-draft list and editor UI improved for clarity, visual hierarchy, and usability. Draft selection, editing, save status, and batch operations should feel smooth.
- Why it matters: Users find the multi-draft flow clunky — the UI itself needs work.
- Source: user
- Primary owning slice: M003/S03
- Supporting slices: M003/S01
- Validation: unmapped
- Notes: Focus on UI quality, not navigation changes.

### QA-04 — Form Enter-key submission
- Class: quality-attribute
- Status: active
- Description: All TextInput fields across auth and recipe forms chain focus (Tab to next field) or submit the form on Enter. No field should require the user to manually tap the button after typing.
- Why it matters: Standard form UX — users expect Enter to advance or submit. Currently only the last field in some forms has onSubmitEditing.
- Source: user
- Primary owning slice: M003/S02
- Supporting slices: none
- Validation: unmapped
- Notes: Applies to login, signup, forgot-password, reset-password, recipe create/edit, and any other form screens.

### QA-05 — OAuth consent branding
- Class: launchability
- Status: active
- Description: Google and Apple OAuth consent screens show "Berven Book" (or the configured app name) instead of the raw Supabase project URL (ugixgcbysrwabwzbsjxr.supabase.co).
- Why it matters: Users see an ugly, untrustworthy URL during sign-up which undermines confidence in the app.
- Source: user
- Primary owning slice: M003/S02
- Supporting slices: none
- Validation: unmapped
- Notes: This is a Google Cloud Console / Supabase dashboard configuration change, not a code change. Document exact steps.

### QA-06 — Console.log cleanup
- Class: quality-attribute
- Status: active
- Description: Remove debug-leftover console.log/warn statements from production code. Keep intentional error logging in service layers where it provides diagnostic value.
- Why it matters: 38+ files have console.* calls outside tests. Debug leftovers pollute browser console and device logs, making real errors harder to spot.
- Source: user
- Primary owning slice: M003/S04
- Supporting slices: none
- Validation: unmapped
- Notes: Edge functions (supabase/functions/) may keep structured logging. Client-side code should be clean.

### QA-07 — Dead code removal
- Class: quality-attribute
- Status: active
- Description: Remove unused files identified during investigation: ScanJobList.tsx, error-reporting-service.ts, and any others confirmed unused during audit. Extract still-used types from dead files before deletion.
- Why it matters: Dead code increases maintenance surface, confuses navigation, and makes the codebase feel larger than it is.
- Source: user + investigation
- Primary owning slice: M003/S01
- Supporting slices: M003/S04
- Validation: unmapped
- Notes: Identified candidates: ScanJobList.tsx, error-reporting-service.ts, possibly ScanPhotoUpload.tsx (both copies), ScanJobProgress.tsx. Must verify each file is truly unreferenced before deletion.

### QA-08 — Button/interaction audit
- Class: quality-attribute
- Status: active
- Description: Every Pressable, Link, and navigation action across all screens verified to work correctly. No dead buttons, broken links, or confusing interaction patterns.
- Why it matters: Users encounter buttons that don't work or behave unexpectedly.
- Source: user
- Primary owning slice: M003/S05
- Supporting slices: none
- Validation: unmapped
- Notes: Systematic screen-by-screen audit. Test on both web and iOS simulator.

### QA-09 — Error handling audit
- Class: failure-visibility
- Status: active
- Description: All screens audited for poor error handling, missing error states, bad fallbacks, and swallowed errors. Fix any found issues.
- Why it matters: Users need clear feedback when things go wrong. Errors should be visible and actionable, not silently swallowed.
- Source: user
- Primary owning slice: M003/S05
- Supporting slices: M003/S04
- Validation: unmapped
- Notes: Check for try/catch blocks that swallow errors, missing loading/error states, and insufficient user feedback.

### QA-10 — Cross-platform verification
- Class: quality-attribute
- Status: active
- Description: All screens and flows tested on both web (browser) and iOS (simulator). Platform-specific bugs identified and fixed.
- Why it matters: Cross-platform consistency is essential for a cross-platform app.
- Source: user
- Primary owning slice: M003/S05
- Supporting slices: all slices
- Validation: unmapped
- Notes: Web tested via localhost, iOS tested via Expo simulator using mac-tools.

### QA-11 — Type export cleanup
- Class: quality-attribute
- Status: active
- Description: Shared types (ParsedRecipe, FieldConfidence, ParsedIngredient) currently exported from `src/lib/ai/recipe-parsing-service.ts` must be extracted to standalone type files before the service file can be evaluated for removal.
- Why it matters: Types are used by 3 components but live in a service file that may be dead code. Clean separation prevents deletion accidents.
- Source: investigation
- Primary owning slice: M003/S01
- Supporting slices: none
- Validation: unmapped
- Notes: Move types to `src/features/scan/types.ts` or similar during consolidation.

### QA-12 — Duplicate scan-upload.ts consolidation
- Class: quality-attribute
- Status: active
- Description: Two `scan-upload.ts` files exist (`src/features/scan/scan-upload.ts` and `src/features/scans/scan-upload.ts`) with different implementations. Consolidate into one canonical version.
- Why it matters: Duplicate files with different implementations for the same concern is a maintenance and correctness hazard.
- Source: investigation
- Primary owning slice: M003/S01
- Supporting slices: none
- Validation: unmapped
- Notes: Determine which version is actually used, merge any unique functionality, delete the duplicate.

## Validated

### ADS-01 — Ad banner component (320x50 mobile, 728x90 web) with platform branching (AdMob native, placeholder web)
- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: M001/S13

### ADS-02 — Ad placement on public browsing screens only (never authenticated screens)
- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: M001/S13

### ADS-03 — ATT permission prompt on iOS for ad tracking
- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: M002/S04, M002/S05

### ADS-04 — Production ad unit ID configuration via environment variables
- Status: validated
- Class: core-capability
- Source: M002 roadmap
- Primary Slice: M002/S04

### ADS-05 — GDPR ad consent management for EU users
- Status: validated
- Class: core-capability
- Source: M002 roadmap
- Primary Slice: M002/S04, M002/S05

### SCAN-MULTI — Multi-recipe scan: a photo containing 2+ recipes produces separate drafts for each
- Status: validated
- Class: core-capability
- Source: M002 roadmap
- Primary Slice: M002/S01, M002/S02, M002/S05

### SEO-01 — Recipe structured data markup for search engine indexing
- Status: validated
- Class: core-capability
- Source: M002 roadmap
- Primary Slice: M002/S03

### DESIGN-01 through DESIGN-04, NAV-01 through NAV-05, SCREEN-01 through SCREEN-10, PUB-01 through PUB-04
- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: M001 (various slices)
- Notes: All design, navigation, screen, and public browsing requirements validated during M001.

## Deferred

### SUB-01 — Subscription gating on scan feature via RevenueCat entitlement
- Class: core-capability
- Status: deferred
- Description: Scan feature gated behind subscription check using RevenueCat entitlement.
- Why it matters: Monetization path for the scan feature.
- Source: user
- Primary owning slice: M004
- Supporting slices: none
- Validation: unmapped
- Notes: Deferred to M004 — quality audit takes priority.

### SUB-02 — Paywall UI displayed when non-subscriber accesses scan
- Class: core-capability
- Status: deferred
- Description: Non-subscribers see a paywall screen when attempting to use the scan feature.
- Why it matters: Clear upgrade path for monetization.
- Source: user
- Primary owning slice: M004
- Supporting slices: none
- Validation: unmapped
- Notes: Deferred to M004.

### SUB-03 — Web subscription checkout via RevenueCat Web Billing / Stripe
- Class: core-capability
- Status: deferred
- Description: Web users can subscribe via RevenueCat Web Billing or Stripe integration.
- Why it matters: Web monetization parity with mobile.
- Source: user
- Primary owning slice: M004
- Supporting slices: none
- Validation: unmapped
- Notes: Deferred to M004.

### SEO-02 — Server-rendered public recipe pages for SEO crawlers
- Class: core-capability
- Status: deferred
- Description: Public recipe pages rendered server-side for optimal SEO crawler indexing.
- Why it matters: Client-rendered JSON-LD may be deprioritized by Google.
- Source: execution
- Primary owning slice: none
- Supporting slices: none
- Validation: unmapped
- Notes: Deferred — current client-side approach accepted per M002 scope.

## Out of Scope

- Aggressive ad experiences (popovers, layout shift, autoplay media) — conflicts with usability
- Forced public sharing or default-public recipes — families must control visibility
- Fully-automated "no review needed" AI publishing — OCR must be user-reviewable
- Offline mode — real-time sync and RLS are core
- Full version history for recipes — "duplicate and edit" covers needs

## Traceability

| ID | Class | Status | Primary owner | Supporting | Proof |
|---|---|---|---|---|---|
| QA-01 | quality-attribute | active | M003/S01 | none | unmapped |
| QA-02 | primary-user-loop | active | M003/S03 | M003/S01 | unmapped |
| QA-03 | primary-user-loop | active | M003/S03 | M003/S01 | unmapped |
| QA-04 | quality-attribute | active | M003/S02 | none | unmapped |
| QA-05 | launchability | active | M003/S02 | none | unmapped |
| QA-06 | quality-attribute | active | M003/S04 | none | unmapped |
| QA-07 | quality-attribute | active | M003/S01, M003/S04 | none | unmapped |
| QA-08 | quality-attribute | active | M003/S05 | none | unmapped |
| QA-09 | failure-visibility | active | M003/S05 | M003/S04 | unmapped |
| QA-10 | quality-attribute | active | M003/S05 | all | unmapped |
| QA-11 | quality-attribute | active | M003/S01 | none | unmapped |
| QA-12 | quality-attribute | active | M003/S01 | none | unmapped |
| SUB-01 | core-capability | deferred | M004 | none | unmapped |
| SUB-02 | core-capability | deferred | M004 | none | unmapped |
| SUB-03 | core-capability | deferred | M004 | none | unmapped |
| SEO-02 | core-capability | deferred | none | none | unmapped |

## Coverage Summary

- Active requirements: 12
- Mapped to slices: 12
- Validated (prior milestones): 26+
- Unmapped active requirements: 0
