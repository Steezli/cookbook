# Stack Research

**Domain:** Family recipe vault (handwritten recipe scanning + family sharing)
**Researched:** 2026-02-02
**Confidence:** MEDIUM

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Expo (React Native + Web) | TBD (pin at implementation) | One codebase for iOS/Android/Web | Best balance of speed, DX, and cross-platform UI for a solo builder; strong ecosystem for camera, file upload, auth flows |
| React | TBD (pin at implementation) | UI layer | Mature ecosystem; pairs well with Expo and broad library support |
| PostgreSQL | TBD (managed) | Primary relational database | Strong SQL + full-text search; good fit for recipe querying, permissions, and analytics |
| Supabase (Postgres + Auth + Storage) | TBD (pin at implementation) | Backend platform | Ships auth, storage (recipe images), SQL + RLS for privacy controls; fast path to “family spaces” with role-based access |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Expo Router | TBD | File-based routing across platforms | If using Expo for web + mobile with shared navigation |
| TanStack Query | TBD | Client caching + async state | Recipe lists, search results, comments/ratings; makes offline-ish UX easier later |
| Zod | TBD | Runtime validation | Validate AI extraction payloads and API boundaries |
| Stripe | TBD | Web subscriptions/payments | If subscription unlocks scanning on web |
| RevenueCat | TBD | Mobile subscriptions (IAP) | If scanning subscription is sold via iOS/Android stores |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| TypeScript (optional) | Safer shared types | Recommended once shared mobile/web + backend boundaries grow; keep strictness pragmatic |
| ESLint + Prettier | Consistent code style | Prevents drift across shared codebase |

## Installation

```bash
# (Pinned versions decided during implementation once the repo is scaffolded.)
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Supabase | Custom Node API (Fastify/Nest) + Postgres | If you need custom auth, heavy server-side orchestration, or want to avoid a platform dependency |
| Expo | Native iOS/Android + separate web app | If you need deep native features/performance beyond Expo, or very different UX between web and mobile |
| Postgres full-text search | External search (Algolia/Meilisearch) | If search must be “instant” across huge datasets, or supports advanced ranking/typo-tolerance |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| On-device OCR-only for handwriting (as the sole strategy) | Handwriting accuracy is often poor; leads to frustrating “AI failed” UX | Use best-effort OCR + structured draft + user correction as first-class |
| “Everything public by default” | Conflicts with the core “family secret” promise | Private/family default with explicit opt-in to public |

## Stack Patterns by Variant

**If the app must be “offline-first”:**
- Use local database (SQLite) + sync layer
- Because recipes should remain accessible without connectivity and edits must reconcile reliably

**If scanning becomes the core paid feature:**
- Use a server-side “scanning pipeline” (queue + retries)
- Because AI/OCR calls fail intermittently; you want reliability and user-visible progress

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| Expo SDK | React / React Native versions | Must align to Expo SDK’s supported RN/React versions; pin together |

## Sources

- No live web/package registry access available in this environment, so versions are marked TBD and should be pinned during project scaffolding.

---
*Stack research for: family recipe scanning + sharing app*
*Researched: 2026-02-02*
