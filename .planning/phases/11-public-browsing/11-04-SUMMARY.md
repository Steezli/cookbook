---
phase: 11-public-browsing
plan: 04
subsystem: ui
tags: [expo-router, react-native, responsive, public-browsing, recipe-detail, cta]

# Dependency graph
requires:
  - phase: 11-01
    provides: "Public data layer RPCs (getPublicRecipeAuthor, getRecipeById for anon)"
  - phase: 11-02
    provides: "PublicDetailNavBar component and AdSlot platform-branched components"
provides:
  - "Public recipe detail screen at app/(public)/recipe/[id].tsx"
  - "Read-only recipe view with author attribution, ingredient truncation, sign-up CTA"
  - "Three-breakpoint responsive layout (mobile single-col, tablet constrained, web two-col)"
  - "Root auth-aware router at app/index.tsx for post-login redirect"
affects: [13-advertising, 12-polish]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Two-column web detail layout with right sidebar for ingredients + CTA + ad"
    - "Root index.tsx auth-aware router pattern for post-login redirect"
    - "sidebar AdSlot variant (300x250) alongside leaderboard (728x90) and mobile variants"

key-files:
  created:
    - app/(public)/recipe/[id].tsx
    - app/index.tsx
    - supabase/migrations/20260308000000_fix_public_author_rpc_join.sql
  modified:
    - src/components/public/AdSlot.d.ts
    - src/components/public/AdSlot.native.tsx
    - src/components/public/AdSlot.web.tsx
    - app/(auth)/login.tsx
    - app/(auth)/signup.tsx
    - app/_layout.tsx

key-decisions:
  - "AdSlot sidebar variant (300x250) for web right column instead of leaderboard (728x90)"
  - "Root auth-aware router at app/index.tsx checks session and redirects to (tabs) or (public)"

patterns-established:
  - "Auth-aware root index: app/index.tsx checks Supabase session to route authenticated vs public users"
  - "Sidebar ad variant: 300x250 rectangle for narrow column placement"

requirements-completed: [PUB-02]

# Metrics
duration: 15min
completed: 2026-03-08
---

# Phase 11 Plan 04: Public Recipe Detail Summary

**Read-only recipe detail screen with author attribution, ingredient truncation, sign-up CTA, and three-breakpoint responsive layout (single-column mobile/tablet, two-column web with sidebar)**

## Performance

- **Duration:** ~15 min (continuation from checkpoint)
- **Started:** 2026-03-08T20:58:22Z
- **Completed:** 2026-03-08T21:13:00Z
- **Tasks:** 2 (1 auto + 1 checkpoint verification)
- **Files modified:** 10

## Accomplishments
- Public recipe detail screen with hero image, title, author avatar+initials, description, metadata stats, truncated ingredients, and sign-up CTA
- Web two-column layout places ingredients, CTA card, and ad slot in right sidebar
- Author attribution via SECURITY DEFINER RPC with avatar circle showing initials and display name
- No authenticated actions visible (no edit, rate, comment, or cooking mode buttons)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create public recipe detail screen with responsive layout** - `7ec2ebe` (feat)
2. **Task 2: Verify public browsing flow end-to-end** - checkpoint (human-verify, approved)

**Orchestrator fixes during verification:**
- `ca95cfa` - fix: correct profiles join column in public author RPCs
- `52fc807` - fix: correct detail screen layout and add sidebar ad variant
- `cb0ec7d` - fix: add root auth-aware router to fix post-login redirect

## Files Created/Modified
- `app/(public)/recipe/[id].tsx` - Public recipe detail screen (559 lines) with 3-breakpoint responsive layout
- `app/index.tsx` - Root auth-aware router redirecting based on session state
- `supabase/migrations/20260308000000_fix_public_author_rpc_join.sql` - Fix RPC join column (profiles.user_id not profiles.id)
- `src/components/public/AdSlot.d.ts` - Added sidebar variant type
- `src/components/public/AdSlot.native.tsx` - Added sidebar variant (300x250)
- `src/components/public/AdSlot.web.tsx` - Added sidebar variant (300x250)
- `app/(auth)/login.tsx` - Updated post-login redirect target
- `app/(auth)/signup.tsx` - Updated post-signup redirect target

## Decisions Made
- **AdSlot sidebar variant (300x250):** Web right column is too narrow for 728x90 leaderboard; added 300x250 sidebar variant matching standard IAB medium rectangle ad size
- **Root auth-aware router:** app/index.tsx checks Supabase session and redirects to (tabs) for authenticated users or (public) for anonymous visitors, fixing post-login redirect ambiguity

## Deviations from Plan

### Auto-fixed Issues (Orchestrator-level)

**1. [Rule 1 - Bug] Fixed profiles join column in public author RPCs**
- **Found during:** Task 2 verification
- **Issue:** RPCs joined on profiles.id instead of profiles.user_id, returning no author data
- **Fix:** Migration to recreate RPCs with correct join column
- **Files modified:** supabase/migrations/20260308000000_fix_public_author_rpc_join.sql
- **Committed in:** ca95cfa

**2. [Rule 1 - Bug] Fixed detail screen layout and added sidebar ad variant**
- **Found during:** Task 2 verification
- **Issue:** Content padding was inside ScrollView children instead of parent; leaderboard ad too wide for right column
- **Fix:** Moved padding to ScrollView parent; added sidebar (300x250) AdSlot variant
- **Files modified:** app/(public)/recipe/[id].tsx, AdSlot.d.ts, AdSlot.native.tsx, AdSlot.web.tsx
- **Committed in:** 52fc807

**3. [Rule 3 - Blocking] Added root auth-aware router**
- **Found during:** Task 2 verification
- **Issue:** No root index route caused ambiguous post-login redirect (authenticated users could land on public route)
- **Fix:** Created app/index.tsx that checks session and redirects appropriately
- **Files modified:** app/index.tsx, app/(auth)/login.tsx, app/(auth)/signup.tsx, app/_layout.tsx
- **Committed in:** cb0ec7d

---

**Total deviations:** 3 auto-fixed (2 bugs, 1 blocking)
**Impact on plan:** All fixes necessary for correct end-to-end public browsing flow. No scope creep.

## Issues Encountered
None beyond the deviations documented above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 11 (Public Browsing) is now complete with all 4 plans finished
- Public data layer, shared components, browse screen, and detail screen all working
- Ready for Phase 12 (Polish) or Phase 13 (Advertising) which will replace AdSlot placeholders with real ads

## Self-Check: PASSED

- FOUND: app/(public)/recipe/[id].tsx
- FOUND: app/index.tsx
- FOUND: 7ec2ebe (task 1 commit)
- FOUND: ca95cfa (orchestrator fix 1)
- FOUND: 52fc807 (orchestrator fix 2)
- FOUND: cb0ec7d (orchestrator fix 3)

---
*Phase: 11-public-browsing*
*Completed: 2026-03-08*
