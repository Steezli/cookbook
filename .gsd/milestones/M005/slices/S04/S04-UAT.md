# S04: Code Quality & Readability — UAT

**Milestone:** M005
**Written:** 2026-03-14

## UAT Type

- UAT mode: artifact-driven
- Why this mode is sufficient: S04 is a pure refactoring/cleanup slice with no new runtime behavior. All changes are verified by TypeScript compilation, test suite, and code structure audits (grep counts, import analysis). No live runtime needed.

## Preconditions

- Repository checked out on `gsd/M005/S04` branch
- Node modules installed (`npm install`)

## Smoke Test

`npx tsc --noEmit && npx jest` — TypeScript compiles cleanly and all 602 tests pass across 28 suites. No behavioral changes introduced.

## Test Cases

### 1. OAuth redirect consolidation

1. `grep -c 'openAuthSessionAsync' src/features/auth/social-auth.ts` → returns `1`
2. `grep -c 'handleOAuthRedirect' src/features/auth/social-auth.ts` → returns `4` (1 definition + 3 calls)
3. `npx tsc --noEmit` exits 0
4. **Expected:** OAuth redirect logic appears exactly once, called by 3 provider functions

### 2. Comment quality

1. Review `src/features/scan/scan-service.ts` — no comments restating function names
2. Review `src/features/recipes/api.ts` — remaining comments explain non-obvious behavior only
3. Review `src/lib/scan/scan-draft-service.ts` — no JSDoc that merely restates the function signature
4. **Expected:** All remaining comments explain WHY, not WHAT

### 3. Auth pattern consistency

1. `grep -n 'getUser\|getSession' src/features/ratings/api.ts` — `getUserRating` uses `getSession`, mutations use `getUser`
2. `grep -n 'getUser\|getSession' src/features/scan/scan-service.ts` — `createMultiPhotoScanJob` uses `getUser`, reads use `getSession`
3. `grep -n 'getUser\|getSession' src/features/units/api.ts` — `getUnitPreference` uses `getSession`, `setUnitPreference` uses `getUser`
4. **Expected:** All reads use `getSession()`, all mutations use `getUser()`

### 4. Error handling consistency

1. `grep -n 'new Error' src/features/units/api.ts` — should return 0 matches (errors thrown directly)
2. **Expected:** No custom Error wrapping in API modules

### 5. Full test suite

1. `npx jest` — 602 tests pass, 28 suites
2. **Expected:** Zero regressions from refactoring

## Edge Cases

### Unused import removal

1. `grep -n 'import.*supabase.*from.*supabase' src/features/scan/scan-upload.ts` — verify unused `supabase` import is gone
2. **Expected:** No unused imports remain in modified files

## Failure Signals

- `npx tsc --noEmit` reports errors — indicates a refactoring broke type safety
- Test count drops below 602 — indicates a test was accidentally removed or broken
- `openAuthSessionAsync` appears more than once in social-auth.ts — indicates OAuth dedup was incomplete
- `getUser()` in a read-only function — indicates auth pattern wasn't fully standardized

## Requirements Proved By This UAT

- none — S04 is a pure code quality slice with no requirement implications

## Not Proven By This UAT

- Runtime behavior of OAuth sign-in (will be verified in S05 end-to-end walkthrough)
- Runtime behavior of auth-gated API calls with the getUser/getSession change (will be verified in S05)
- Actual ad display, scan processing, or any live feature — all deferred to S05

## Notes for Tester

This is a refactoring-only slice. No new features, no behavioral changes. The entire verification is structural — TypeScript compilation, test suite, and grep-based audits confirm the refactoring was applied correctly without regressions.
