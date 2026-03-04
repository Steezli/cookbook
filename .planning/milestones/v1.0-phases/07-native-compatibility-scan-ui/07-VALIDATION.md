---
phase: 7
slug: native-compatibility-scan-ui
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-03
---

# Phase 7 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest 30.2.0 + ts-jest 29.4.6 |
| **Config file** | `jest.config.js` |
| **Quick run command** | `npx jest --testPathPattern scan -x` |
| **Full suite command** | `npx jest` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx jest --testPathPattern scan -x`
- **After every plan wave:** Run `npx jest`
- **Before `/gsd:verify-work`:** Full suite must be green + static analysis checks
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 07-01-01 | 01 | 1 | SCAN-03 | static | `grep -c "className" src/features/scans/DraftReview.tsx` returns 0 | N/A | ⬜ pending |
| 07-01-02 | 01 | 1 | SCAN-03 | static | `grep -c "className" src/features/scans/DraftEditor.tsx` returns 0 | N/A | ⬜ pending |
| 07-01-03 | 01 | 1 | SCAN-04 | static | `grep -c "className" src/features/scans/DraftManager.tsx` returns 0 | N/A | ⬜ pending |
| 07-01-04 | 01 | 1 | SCAN-04 | static | `grep -r "window.history" src/features/scans/` returns 0 | N/A | ⬜ pending |
| 07-01-05 | 01 | 1 | SCAN-04 | static | `grep -c "ScanDraft" src/features/scan/scan-service.ts` returns 0 | N/A | ⬜ pending |
| 07-02-01 | 02 | 1 | SCAN-03 | unit | `npx jest --testPathPattern scan-draft-service -x` | ✅ | ⬜ pending |
| 07-02-02 | 02 | 1 | SCAN-04 | unit | `npx jest --testPathPattern scan-draft-service -x` | ✅ | ⬜ pending |
| 07-03-01 | 01 | 1 | SCAN-03 | compile | `npx tsc --noEmit` | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements.*

- Existing Jest + ts-jest setup handles service-layer unit tests
- Static analysis (grep) handles web-only pattern detection
- TypeScript compiler handles type-checking after dead code removal

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| DraftReview renders on iOS/Android without crash | SCAN-03 | RN UI rendering requires device/simulator | Run `npx expo start`, open on iOS simulator, navigate to draft review screen |
| DraftEditor renders on iOS/Android, fields editable | SCAN-03 | RN UI interaction requires device/simulator | Run `npx expo start`, open on iOS simulator, edit draft fields |
| DraftManager renders on iOS/Android without crash | SCAN-04 | RN UI rendering requires device/simulator | Run `npx expo start`, open on iOS simulator, view draft manager |
| "Back to Scans" navigation works | SCAN-04 | Navigation requires simulator context | Tap "Back to Scans" button, verify return to scan list |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
