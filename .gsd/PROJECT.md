# Cookbook (Family Recipe Vault)

## What This Is

A cross-platform app (Expo/React Native) for capturing handwritten family recipes via photo scanning, translating them into clean searchable recipes with AI-powered OCR, and organizing them within privacy-controlled family spaces. Built on Supabase with RLS-enforced access control. Runs on iOS, Android, and web.

## Core Value

Families can save and share treasured recipes (like Grandma's) without losing control over who gets to see them.

## Current State

Six milestones complete (M001–M006). Full-stack cross-platform app with AI-powered photo scanning, privacy-controlled family spaces, responsive design system, public recipe browsing, advertising integration, multi-recipe scan, SEO structured data, GDPR consent gating, cooking walkthrough ingredient highlighting, smart liquid/dry unit conversions, dynamic scan timeout, full-screen iOS scanner. Freemium subscription model: 3 free photo scans per calendar month, unlimited for $3.99/month subscribers via RevenueCat (native) and Stripe Web Billing (web). Ad suppression for subscribers. Paywall UI on scan limit. Server-side scan count tracking with atomic Postgres RPC. 640 tests across 32 suites. Zero TypeScript errors. Zero `: any` in feature/lib code.

## Architecture / Key Patterns

Tech stack: Expo (React Native), TypeScript, Supabase (auth, database, storage, edge functions, real-time), Google Cloud Vision API, OpenAI.
~75 TypeScript source files (16 dead files removed in M003), 34 route files.
Design system: tokens.ts (39 variables including 15 semantic state/badge tokens), useBreakpoint hook, PageContainer, MobileTabBar, WebSidebar.
Cross-platform alert utility: src/lib/alert.ts (showAlert/confirmAction) — branches Platform.OS for web compatibility.
Public browsing with cursor-based pagination and SECURITY DEFINER RPCs.
Advertising module with platform-branched AdMob/placeholder, ATT permission, GDPR consent gating, subscriber suppression.
SEO: schema.org/Recipe JSON-LD + OG/Twitter Card meta tags.
Multi-recipe scan: edge function splits 1 photo → N drafts; multi-draft review UI with batch save.
Shared scan types: src/features/scan/types.ts (7 types — ParsedRecipe, ParsedIngredient, FieldConfidence, etc.).
Subscription: SubscriptionProvider + useSubscription() hook; RevenueCat native SDK + @revenuecat/purchases-js web; server-side scan count via Supabase RPC; PaywallPlaceholder with dynamic RevenueCatUI/Stripe checkout.

## Capability Contract

See `.gsd/REQUIREMENTS.md` for the explicit capability contract, requirement status, and coverage mapping.

## Milestone Sequence

- [x] M001: Migration — Full-stack cross-platform family recipe app with AI scanning, family spaces, responsive design, public browsing, ads
- [x] M002: Production Polish — Multi-recipe scan, SEO structured data, production ad config, GDPR consent, UX polish
- [x] M003: Quality Audit & Cleanup — Scan code consolidation, dead code removal, form focus chaining, cross-platform alert fix, scan UI polish, logging cleanup, full app audit
- [x] M004: QOL & Bug Fixes — Ingredient highlighting in cooking walkthrough, smart liquid/dry unit conversions, multi-image scan timeout fix, iOS full-screen scanner
- [x] M005: Technical Hardening — Security fixes, data integrity, performance, code deduplication, type safety, error handling, end-to-end verification
- [x] M006: Subscriptions — RevenueCat integration, freemium scan gating (3/month free), paywall UI, ad-free for subscribers, web billing via Stripe, setup documentation

## Backlog

_(empty)_

---
*Last updated: 2026-03-17 after M006 completion*
