# Roadmap: Cookbook (Family Recipe Vault)

**Created:** 2026-02-02

All v1 requirements map to exactly one phase.

## Phases (v1)

| # | Phase | Goal | Requirements | Success Criteria |
|---|-------|------|--------------|------------------|
| 1 | Foundation (Identity + Family + Privacy) | Safe invite-only family spaces with enforced recipe visibility | AUTH-01..04, FAM-01..05, VIS-01..02 | 4 |
| 2 | Recipe Core (Create + Organize + Find) | Users can build and manage a recipe library | REC-01..05, COLL-01..02, SRCH-01..02 | 4 |
| 3 | Scan to Draft (Photo → Structured) | Photos become editable recipe drafts that users can finalize | SCAN-01..04 | 4 |
| 4 | Trust + Collaboration (Units + Social) | Units display correctly and families can discuss/rate recipes | UNIT-01..02, SOC-01..02 | 4 |
| 5 | Public + Monetization (Optional) | Public browsing exists and monetization stays non-intrusive | PUB-01..02, MON-01..02 | 4 |

---

## Phase Details

### Phase 1: Foundation (Identity + Family + Privacy)

**Goal:** Safe invite-only family spaces with enforced recipe visibility.

**Requirements:**
AUTH-01, AUTH-02, AUTH-03, AUTH-04,
FAM-01, FAM-02, FAM-03, FAM-04, FAM-05,
VIS-01, VIS-02

**Success criteria:**
1. User can sign up, log in, stay logged in, and log out.
2. User can create a family space, invite another user, and that user can join successfully.
3. A non-member cannot access family recipes via API/data queries (privacy is enforced server-side).
4. A recipe’s visibility (private/family/public) is a first-class field and is respected everywhere.

### Phase 2: Recipe Core (Create + Organize + Find)

**Goal:** Users can build and manage a recipe library.

**Requirements:**
REC-01, REC-02, REC-03, REC-04, REC-05,
COLL-01, COLL-02,
SRCH-01, SRCH-02

**Success criteria:**
1. User can create/edit/delete a recipe with ingredients + steps and optional metadata.
2. User can attach photos to a recipe and see thumbnails in lists.
3. User can tag recipes and group them into collections.
4. User can search by title/tags and browse their accessible recipe lists.

### Phase 3: Scan to Draft (Photo → Structured)

**Goal:** Photos become editable recipe drafts that users can finalize.

**Requirements:**
SCAN-01, SCAN-02, SCAN-03, SCAN-04

**Success criteria:**
1. User can upload a photo to start a scan job and see progress/status.
2. A scan produces a structured draft (ingredients/steps/units) and preserves raw extracted text.
3. User can correct any extracted field and save the result as a normal recipe.
4. Failed scans show actionable errors and support retry without losing user work.

### Phase 4: Trust + Collaboration (Units + Social)

**Goal:** Units display correctly and families can discuss/rate recipes.

**Requirements:**
UNIT-01, UNIT-02,
SOC-01, SOC-02

**Success criteria:**
1. Ingredients can store canonical amounts/units when possible while preserving as-entered text for ambiguous cases.
2. User can set metric/imperial preference and recipes display accordingly.
3. Family/private recipes support family-only comments; public recipes support public comments.
4. Users can rate recipes with half-star increments and see averages/counts.

### Phase 5: Public + Monetization (Optional)

**Goal:** Public browsing exists and monetization stays non-intrusive.

**Requirements:**
PUB-01, PUB-02,
MON-01, MON-02

**Success criteria:**
1. Users can browse public recipes (list + detail) without needing family membership.
2. Public recipes show attribution to the user who added them (family attribution is explicitly not default).
3. Ads appear only on public browsing screens and do not cause disruptive layout shifts.
4. Scanning can be gated by a subscription entitlement (even if billing UI is minimal in v1).
