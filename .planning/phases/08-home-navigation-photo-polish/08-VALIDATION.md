---
phase: 8
slug: home-navigation-photo-polish
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-03
---

# Phase 8 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest 30 + ts-jest |
| **Config file** | `jest.config.js` |
| **Quick run command** | `npx jest --testPathPattern="tokens\|useBreakpoint" --no-coverage` |
| **Full suite command** | `npx jest` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx jest --testPathPattern="tokens|useBreakpoint" --no-coverage`
- **After every plan wave:** Run `npx jest`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 08-01-01 | 01 | 1 | DESIGN-01 | unit | `npx jest --testPathPattern="tokens" --no-coverage` | Wave 0 | ⬜ pending |
| 08-01-02 | 01 | 1 | DESIGN-02 | unit | `npx jest --testPathPattern="useBreakpoint" --no-coverage` | Wave 0 | ⬜ pending |
| 08-02-01 | 02 | 1 | DESIGN-03 | manual-only | N/A — requires native/browser render | N/A | ⬜ pending |
| 08-03-01 | 03 | 2 | DESIGN-04 | manual-only | N/A — design deliverable | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/__tests__/tokens.test.ts` — stubs for DESIGN-01 (token exports exist and have correct types)
- [ ] `src/lib/hooks/__tests__/useBreakpoint.test.ts` — stubs for DESIGN-02 (breakpoint logic correctness)

*Existing infrastructure covers framework install — Jest + ts-jest already configured.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Fonts render without fallback on first paint | DESIGN-03 | Requires native/browser render to verify visual output | Run app on device/simulator, confirm Bricolage Grotesque and DM Sans render (not system fallback) |
| .pen designs exist for 5 screens × 3 breakpoints | DESIGN-04 | Design deliverable, no code to test | Review cookbook.pen for Sign Up, Forgot Password, Profile/Settings, Invite, Draft Review across mobile/tablet/web |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
