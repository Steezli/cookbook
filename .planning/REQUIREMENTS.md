# Requirements: Cookbook (Family Recipe Vault)

**Defined:** 2026-02-02
**Core Value:** Families can save and share treasured recipes (like Grandma’s) without losing control over who gets to see them.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Authentication

- [ ] **AUTH-01**: User can create an account with email/password
- [ ] **AUTH-02**: User can log in and stay logged in across sessions
- [ ] **AUTH-03**: User can reset password via email link
- [ ] **AUTH-04**: User can log out from any screen

### Family Spaces

- [ ] **FAM-01**: User can create a family space
- [ ] **FAM-02**: Family admins can invite members to join a family space
- [ ] **FAM-03**: Invitee can accept an invite and join the family space
- [ ] **FAM-04**: Family space has roles (at least admin/member) controlling invites and member management
- [ ] **FAM-05**: Admin can remove a member; member can leave a family space

### Recipe Visibility & Access Control

- [ ] **VIS-01**: Recipe can be set to one visibility level: private / family / public
- [ ] **VIS-02**: Users can only view recipes they are allowed to access (privacy enforced server-side, not only in UI)

### Recipes

- [ ] **REC-01**: User can create a recipe manually with ingredients and steps
- [ ] **REC-02**: User can edit a recipe (ingredients, steps, metadata)
- [ ] **REC-03**: User can delete a recipe they own (and/or have permission to manage)
- [ ] **REC-04**: User can attach one or more photos to a recipe
- [ ] **REC-05**: Recipe supports optional fields: servings, prep time, cook time, tags, and source story

### Collections & Organization

- [ ] **COLL-01**: User can tag recipes for easy filtering (e.g., “Holiday”, “Dessert”)
- [ ] **COLL-02**: User can create named collections and add/remove recipes (personal and/or family collections)

### Search & Browse

- [ ] **SRCH-01**: User can search recipes by title and tags
- [ ] **SRCH-02**: User can browse recipes by visibility and by family space

### Scan → Draft (AI-assisted)

- [ ] **SCAN-01**: User can upload a recipe photo to start a scan job
- [ ] **SCAN-02**: Scan job produces a structured draft (ingredients, steps, and units) and retains the raw extracted text for reference
- [ ] **SCAN-03**: User can review and edit any field in the draft before saving as a normal recipe
- [ ] **SCAN-04**: User can see scan status and retry failed scans

### Units (Metric/Imperial)

- [ ] **UNIT-01**: Ingredients support canonical amount+unit storage where possible, while preserving as-entered text for ambiguous cases
- [ ] **UNIT-02**: User can set a preferred unit system (metric/imperial) and recipes display accordingly

### Comments & Ratings

- [ ] **SOC-01**: Users can comment on recipes they can access (family-only discussion for private/family; public discussion for public recipes)
- [ ] **SOC-02**: Users can rate recipes with 0–5 stars in 0.5 increments; recipes display average rating and count

### Public Discovery & Monetization

- [ ] **PUB-01**: Users can browse public recipes (list + detail)
- [ ] **PUB-02**: Public recipes show attribution to the user who added them
- [ ] **MON-01**: Minimal ads appear only in public browsing (no ads in private/family areas)
- [ ] **MON-02**: Scanning feature can be gated by subscription entitlement (v1 hypothesis)

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Scan Enhancements

- **SCAN-05**: Draft UI highlights low-confidence fields and suggests fixes
- **SCAN-06**: Multi-photo stitching for long recipes (front/back pages)
- **SCAN-07**: Auto-tagging and category suggestions from recipe content

### Units & Cooking Utilities

- **UNIT-03**: User can scale recipe amounts by servings (with safe rounding and overrides)
- **UNIT-04**: Ingredient conversions support common ingredient densities (user-editable)

### Offline & Sync

- **OFF-01**: Recipes are readable offline
- **OFF-02**: Edits made offline sync safely when reconnected

### Monetization & Business

- **MON-03**: User can subscribe/cancel and see entitlement status on all platforms
- **MON-04**: Family plan tiers (e.g., more scan credits, larger storage)

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Aggressive ads (layout shift, popups, autoplay) | Conflicts with “easy for Grandma” and reading flow |
| Default-public recipes | Violates privacy-first “family secret” promise |
| Auto-publish scans without review | Handwriting OCR is error-prone; trust requires editing |
| Full version history for recipes | Complexity; “duplicate and edit” covers most needs early |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1 | Pending |
| AUTH-02 | Phase 1 | Pending |
| AUTH-03 | Phase 1 | Pending |
| AUTH-04 | Phase 1 | Pending |
| FAM-01 | Phase 1 | Pending |
| FAM-02 | Phase 1 | Pending |
| FAM-03 | Phase 1 | Pending |
| FAM-04 | Phase 1 | Pending |
| FAM-05 | Phase 1 | Pending |
| VIS-01 | Phase 1 | Pending |
| VIS-02 | Phase 1 | Pending |
| REC-01 | Phase 2 | Pending |
| REC-02 | Phase 2 | Pending |
| REC-03 | Phase 2 | Pending |
| REC-04 | Phase 2 | Pending |
| REC-05 | Phase 2 | Pending |
| COLL-01 | Phase 2 | Pending |
| COLL-02 | Phase 2 | Pending |
| SRCH-01 | Phase 2 | Pending |
| SRCH-02 | Phase 2 | Pending |
| SCAN-01 | Phase 3 | Pending |
| SCAN-02 | Phase 3 | Pending |
| SCAN-03 | Phase 3 | Pending |
| SCAN-04 | Phase 3 | Pending |
| UNIT-01 | Phase 4 | Pending |
| UNIT-02 | Phase 4 | Pending |
| SOC-01 | Phase 4 | Pending |
| SOC-02 | Phase 4 | Pending |
| PUB-01 | Phase 5 | Pending |
| PUB-02 | Phase 5 | Pending |
| MON-01 | Phase 5 | Pending |
| MON-02 | Phase 5 | Pending |

**Coverage:**
- v1 requirements: 31 total
- Mapped to phases: 31
- Unmapped: 0 ✓

---
*Requirements defined: 2026-02-02*
*Last updated: 2026-02-02 after initial definition*
