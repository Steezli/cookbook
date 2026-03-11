---
phase: 9
slug: navigation-restructure
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-03
---

# Phase 9 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest 30.x with ts-jest |
| **Config file** | jest.config.js |
| **Quick run command** | `npm test -- --testPathPattern=PageContainer` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test`
- **After every plan wave:** Run `npm test` + manual breakpoint smoke (mobile 390px, tablet 768px, web 1440px)
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 09-01-01 | 01 | 1 | NAV-01 | manual smoke | n/a | N/A | ⬜ pending |
| 09-01-02 | 01 | 1 | NAV-02 | manual smoke | n/a | N/A | ⬜ pending |
| 09-01-03 | 01 | 1 | NAV-03 | manual smoke | n/a | N/A | ⬜ pending |
| 09-01-04 | 01 | 1 | NAV-04 | manual smoke | n/a | N/A | ⬜ pending |
| 09-01-05 | 01 | 1 | NAV-05 | unit | `npm test -- --testPathPattern=PageContainer` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/components/nav/__tests__/PageContainer.test.tsx` — stubs for NAV-05 (padding values per breakpoint)
- [ ] jest.config.js `testMatch` — verify `.test.tsx` pattern included

*Framework already installed. Only test file stubs needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Route group structure — (tabs)/, (auth)/, (scan)/ separation | NAV-01 | File structure verification | Check `app/` directory tree matches migration map |
| Mobile tab bar renders 5 tabs with correct tokens | NAV-02 | Visual component | Open mobile viewport (390px), verify 5 tabs visible with correct icons/colors |
| Web sidebar renders at 260px with correct items | NAV-03 | Visual component | Open web viewport (1440px), verify sidebar width, items, active state |
| Tablet shows header navigation | NAV-04 | Visual component | Open tablet viewport (768px), verify header nav renders |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
