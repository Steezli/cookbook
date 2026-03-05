---
phase: 11
slug: public-browsing
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-04
---

# Phase 11 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest 29.7 + ts-jest 29.4 |
| **Config file** | `jest.config.js` |
| **Quick run command** | `npx jest --testPathPattern=public` |
| **Full suite command** | `npx jest` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx jest --testPathPattern=public`
- **After every plan wave:** Run `npx jest`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 11-01-01 | 01 | 1 | PUB-01, PUB-04 | unit | `npx jest --testPathPattern=searchPublicRecipes` | ❌ W0 | ⬜ pending |
| 11-01-02 | 01 | 1 | PUB-02 | unit | `npx jest --testPathPattern=publicRecipes` | ❌ W0 | ⬜ pending |
| 11-02-01 | 02 | 1 | PUB-03 | unit | `npx jest --testPathPattern=PublicNavHeader` | ❌ W0 | ⬜ pending |
| 11-03-01 | 03 | 2 | PUB-01 | manual | Visual verification | N/A | ⬜ pending |
| 11-03-02 | 03 | 2 | PUB-02 | manual | Visual verification | N/A | ⬜ pending |
| 11-04-01 | 04 | 2 | PUB-04 | unit | `npx jest --testPathPattern=searchPublicRecipes` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/features/recipes/__tests__/searchPublicRecipes.test.ts` — stubs for PUB-01, PUB-04 (pagination, search, tag filter)
- [ ] `src/features/recipes/__tests__/publicRecipes.test.ts` — stubs for PUB-02 (author RPC shape, initials derivation)
- [ ] `src/components/public/__tests__/PublicNavHeader.test.ts` — stubs for PUB-03 (breakpoint-specific element rendering)

*Supabase calls mocked via existing moduleNameMapper pattern.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Mobile list layout renders horizontal rows (not card grid) | PUB-01 | Visual/layout verification | Open browse on mobile viewport, confirm 72×72 thumbnails with horizontal text |
| Public nav header renders correct CTA per breakpoint | PUB-03 | Layout and breakpoint rendering | Resize viewport through mobile/tablet/web, verify Sign In + Get Started buttons |
| Recipe detail shows truncated ingredients with "+N more" | PUB-02 | Visual verification | Open recipe with >3 ingredients, confirm truncation and link text |
| Infinite scroll loads next page on scroll | PUB-04 | Interaction behavior | Scroll to bottom of browse list, confirm spinner and new results append |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
