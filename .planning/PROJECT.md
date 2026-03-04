# Cookbook (Family Recipe Vault)

## What This Is

A cross-platform app (Expo/React Native) for capturing handwritten family recipes via photo scanning, translating them into clean searchable recipes with AI-powered OCR, and organizing them within privacy-controlled family spaces. Built on Supabase with RLS-enforced access control.

## Core Value

Families can save and share treasured recipes (like Grandma's) without losing control over who gets to see them.

## Requirements

### Validated

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

### Active

- [ ] Public recipe browsing (list + detail) without family membership
- [ ] Public recipe attribution to the user who added them
- [ ] Minimal ads on public browsing screens only
- [ ] Scan feature gated by subscription entitlement (v1 hypothesis)
- [ ] Home screen navigation to recipe features (currently undiscoverable)
- [ ] Scan photo display in draft review (currently placeholder)
- [ ] Photo thumbnails in recipe list views

### Out of Scope

- Aggressive ad experiences (popovers, layout shift, autoplay media) — conflicts with usability
- Forced public sharing or default-public recipes — families must control visibility
- Fully-automated "no review needed" AI publishing — OCR must be user-reviewable
- Offline mode — real-time sync and RLS are core
- Full version history for recipes — "duplicate and edit" covers needs

## Context

Shipped v1.0 with 20,548 LOC TypeScript across 86 files.
Tech stack: Expo (React Native), TypeScript, Supabase (auth, database, storage, edge functions, real-time), Google Cloud Vision API.
6 phases completed over 29 days. Photo scanning with confidence scoring and multi-image support is the headline feature.
Initial UAT confirmed all core flows work on device. Home navigation and public browsing are the main gaps for next milestone.

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
| React Native Modal for dialogs | Cross-platform, replaces web position:fixed overlays | ✓ Good |
| getDraftByJobId bridge pattern | Scan job ID → draft FK lookup resolves navigation | ✓ Good |
| Confidence badges as { bg, text } objects | Dynamic styling without Tailwind on native | ✓ Good |
| security_definer for recursive comments CTE | Avoids RLS recursion performance issues | ✓ Good |
| Denormalized rating aggregates on recipes | Eliminates expensive joins in list views | ✓ Good |
| Volume conversions via milliliter intermediate | Simplifies conversion matrix | ✓ Good |

---
*Last updated: 2026-03-04 after v1.0 milestone*
