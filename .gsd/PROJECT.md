# Cookbook (Family Recipe Vault)

## What This Is

A cross-platform app (Expo/React Native) for capturing handwritten family recipes via photo scanning, translating them into clean searchable recipes with AI-powered OCR, and organizing them within privacy-controlled family spaces. Built on Supabase with RLS-enforced access control.

## Core Value

Families can save and share treasured recipes (like Grandma's) without losing control over who gets to see them.

## Requirements

### Validated (M001)

- ✓ Users can create an account, log in, stay logged in, reset password, and log out — v1.0
- ✓ Users can create/join invite-only family spaces with admin/member roles — v1.0
- ✓ Users can add recipes manually with ingredients, steps, and metadata — v1.0
- ✓ Users can organize recipes into personal/family collections with tags — v1.0
- ✓ Users can search recipes by title and tags, browse by visibility/family — v1.0
- ✓ Users can upload a photo and get an editable draft from AI extraction — v1.0
- ✓ Users can review/edit any draft field before saving as a recipe — v1.0
- ✓ Failed scans show errors and support retry — v1.0
- ✓ Multi-image upload for multi-page recipes — v1.0
- ✓ Per-recipe visibility: private/family/public enforced server-side — v1.0
- ✓ Comments: family-only for private/family, public for public recipes — v1.0
- ✓ Half-star ratings with averages and counts — v1.0
- ✓ Ingredients stored canonically with metric/imperial display preference — v1.0
- ✓ Scan UI renders natively on iOS/Android (React Native components) — v1.0
- ✓ Design token system extracting all cookbook.pen variables — v1.1
- ✓ Breakpoint detection hook for mobile/tablet/web — v1.1
- ✓ Font loading for Bricolage Grotesque and DM Sans — v1.1
- ✓ All screens rebuilt to cookbook.pen designs across mobile/tablet/web — v1.1
- ✓ Navigation restructured with tabs, mobile bar, web sidebar — v1.1
- ✓ Public recipe browsing with search, pagination, author attribution — v1.1
- ✓ Ad banner with platform branching (AdMob native, placeholder web) — v1.1
- ✓ Ad placement restricted to public browsing screens only — v1.1
- ✓ ATT permission prompt on iOS for ad tracking — v1.1

### Deferred (to next milestone)

- [ ] Subscription gating on scan feature via RevenueCat entitlement (SUB-01)
- [ ] Paywall UI displayed when non-subscriber accesses scan (SUB-02)
- [ ] Web subscription checkout via RevenueCat Web Billing / Stripe (SUB-03)
- [ ] Recipe structured data markup for search engine indexing (SEO-01)
- [ ] Server-rendered public recipe pages for SEO crawlers (SEO-02)
- [ ] Production ad unit ID configuration (ADS-04, candidate)
- [ ] GDPR ad consent management for EU users (ADS-05, candidate)

### Out of Scope

- Aggressive ad experiences (popovers, layout shift, autoplay media) — conflicts with usability
- Forced public sharing or default-public recipes — families must control visibility
- Fully-automated "no review needed" AI publishing — OCR must be user-reviewable
- Offline mode — real-time sync and RLS are core
- Full version history for recipes — "duplicate and edit" covers needs

## Current Milestone: M002 — Production Polish

**Goal:** Multi-recipe scan support, SEO structured data for public recipes, production ads with GDPR consent, UX polish.

**Slices:**
- ✅ S01: Multi-Recipe Scan (edge function + data layer for 1 photo → N drafts) — complete
- S02: Multi-Draft UX (draft list + per-draft review) — next
- S03: SEO Structured Data (schema.org/Recipe JSON-LD + meta tags)
- S04: Production Ads + GDPR (env-based unit IDs + consent banner)
- S05: UX Polish (bug fixes, performance, visual refinements)

## Completed Milestones

### M001: Migration (completed 2026-03-11)

Full-stack cross-platform family recipe app with AI-powered photo scanning, privacy-controlled family spaces, responsive design system, public recipe browsing, and advertising integration. 13 slices over 37 days. 297 tests, zero TypeScript errors.

## Context

Tech stack: Expo (React Native), TypeScript, Supabase (auth, database, storage, edge functions, real-time), Google Cloud Vision API, OpenAI.
88 TypeScript source files, 32 route files.
Design system: tokens.ts (24 variables), useBreakpoint hook, PageContainer, MobileTabBar, WebSidebar.
Public browsing with cursor-based pagination and SECURITY DEFINER RPCs for author attribution.
Advertising module with platform-branched AdMob/placeholder, ATT permission, route-based placement.

## Constraints

- **Platforms**: Expo/React Native — iOS, Android, web
- **Usability**: "Grandma-friendly" — simple recipe entry and discovery
- **Data**: Supabase (PostgreSQL) with RLS — reliability and privacy enforcement
- **Units**: Canonical storage with metric/imperial display preference
- **Tech**: TypeScript, React Native components only (no web HTML elements)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Invite-only family space | Sharing centered on trusted family membership | ✓ Good |
| Per-recipe visibility: private/family/public | Families keep control of "secret" recipes | ✓ Good |
| AI scan creates structured draft | Minimizes effort while keeping review control | ✓ Good |
| Supabase RLS for access control | Server-side privacy enforcement | ✓ Good |
| JSONB for ingredients/steps | Flexible structured data without extra tables | ✓ Good |
| Canonical unit storage with preference display | Enables conversion without data loss | ✓ Good |
| Flat token naming for StyleSheet.create | Ergonomic over nested objects | ✓ Good |
| Pure function extraction for testing | getBreakpoint, getContainerStyle, evaluateAdPlacement | ✓ Good |
| Dynamic imports for native SDKs | Web bundles never polluted; graceful degradation | ✓ Good |
| Route-pattern allowlist for ads | Fail-safe: new routes default to no-ads | ✓ Good |
| SECURITY DEFINER for public RPCs | Bypasses RLS for anonymous author attribution | ✓ Good |

---
*Last updated: 2026-03-11 after M002/S01 completion*
