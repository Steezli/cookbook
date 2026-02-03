# Project Research Summary

**Project:** Cookbook (Family Recipe Vault)
**Domain:** Handwritten recipe capture + family sharing + optional public discovery
**Researched:** 2026-02-02
**Confidence:** MEDIUM

## Executive Summary

This project is a privacy-first “family recipe vault” with an AI-assisted capture flow: turn a photo of a handwritten recipe into an editable, structured draft and then save it into an invite-only family space. The differentiator is not “best OCR,” but a trustworthy workflow that keeps families in control of what stays private versus what becomes public.

Experts typically build this kind of app by prioritizing (1) access control correctness, (2) a durable recipe data model, and (3) an asynchronous scan pipeline that is honest about uncertainty. Monetization should not compromise the core vibe; the cleanest approach is ads only on public browsing and subscription entitlements for scanning.

The main risks are privacy leaks, loss of trust due to OCR errors, and unit conversion ambiguity. These are mitigated by policy-first access control, correction-first scan UX, and a canonical-but-overrideable unit model.

## Key Findings

### Recommended Stack

Cross-platform via Expo (React Native + web) provides speed without sacrificing mobile capabilities (camera, uploads). A SQL-first backend (Postgres) is a strong match for recipe queries and permissions; a managed platform like Supabase can accelerate auth/storage and enable policy enforcement via RLS.

**Core technologies:**
- Expo (React Native + web): single codebase and strong camera/upload ecosystem
- PostgreSQL: robust relational model, indexing, and full-text search paths
- Supabase (optional): fast path to auth + storage + RLS for privacy enforcement

### Expected Features

**Must have (table stakes):**
- Account + sign-in
- Recipe CRUD with photos
- Search/filtering
- Privacy + sharing controls (private/family/public)
- Unit support (metric/imperial display)

**Should have (competitive):**
- Invite-only family space with roles/invites
- Handwritten scan → structured draft + review/edit
- Source story/provenance

**Defer (v2+):**
- Offline-first sync
- Grocery list / meal planning
- Advanced AI enhancements

### Architecture Approach

Privacy-first access control and a scan pipeline with explicit status are the two architectural anchors. Treat scan output as draft content, not truth, and ensure recipe visibility is enforced at the data layer.

**Major components:**
1. Identity + family membership — invites, roles, access rules
2. Recipe domain — model, visibility, CRUD, search
3. Scan pipeline — upload, OCR/parse, draft, review, finalize

### Critical Pitfalls

1. **Accidental privacy leaks** — avoid by enforcing access at data layer + tests
2. **Scanning UX that feels like a lie** — avoid by correction-first draft UX
3. **Unit conversion destroys trust** — avoid by canonical storage + overrides + transparency

## Implications for Roadmap

Suggested phase structure:

### Phase 1: Foundation (accounts + family spaces + privacy model)
**Rationale:** Privacy correctness is non-negotiable; all other features depend on identity and access control.
**Delivers:** Users, families, invitations, role model, visibility rules.
**Avoids:** Accidental privacy leaks.

### Phase 2: Recipe Core (data model + CRUD + collections)
**Rationale:** You need a durable recipe representation before scanning and search become meaningful.
**Delivers:** Recipe create/edit, photos, tags/collections, basic search.

### Phase 3: Scan Pipeline (photo → structured draft → review)
**Rationale:** Scanning is the highest complexity and a potential paid feature; build on stable recipe model.
**Delivers:** Upload + OCR/parse + editable structured draft + finalize flow.
**Avoids:** “OCR as truth” trust collapse.

### Phase 4: Units + Ratings/Comments (trust + collaboration)
**Rationale:** Unit correctness and family feedback loops reinforce retention.
**Delivers:** Canonical unit model + metric/imperial display; comments + half-star ratings.
**Avoids:** Conversion ambiguity undermining trust.

### Phase 5: Public Discovery + Monetization (optional public + ads + subscription)
**Rationale:** Keep public/ads isolated so the family experience stays clean.
**Delivers:** Public recipe browsing, minimal ads, subscription entitlement for scanning.
**Avoids:** Public features cannibalizing the family promise.

### Phase Ordering Rationale

- Identity + access control first (all privacy depends on it).
- Recipe model before scanning (scan output needs a target structure).
- Scanning before monetization (you can’t sell what doesn’t reliably work).
- Public/ads last to avoid contaminating core UX.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 3:** OCR/AI provider choice + parsing UX (complex, trust-sensitive)
- **Phase 5:** Cross-platform monetization (Stripe vs IAP) + entitlement model

Phases with standard patterns:
- **Phase 1-2:** Auth + CRUD + SQL modeling have established patterns (still require careful execution)

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | MEDIUM | General recommendations are solid; versions need pinning during implementation |
| Features | MEDIUM | Needs quick user validation on “Grandma flow” and what “simple” really means |
| Architecture | MEDIUM | Common patterns; details depend on chosen backend platform |
| Pitfalls | HIGH | Failure modes are consistent in privacy + OCR products |

**Overall confidence:** MEDIUM

### Gaps to Address

- Decide OCR/AI provider and exact pipeline (cost, quality, latency).
- Decide whether Expo web is sufficient or whether a dedicated web app is needed later.
- Define the exact “canonical units” representation and how to handle freeform ingredients.

## Sources

### Primary (HIGH confidence)
- None (no live docs access in this environment)

### Secondary (MEDIUM confidence)
- Established patterns for privacy-first apps, OCR workflows, and cross-platform consumer products

---
*Research completed: 2026-02-02*
*Ready for roadmap: yes*
