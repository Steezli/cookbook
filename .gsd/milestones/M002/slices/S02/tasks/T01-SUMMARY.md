---
id: T01
parent: S02
milestone: M002
provides:
  - Pure helper functions for multi-draft list behavior (progress, save-all eligibility, display status)
  - Test suite establishing the contract that DraftListView and RecentScans will consume
key_files:
  - src/lib/scan/multi-draft-helpers.ts
  - src/lib/scan/__tests__/multi-draft-helpers.test.ts
key_decisions:
  - Draft is "saved" when status === 'ready' (matches convertToRecipe behavior from S01)
  - Save-all confidence threshold is 0.65 (matches existing medium confidence boundary)
  - canSaveAll requires at least one unsaved draft — returns false when all are already saved
patterns_established:
  - Factory helper (makeDraft) for test data construction with sensible defaults and confidenceScore shortcut
  - Pure function helpers module pattern for scan domain logic
observability_surfaces:
  - none
duration: 10m
verification_result: passed
completed_at: 2026-03-11
blocker_discovered: false
---

# T01: Extract multi-draft helper logic and write tests

**Created pure helper module with getDraftProgress, canSaveAll, and getDraftDisplayStatus — 16 tests passing, zero TS errors.**

## What Happened

Built `src/lib/scan/multi-draft-helpers.ts` with three exported pure functions that derive UI state from a `ScanDraft[]` array:

1. `getDraftProgress(drafts)` — counts saved (status === 'ready') vs total, returns `{ saved, total, allSaved }`
2. `canSaveAll(drafts)` — returns true when ≥2 drafts, all have confidence ≥ 0.65, and at least one is unsaved
3. `getDraftDisplayStatus(draft)` — maps internal status to display label: ready→saved, needs_review→needs_review, enhanced→pending

Test suite covers 16 cases across all three functions including edge cases (empty arrays, boundary confidence values, all-saved state).

## Verification

- `npx jest src/lib/scan/__tests__/multi-draft-helpers.test.ts` — **16/16 tests passed**
- `npx tsc --noEmit` — **zero errors**
- Slice-level checks (partial, expected for T01):
  - ✅ `npx jest src/lib/scan/__tests__/multi-draft-helpers.test.ts` — passes
  - ⬜ `npx jest` — not run (full suite deferred to later tasks)
  - ✅ `npx tsc --noEmit` — passes
  - ⬜ Browser verification — not applicable to this task (pure logic, no UI)

## Diagnostics

None — pure functions with no runtime side effects. Test failures will surface through jest output.

## Deviations

None. Implemented exactly as planned.

## Known Issues

None.

## Files Created/Modified

- `src/lib/scan/multi-draft-helpers.ts` — 3 exported pure functions for multi-draft list behavior
- `src/lib/scan/__tests__/multi-draft-helpers.test.ts` — 16 tests covering all helper functions and edge cases
