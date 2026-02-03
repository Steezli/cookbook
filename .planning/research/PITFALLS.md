# Pitfalls Research

**Domain:** Family recipe vault (handwritten recipe scanning + family sharing)
**Researched:** 2026-02-02
**Confidence:** MEDIUM

## Critical Pitfalls

### Pitfall 1: Accidental privacy leaks

**What goes wrong:**
Private/family recipes become accessible via a buggy query, misconfigured rules, or public endpoints.

**Why it happens:**
Teams rely on UI hiding instead of enforcing access at the data layer; visibility logic spreads across code.

**How to avoid:**
Make access control policy-first (DB RLS/policies) and add automated tests for “can/can’t access” cases (private/family/public).

**Warning signs:**
“Visibility” filtering only happens client-side; no tests for unauthorized access; shared endpoints with conditional filters.

**Phase to address:**
Phase 1 (foundation + access control) and Phase 2 (recipe CRUD with permissions).

---

### Pitfall 2: Scanning UX that feels like a lie

**What goes wrong:**
OCR is wrong, user can’t easily fix it, and the app feels untrustworthy.

**Why it happens:**
Handwriting is hard; teams optimize for “wow demo” over correction UX.

**How to avoid:**
Treat scan output as a draft. Highlight low-confidence fields, preserve raw OCR text, and make edits fast (tap-to-edit, “add ingredient”, reorder steps).

**Warning signs:**
Users repeatedly re-scan instead of editing; lots of “this is wrong” feedback; long, frustrating edit flows.

**Phase to address:**
Phase 3 (scan pipeline + review UI).

---

### Pitfall 3: Unit conversion destroys trust

**What goes wrong:**
Conversions are incorrect or ambiguous (e.g., “1 cup flour” vs grams; “pinch”; “1 can”).

**Why it happens:**
Not all ingredients convert cleanly; density varies; recipes contain freeform quantities.

**How to avoid:**
Use canonical structured units when possible, but allow “as-entered” freeform text per ingredient. Clearly label when conversions are estimates and allow users to override.

**Warning signs:**
Users stop using conversion toggle; complaints about incorrect results; ingredients stored only as unstructured text with ad-hoc parsing.

**Phase to address:**
Phase 2 (data model) + Phase 4 (units engine + display).

---

### Pitfall 4: Public/community features cannibalize the family promise

**What goes wrong:**
The product drifts into “public recipe social app” and loses the “family heirloom” niche.

**Why it happens:**
Public features are tempting for growth and ads, but they change incentives and UX priorities.

**How to avoid:**
Keep public optional and clearly separated. Public browsing can exist, but family/private flows must be ad-free and frictionless.

**Warning signs:**
More screens optimized for public engagement than family organization; ads creeping into family area.

**Phase to address:**
Phase 5 (public browsing + ads) with explicit boundaries.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Store recipes as a single blob of text | Ships fast | Search, units, scaling, and editing become painful | Only as a temporary “draft” representation |
| Single global “family” role | Less complexity | You’ll need roles (admin/member) for invites/privacy later | OK for v1 if you keep room to evolve schema |
| Synchronous scanning | Simple UI | Timeouts, failures, poor progress visibility | Only if scanning is near-instant (rare) |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| OCR/AI | Calling provider directly from client | Proxy server-side; hide secrets; add retries + rate limits |
| Payments | Platform mismatch (web vs mobile entitlements diverge) | Single entitlement model; separate billing rails (Stripe vs IAP) but same “access flag” |
| Storage | Storing originals without lifecycle controls | Keep originals, but generate thumbnails; consider retention policy for failed scans |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Loading full-resolution images in lists | Slow scrolling, high memory | Thumbnails + lazy loading | Even at small scale |
| Unindexed search queries | Slow search | Add indexes for common filters, consider FTS | As recipe count grows (hundreds+) |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Weak invite links | Unwanted access to family space | Expiring invites, single-use tokens, membership approval |
| Over-broad storage access | Anyone can fetch “private” images | Signed URLs or policy-restricted buckets |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Multi-step “wizard” with too many screens | Grandma abandons flow | One simple “Add recipe” entry with two options (manual / scan) |
| Editing ingredients/steps feels like spreadsheet work | Users stop correcting OCR | Tap-first editing, smart defaults, reorder controls, inline add/remove |

## "Looks Done But Isn't" Checklist

- [ ] **Family sharing:** Verify non-members cannot access family recipes via API.
- [ ] **Scanning:** Verify failed scans surface actionable errors and allow retry.
- [ ] **Units:** Verify conversions don’t silently change meaning; provide overrides.
- [ ] **Ads:** Verify no ads appear in private/family flows.

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Privacy leak | HIGH | Incident review, rotate tokens, audit logs, add tests + policy hardening |
| Bad OCR trust | MEDIUM | Improve review UX, add “confidence” hints, preserve raw OCR, reduce friction |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Accidental privacy leaks | Phase 1-2 | Automated access tests + manual checks with multiple users |
| Scanning UX feels like a lie | Phase 3 | User can fix any field quickly; draft vs final is explicit |
| Unit conversion destroys trust | Phase 4 | Conversion is transparent + overrideable; tests for conversions |
| Public cannibalizes family promise | Phase 5 | Ads isolated to public; public is opt-in per recipe |

## Sources

- Based on common failure modes in privacy-sensitive apps and OCR-driven workflows; validate early with a “Grandma-flow” usability test.

---
*Pitfalls research for: family recipe scanning + sharing app*
*Researched: 2026-02-02*
