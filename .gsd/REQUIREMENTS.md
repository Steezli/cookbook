# Requirements

## Active

_(No active requirements — all M003 requirements validated.)_

## Validated

### QA-04 — Form Enter-key submission
- Status: validated
- Class: quality-attribute
- Source: user
- Primary Slice: M003/S02
- Supporting Slices: M003/S05
- Notes: All sequential forms chain focus on Enter: login (email→password→submit), signup (name→email→password→confirm→submit), reset-password (password→submit), forgot-password (email→submit), collection create (name→description), RecipeForm (title→description, ingredient/step/tag→add). Wired in S02 (auth + collection) and S05/T02 (RecipeForm). Verified by grep of returnKeyType + onSubmitEditing across all form files.

### QA-08 — Button/interaction audit
- Status: validated
- Class: quality-attribute
- Source: user
- Primary Slice: M003/S05
- Notes: All 41 Alert.alert calls replaced with cross-platform showAlert/confirmAction utility. 8 web routes verified with zero dead buttons or broken links. Auth guard redirects work correctly. See AUDIT-REPORT.md for screen-by-screen results.

### QA-09 — Error handling audit
- Status: validated
- Class: failure-visibility
- Source: user
- Primary Slice: M003/S05
- Supporting Slices: M003/S04
- Notes: Error states added to Home, recipes index, and cook mode screens (empty catch blocks fixed). All user-facing error/confirmation messages display on web via cross-platform alert utility. Redundant console.error calls removed from service catch blocks in S04. See AUDIT-REPORT.md.

### QA-10 — Cross-platform verification
- Status: validated
- Class: quality-attribute
- Source: user
- Primary Slice: M003/S05
- Supporting Slices: all M003 slices
- Notes: Web: 8 routes verified in browser with 0 JS errors (home, login, signup, forgot-password, scan, recipes redirect, collections redirect, family redirect). iOS: app launched on iPhone 16 simulator (iOS 18.6), home screen rendered with recipe data. Real device testing gaps documented in AUDIT-REPORT.md.

### QA-01 — Scan flow code consolidation
- Status: validated
- Class: quality-attribute
- Source: user + investigation
- Primary Slice: M003/S01
- Notes: `src/features/scans/` merged into `src/features/scan/`. All imports rewritten. `npx tsc --noEmit` exits 0, 502 tests pass. Zero stale `@/features/scans/` references remain.

### QA-11 — Type export cleanup
- Status: validated
- Class: quality-attribute
- Source: investigation
- Primary Slice: M003/S01
- Notes: 7 shared types extracted to `src/features/scan/types.ts`. All consumers repointed. Original service files deleted (types + dead service classes).

### QA-05 — OAuth consent branding
- Status: validated
- Class: launchability
- Source: user
- Primary Slice: M003/S02
- Notes: `docs/oauth-branding.md` created with step-by-step instructions for Google Cloud Console, Apple Developer, and Supabase Dashboard. Documentation deliverable complete; actual console configuration is a manual ops task.

### QA-02 — Scan UI web redesign
- Status: validated
- Class: primary-user-loop
- Source: user
- Primary Slice: M003/S03
- Notes: Web scan upload has HTML5 drag-and-drop zone with visual hover feedback (border/text change on drag). Verified at 390px, 768px, and 1440px breakpoints. Upload zone accepts JPEG/PNG/WebP drops and converts to ImagePickerAsset objects.

### QA-03 — Multi-draft UX polish
- Status: validated
- Class: primary-user-loop
- Source: user
- Primary Slice: M003/S03
- Notes: DraftEditor and DraftManager fully migrated to design tokens (zero hardcoded hex colors), responsive layout via useBreakpoint, Pressable interaction pattern, responsive modal sizing. 502 tests pass. Code-level verification via `rg` audits confirms zero hex colors, zero TouchableOpacity, zero StyleSheet.create.

### QA-06 — Console.log cleanup
- Status: validated
- Class: quality-attribute
- Source: user
- Primary Slice: M003/S04
- Notes: All debug console.log/warn/error removed from client-side code (src/, app/). Zero console.log remains. Only ~15 intentional console.warn/error calls in 5 documented files (ErrorBoundary, auth callback, ads consent, ad banner, layout consent). Edge functions untouched per policy. Verified by `rg` audit, `tsc --noEmit`, and 499 passing tests.

### QA-07 — Dead code removal
- Status: validated
- Class: quality-attribute
- Source: user + investigation
- Primary Slice: M003/S01
- Supporting Slice: M003/S04
- Notes: S01 removed 13 confirmed dead files. S04 removed 3 more (retry-recovery-service.ts, error-classification-service.ts, job-status-service.ts) and 4 unused exports from scan-service.ts. Systematic sweep complete — 16 total dead files removed. Types extracted before deletion per policy.

