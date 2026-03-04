---
phase: 10
slug: core-screens
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-04
---

# Phase 10 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest 29.7 + ts-jest |
| **Config file** | `jest.config.js` |
| **Quick run command** | `npx jest --passWithNoTests` |
| **Full suite command** | `npx jest` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx jest --passWithNoTests`
- **After every plan wave:** Run `npx jest`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 10-00-01 | 00 | 0 | SCREEN-02 | unit (TDD) | `npx jest --testPathPattern="RecipeCard"` | created in W0 | ⬜ pending |
| 10-00-02 | 00 | 0 | SCREEN-04a | unit (TDD) | `npx jest --testPathPattern="cookingMode"` | created in W0 | ⬜ pending |
| 10-01-01 | 01 | 1 | SCREEN-02 | type-check | `npx tsc --noEmit src/components/recipes/RecipeCard.tsx` | n/a | ⬜ pending |
| 10-01-02 | 01 | 1 | SCREEN-01 | type-check | `npx tsc --noEmit app/(tabs)/index.tsx` | n/a | ⬜ pending |
| 10-02-01 | 02 | 1 | SCREEN-03 | type-check | `npx tsc --noEmit app/(tabs)/recipes/[id].tsx` | n/a | ⬜ pending |
| 10-03-01 | 03 | 2 | SCREEN-02 | type-check | `npx tsc --noEmit app/(tabs)/recipes/index.tsx` | n/a | ⬜ pending |
| 10-04-01 | 04 | 1 | SCREEN-04 | type-check | `npx tsc --noEmit src/components/recipes/RecipeForm.tsx` | n/a | ⬜ pending |
| 10-04-02 | 04 | 1 | SCREEN-04 | type-check | `npx tsc --noEmit app/(tabs)/recipes/create.tsx app/(tabs)/recipes/[id]/edit.tsx` | n/a | ⬜ pending |
| 10-05-01 | 05 | 1 | SCREEN-04a | type-check | `npx tsc --noEmit app/(tabs)/recipes/[id]/cook.tsx` | n/a | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `src/components/recipes/__tests__/RecipeCard.test.ts` — stubs for numColumns logic and time formatting (SCREEN-02) -- **Plan 10-00, Task 1**
- [x] `src/features/cooking/__tests__/cookingMode.test.ts` — stubs for progress calculation and step navigation pure functions (SCREEN-04a) -- **Plan 10-00, Task 2**

*Wave 0 plan: 10-00-PLAN.md (wave: 0, depends_on: []) creates both test files and their utility modules via TDD.*

*No framework installation needed — jest.config.js and ts-jest already configured.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Home screen greeting + layout | SCREEN-01 | Visual layout verification against .pen spec | Load home screen; verify greeting, search, featured/recent sections render |
| Recipe list responsive grid | SCREEN-02 | Breakpoint visual verification | Resize browser across mobile/tablet/web; verify 1/2/3 column grid |
| Recipe detail layout + ratings/comments | SCREEN-03 | Visual layout + section ordering | Load recipe detail; verify hero image, sections, sticky header, ratings, comments |
| Create/edit form layout | SCREEN-04 | Visual form field alignment | Load create form; verify field layout, max-width on web |
| Cooking mode step-by-step UI | SCREEN-04a | Full-screen walkthrough UX | Start cooking mode; verify step display, progress bar, prev/next nav |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (Plan 10-00 creates both test files)
- [x] No watch-mode flags
- [x] Feedback latency < 10s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** complete
