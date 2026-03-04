# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.0 — MVP

**Shipped:** 2026-03-04
**Phases:** 6 | **Plans:** 33 | **Commits:** 199

### What Was Built
- Complete auth, family spaces, and RLS-enforced recipe visibility (private/family/public)
- Full recipe CRUD with photos, collections, tags, search
- Photo-to-recipe scanning pipeline: upload → OCR → confidence scoring → editable draft → save as recipe
- Multi-image upload for multi-page recipes
- Threaded comments, half-star ratings, unit conversion engine with metric/imperial preference
- Native-compatible scan UI (DraftReview/DraftEditor/DraftManager as React Native components)

### What Worked
- Parallel plan execution within waves — significantly reduced wall clock time
- UAT-driven gap closure cycle (verify → diagnose → plan → execute → re-verify) caught real bugs
- Phase 6 and 7 gap closure phases were effective at resolving integration issues found by milestone audit
- JSONB for ingredients/steps avoided schema explosion while keeping structured data
- Supabase RLS as single source of truth for access control — no separate auth middleware needed

### What Was Inefficient
- DraftReview/DraftEditor were initially built with web HTML and Tailwind, then had to be entirely rewritten for React Native in Phase 7 — should have used RN components from the start
- Multiple rounds of scan integration fixes (Phase 6 had 7 plans, many UAT-driven) — initial Phase 3 implementation had gaps in auth wiring, ID mapping, and navigation
- Phase 4 plan 04-06 checkbox never updated to [x] in ROADMAP despite being complete
- Phase 5 (Public + Monetization) was planned in roadmap but never started — should have been scoped out earlier
- Some SUMMARY.md files don't follow consistent format (Phase 1 had different structure)

### Patterns Established
- `getDraftByJobId` bridge pattern for resolving scan job IDs to draft FKs
- Confidence badge pattern: `getConfidenceStyle()` returns `{ bg, text }` color pairs
- Modal dialog pattern: RN Modal with transparent overlay for all action confirmations
- Security definer for recursive CTE functions to avoid RLS recursion
- Denormalized aggregates (rating counts) with database triggers for consistency

### Key Lessons
1. **Build for the target platform from day one.** Web HTML → React Native rewrites are avoidable. Use RN components even when prototyping.
2. **ID mapping bugs are the #1 integration failure mode.** Three separate bugs involved passing the wrong ID type (job ID vs draft PK, scan_job_id vs draft id). Name parameters clearly and document which ID space they're in.
3. **UAT on device catches bugs that static analysis misses.** The draft save failure only surfaced when testing the actual save flow on device — the ID types matched at the TypeScript level but the runtime values were wrong.
4. **Gap closure phases work.** The audit → plan-gaps → execute-gaps → re-verify cycle is reliable for closing integration issues. Budget for 1-2 gap closure phases per milestone.
5. **Scope decisions should happen early.** Phase 5 sat unimplemented for the entire milestone. Better to defer explicitly at planning time than carry dead phases in the roadmap.

### Cost Observations
- Model mix: Primarily opus for execution, sonnet for verification/checking
- Sessions: ~15-20 across 29 days
- Notable: Parallel wave execution saved significant time in phases with multiple independent plans

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Commits | Phases | Key Change |
|-----------|---------|--------|------------|
| v1.0 | 199 | 6 | Established UAT → gap closure cycle |

### Cumulative Quality

| Milestone | LOC | Files | Gap Closure Phases |
|-----------|-----|-------|--------------------|
| v1.0 | 20,548 | 86 | 2 (Phase 6, 7) |

### Top Lessons (Verified Across Milestones)

1. Build for target platform from the start — rewriting UI layers is expensive
2. ID mapping is the most common integration bug category — be explicit about ID spaces