### QA-12 — Duplicate scan-upload.ts consolidation
- Status: validated
- Class: quality-attribute
- Source: investigation
- Primary Slice: M003/S01
- Notes: Dead duplicate `src/features/scans/scan-upload.ts` removed. Single canonical `src/features/scan/scan-upload.ts` remains.

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
- Status: active
- Description: Scan feature gated behind subscription check using RevenueCat entitlement. Free users get 3 photo scans per calendar month; subscribers get unlimited.
- Why it matters: Monetization path for the scan feature.
- Source: user
- Primary owning slice: M006
- Supporting slices: none
- Validation: contract verified (Jest); operational validation deferred to M006 DoD (EAS build + device)
- Notes: Promoted from deferred. Tracks photo uploads (not recipe extractions) since one photo can yield multiple recipes. S03 proves gate logic in createMultiPhotoScanJob; isSubscriber bypass tested.

### SUB-02 — Paywall UI displayed when non-subscriber hits scan limit
- Class: core-capability
- Status: active
- Description: Non-subscribers see a paywall screen when they exceed 3 scans/month, showing $3.99/month pricing and subscribe button.
- Why it matters: Clear upgrade path for monetization.
- Source: user
- Primary owning slice: M006
- Supporting slices: none
- Validation: contract verified (Jest + component exists); RevenueCatUI rendering deferred to M006 DoD (EAS build); web Stripe checkout deferred to S05
- Notes: Promoted from deferred. PaywallPlaceholder component shipped in S03; native RevenueCatUI dynamic import wired; web subscribe stub replaced in S05.

### SUB-03 — Web subscription checkout via RevenueCat Web Billing / Stripe
- Class: core-capability
- Status: active
- Description: Web users can subscribe via RevenueCat Web Billing backed by Stripe.
- Why it matters: Web monetization parity with mobile.
- Source: user
- Primary owning slice: M006
- Supporting slices: none
- Validation: unmapped
- Notes: Promoted from deferred. Uses @revenuecat/purchases-js for web.

### SUB-04 — Ad-free experience for subscribers
- Class: core-capability
- Status: active
- Description: Active subscribers see no ads anywhere in the app. Ad suppression takes effect immediately on purchase without requiring restart.
- Why it matters: Premium value proposition — paying users shouldn't see ads.
- Source: user
- Primary owning slice: M006
- Supporting slices: none
- Validation: unmapped

### SUB-05 — Freemium scan limit (3 photo scans per calendar month)
- Class: core-capability
- Status: active
- Description: Free users can upload up to 3 photos for scanning per calendar month. Count resets on the 1st. Tracked server-side in Supabase. Failed scans do not count.
- Why it matters: Lets users try the core feature before committing to a subscription.
- Source: user
- Primary owning slice: M006
- Supporting slices: none
- Validation: contract verified (Jest gate tests at count=1, 2, 3); month rollover + failed-scan exclusion tested in S01; operational validation deferred to M006 DoD

### SUB-06 — Scan count tracking and remaining scans display
- Class: core-capability
- Status: active
- Description: Free users can see how many scans they have remaining this month. Displayed on the scan upload screen.
- Why it matters: Transparency about free tier limits.
- Source: user
- Primary owning slice: M006
- Supporting slices: none
- Validation: contract verified (scansRemaining badge render condition present in scan screen); visual/live validation deferred to M006 DoD

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
| QA-01 | quality-attribute | validated | M003/S01 | none | S01 UAT |
| QA-02 | primary-user-loop | validated | M003/S03 | M003/S01 | S03 UAT |
| QA-03 | primary-user-loop | validated | M003/S03 | M003/S01 | S03 UAT |
| QA-04 | quality-attribute | validated | M003/S02 | M003/S05 | S02 UAT + S05/T02 |
| QA-05 | launchability | validated | M003/S02 | none | S02 UAT |
| QA-06 | quality-attribute | validated | M003/S04 | none | S04 UAT |
| QA-07 | quality-attribute | validated | M003/S01, M003/S04 | none | S04 UAT |
| QA-08 | quality-attribute | validated | M003/S05 | none | S05 AUDIT-REPORT |
| QA-09 | failure-visibility | validated | M003/S05 | M003/S04 | S05 AUDIT-REPORT |
| QA-10 | quality-attribute | validated | M003/S05 | all | S05 AUDIT-REPORT |
| QA-11 | quality-attribute | validated | M003/S01 | none | S01 UAT |
| QA-12 | quality-attribute | validated | M003/S01 | none | S01 UAT |
| SUB-01 | core-capability | active | M006 | M006/S01, M006/S02, M006/S03 | contract (Jest); operational deferred M006 DoD |
| SUB-02 | core-capability | active | M006 | M006/S03 | contract (component + catch wiring); runtime deferred M006 DoD |
| SUB-03 | core-capability | active | M006/S05 | none | unmapped — S05 |
| SUB-04 | core-capability | active | M006/S04 | none | unmapped — S04 |
| SUB-05 | core-capability | active | M006 | M006/S01, M006/S03 | contract (Jest gate tests); operational deferred M006 DoD |
| SUB-06 | core-capability | active | M006 | M006/S03 | contract (badge render wired); visual deferred M006 DoD |
| SEO-02 | core-capability | deferred | none | none | unmapped |

## Coverage Summary

- Active requirements: 6 (SUB-01 through SUB-06 — contract verified, operational validation deferred to M006 DoD)
- Deferred requirements: 1 (SEO-02)
- Validated (all milestones complete through M003): 38+
- Unmapped active requirements: 0
