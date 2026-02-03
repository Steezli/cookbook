# Feature Research

**Domain:** Family recipe vault (handwritten recipe scanning + family sharing)
**Researched:** 2026-02-02
**Confidence:** MEDIUM

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Account + sign-in | Personal library needs identity | MEDIUM | Email/password is sufficient for v1 |
| Recipe CRUD | Core object model | MEDIUM | Create, edit, delete; rich fields (ingredients/steps/tags) |
| Search + filtering | Recipes become unmanageable otherwise | MEDIUM | Title/tag/ingredient search; later full-text |
| Photos | Recipes are visual/handwritten | MEDIUM | Photo(s) attached to recipe; storage + thumbnailing |
| Sharing controls | Privacy is critical here | HIGH | Private / family / public; invite-only families |
| Comments + ratings | Families iterate on recipes | MEDIUM | 5-star with half-stars; privacy depends on visibility |
| Unit handling | Global families cook differently | HIGH | Canonical storage + display preference; conversions must be transparent |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required, but valuable.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Family space + “secret recipes” | The heirloom promise | HIGH | Invite model + roles; default-private vibe |
| Handwritten scan → structured draft | Saves time, reduces friction | HIGH | OCR + parsing + UI for corrections |
| Source story / provenance | Adds emotional value | LOW | “Grandma’s note” + who added it + when |
| Collections shared to family | Organizes by family traditions | MEDIUM | “Holiday”, “Weeknight”, “Canning”, etc. |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Auto-publish scanned recipes with no review | “Magic” UX | Handwriting OCR is error-prone; creates distrust | Always require review; show diffs/highlights |
| Heavy ad monetization | Immediate revenue | Breaks reading flow; feels extractive for family heirlooms | Ads only on public browsing; subscription for scanning |

## Feature Dependencies

```
[Family Sharing]
    └──requires──> [Accounts/Auth]
                       └──requires──> [Permissions Model]

[AI Scanning]
    └──requires──> [Photo Upload/Storage]
                       └──requires──> [Recipe Data Model]

[Public Recipes]
    └──enhances──> [Discovery/Search]
```

### Dependency Notes

- **Family Sharing requires Accounts/Auth:** invitations and permissions need identity.
- **AI Scanning requires Photo Upload/Storage:** scans start from images; storage must be reliable.
- **Public Recipes enhances Discovery/Search:** public browsing is where ads live; search UX becomes product-facing.

## MVP Definition

### Launch With (v1)

- [ ] Invite-only family space + per-recipe privacy (private / family / public) — core differentiation
- [ ] Recipe CRUD (ingredients + steps + optional extras) — base value
- [ ] Scan photo → structured draft + full edit — biggest time-saver
- [ ] Search + basic filters — daily usability
- [ ] Comments + ratings (family/private vs public split) — collaborative cooking loop
- [ ] Metric/imperial display preference backed by canonical storage — global usability

### Add After Validation (v1.x)

- [ ] Recipe duplication (“copy and tweak”) — supports variations without versioning complexity
- [ ] Better search (ingredient parsing, full-text ranking) — when library grows
- [ ] Share-to-public flows (templates, attribution controls) — polish for discovery

### Future Consideration (v2+)

- [ ] Offline-first editing + sync — high complexity, big UX win
- [ ] Grocery list / meal planning — adjacent, but expands scope significantly
- [ ] Advanced AI (auto-tagging, step timings, substitutions) — after trust is established

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Family space + invites | HIGH | HIGH | P1 |
| Recipe CRUD | HIGH | MEDIUM | P1 |
| Scan → structured draft + edit | HIGH | HIGH | P1 |
| Search/filter | HIGH | MEDIUM | P1 |
| Comments/ratings | MEDIUM | MEDIUM | P2 |
| Public browsing + ads | MEDIUM | MEDIUM | P2 |
| Subscriptions for scanning | MEDIUM | HIGH | P2 |

## Sources

- Based on common expectations for recipe apps + scanning workflows; validate with user testing early (especially “Grandma-friendly” flows).

---
*Feature research for: family recipe scanning + sharing app*
*Researched: 2026-02-02*
