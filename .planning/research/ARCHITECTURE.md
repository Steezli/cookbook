# Architecture Research

**Domain:** Family recipe vault (handwritten recipe scanning + family sharing)
**Researched:** 2026-02-02
**Confidence:** MEDIUM

## Standard Architecture

### System Overview

```
┌──────────────────────────────────────────────────────────────────────────┐
│                             Clients (UI)                                 │
├──────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────┐              ┌──────────────────────────────┐  │
│  │ Mobile (iOS/Android) │              │ Web                           │  │
│  │ Expo / React Native  │              │ Expo Web (or Next.js later)   │  │
│  └───────────┬──────────┘              └──────────────┬───────────────┘  │
│              │                                         │                  │
├──────────────┴─────────────────────────────────────────┴──────────────────┤
│                         API / Backend Layer                                │
├──────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────┐   ┌────────────────────────┐   ┌─────────────┐ │
│  │ Auth + Permissions    │   │ Recipe Domain API      │   │ Scan Pipeline│ │
│  │ (families, roles)     │   │ (CRUD, search, social) │   │ (OCR + parse)│ │
│  └───────────┬──────────┘   └─────────────┬──────────┘   └──────┬──────┘ │
│              │                              │                     │        │
├──────────────┴──────────────────────────────┴─────────────────────┴────────┤
│                         Data / Storage Layer                                │
├──────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────┐   ┌────────────────────────┐   ┌─────────────┐ │
│  │ Postgres (SQL)        │   │ Object Storage         │   │ Queue/Jobs   │ │
│  │ recipes, families,    │   │ recipe photos/scans    │   │ scan retries │ │
│  │ comments, ratings     │   │ thumbnails             │   │ status       │ │
│  └──────────────────────┘   └────────────────────────┘   └─────────────┘ │
└──────────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| Identity + Family Space | Users, families, invitations, membership roles | Auth provider + DB tables + RLS policies |
| Recipe Domain | Recipe model, visibility, CRUD, tags, collections | API endpoints + DB constraints + query helpers |
| Social Layer | Comments + ratings (half-stars), moderation primitives | Tables + policies + indexes |
| Scan Pipeline | Accept image, run OCR, parse into structured draft, store status | Server function + retries + human-edit UI |
| Units Engine | Canonical storage + conversion for display | Shared library + test suite for conversions |

## Recommended Project Structure

```
src/
├── app/                 # Routes/screens (Expo Router)
├── components/          # Shared UI components
├── features/            # Feature modules (recipes, families, scan, etc.)
├── lib/
│   ├── api/             # Client API wrappers
│   ├── auth/            # Auth helpers
│   ├── units/           # Canonical amounts + conversions
│   └── validation/      # Zod schemas and parsing
├── store/               # State/query config (TanStack Query)
└── assets/              # Icons, fonts, etc.
```

### Structure Rationale

- **features/** keeps domain logic from becoming “screen soup.”
- **lib/units/** is intentionally isolated and testable (unit conversion correctness is trust-critical).

## Architectural Patterns

### Pattern 1: Policy-first access control (RLS / permission gates)

**What:** Enforce recipe visibility and family membership at the data layer.
**When to use:** Always, because privacy is core and mistakes are catastrophic.
**Trade-offs:** Requires careful policy design; simplifies API correctness.

### Pattern 2: Scan as an asynchronous job with explicit status

**What:** Upload image → create “scan job” → process → produce draft → user review.
**When to use:** When OCR/AI calls are slow/failure-prone.
**Trade-offs:** More moving parts; much better UX than “spinner forever.”

### Pattern 3: Canonical recipe amounts with reversible display formatting

**What:** Store structured ingredients with canonical units/quantities; render per-user preference.
**When to use:** When you need consistent scaling, conversion, and search.
**Trade-offs:** Needs a robust parsing/edit UI; fallback for “freeform” ingredients.

## Data Flow

### Request Flow

```
[User takes photo]
    ↓
[Upload] → [Create scan job] → [Scan worker] → [OCR + parse]
    ↓                              ↓
[Status updates]              [Draft recipe saved]
    ↓
[User reviews/edits] → [Finalize recipe] → [Visible in collection]
```

### Key Data Flows

1. **Recipe visibility:** UI filters + backend policies ensure only allowed recipes are returned.
2. **Public browsing:** Only “public” recipes are queryable; ads are shown only on public screens.

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0-1k users | Single backend + managed DB is fine; keep scan jobs simple |
| 1k-100k users | Add job queue + rate limits for scanning; index search paths; add caching for public browsing |
| 100k+ users | Split scan pipeline into dedicated workers; consider dedicated search if needed |

## Anti-Patterns

### Anti-Pattern 1: “Soft privacy” in the UI only

**What people do:** Hide private recipes in client filters.
**Why it's wrong:** One API mistake leaks family recipes.
**Do this instead:** Enforce at data layer (RLS/policies) and test access rules.

### Anti-Pattern 2: Treating OCR output as truth

**What people do:** Save OCR text as final recipe.
**Why it's wrong:** Handwriting OCR will be wrong; trust collapses.
**Do this instead:** Always show editable draft and make correction UX first-class.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| OCR/AI provider | Server-side calls from scan worker | Avoid shipping secrets to client; support retries + rate limits |
| Payments | Web payments + mobile IAP | Keep entitlement logic consistent across platforms |
| Ads | Web-only (public pages) | Avoid ads in family/private flows |

## Sources

- Based on common patterns for privacy-sensitive consumer apps + asynchronous “media processing” workflows.

---
*Architecture research for: family recipe scanning + sharing app*
*Researched: 2026-02-02*
