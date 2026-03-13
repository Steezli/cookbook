# Cookbook (Family Recipe Vault)

## What This Is

A cross-platform app (Expo/React Native) for capturing handwritten family recipes via photo scanning, translating them into clean searchable recipes with AI-powered OCR, and organizing them within privacy-controlled family spaces. Built on Supabase with RLS-enforced access control. Runs on iOS, Android, and web.

## Core Value

Families can save and share treasured recipes (like Grandma's) without losing control over who gets to see them.

## Current State

Two milestones complete, M003 S01–S03 done. Full-stack cross-platform app with AI-powered photo scanning, privacy-controlled family spaces, responsive design system, public recipe browsing, advertising integration, multi-recipe scan, SEO structured data, GDPR consent gating. 502 tests across 22 suites. Zero TypeScript errors. Scan codebase consolidated to single `src/features/scan/` directory. All auth forms and collection create form have Enter-key focus chaining. OAuth branding documented. Web scan upload has native drag-and-drop. DraftEditor and DraftManager fully migrated to design tokens with responsive breakpoint layouts. Remaining technical debt: leftover debug logging and button/interaction issues to audit.

## Architecture / Key Patterns

Tech stack: Expo (React Native), TypeScript, Supabase (auth, database, storage, edge functions, real-time), Google Cloud Vision API, OpenAI.
~90 TypeScript source files, 34 route files.
Design system: tokens.ts (24 variables), useBreakpoint hook, PageContainer, MobileTabBar, WebSidebar.
Public browsing with cursor-based pagination and SECURITY DEFINER RPCs.
Advertising module with platform-branched AdMob/placeholder, ATT permission, GDPR consent gating.
SEO: schema.org/Recipe JSON-LD + OG/Twitter Card meta tags.
Multi-recipe scan: edge function splits 1 photo → N drafts; multi-draft review UI with batch save.

## Capability Contract

See `.gsd/REQUIREMENTS.md` for the explicit capability contract, requirement status, and coverage mapping.

## Milestone Sequence

- [x] M001: Migration — Full-stack cross-platform family recipe app with AI scanning, family spaces, responsive design, public browsing, ads
- [x] M002: Production Polish — Multi-recipe scan, SEO structured data, production ad config, GDPR consent, UX polish
- [ ] M003: Quality Audit & Cleanup — Systematic bug hunt, code consolidation, dead code removal, UX consistency across platforms
- [ ] M004: Subscriptions — Subscription gating on scan via RevenueCat, paywall UI, web checkout (SUB-01, SUB-02, SUB-03)

---
*Last updated: 2026-03-12 after M003/S03 completion*
