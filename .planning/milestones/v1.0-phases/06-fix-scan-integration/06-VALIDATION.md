---
phase: 6
slug: fix-scan-integration
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-02
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest 30.2.0 + ts-jest 29.4.6 |
| **Config file** | `jest.config.js` |
| **Quick run command** | `npx jest --testPathPattern="scan" -x` |
| **Full suite command** | `npx jest` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx jest --testPathPattern="scan" -x`
- **After every plan wave:** Run `npx jest`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 6-01-01 | 01 | 0 | SCAN-01 | unit | `npx jest --testPathPattern="scan-service" -x` | ❌ W0 | ⬜ pending |
| 6-01-02 | 01 | 0 | SCAN-03 | unit | `npx jest --testPathPattern="scan-draft-service" -x` | ❌ W0 | ⬜ pending |
| 6-01-03 | 01 | 1 | SCAN-01 | unit | `npx jest --testPathPattern="scan-service" -x` | ❌ W0 | ⬜ pending |
| 6-01-04 | 01 | 1 | SCAN-04 | unit | `npx jest --testPathPattern="scan-service\|retry" -x` | ❌ W0 | ⬜ pending |
| 6-01-05 | 01 | 1 | SCAN-03 | unit | `npx jest --testPathPattern="scan-draft-service" -x` | ❌ W0 | ⬜ pending |
| 6-01-06 | 01 | 2 | SCAN-03 | manual | N/A (useLocalSearchParams) | N/A | ⬜ pending |
| 6-01-07 | 01 | 2 | SCAN-03 | manual | N/A (expo-router navigation) | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/features/scan/__tests__/scan-service.test.ts` — stubs for SCAN-01, SCAN-04 (getCurrentUserId, getUserScanJobs, retryScanJob)
- [ ] `src/lib/scan/__tests__/scan-draft-service.test.ts` — stubs for SCAN-03, SCAN-04 (convertToRecipe column names, mapScoreToStatus)
- [ ] Test mocks for Supabase client (auth.getUser, from().select/insert/update, rpc)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| draft/[id].tsx loads correct draft via useLocalSearchParams | SCAN-03 | Expo Router rendering requires runtime environment | Navigate to a draft from scan hub, verify correct draft loads |
| DraftEditor navigation on native (no window.location crash) | SCAN-03 | Native navigation requires device/simulator | Convert draft, verify navigation to recipe detail; discard draft, verify navigation to scan hub |
| Real-time scan status updates fire | SCAN-01 | Realtime subscriptions require live Supabase connection | Start scan, watch for status card updates on scan hub |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
