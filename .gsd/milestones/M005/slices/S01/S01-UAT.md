# S01: Security & Data Integrity Fixes — UAT

**Milestone:** M005
**Written:** 2026-03-14

## UAT Type

- UAT mode: artifact-driven
- Why this mode is sufficient: All fixes are in query building, retry logic, data handling, and configuration — all provable through TypeScript compilation, automated tests, and grep audits without live runtime.

## Preconditions

- Node.js and npm installed
- Project dependencies installed (`npm install`)
- No running server required

## Smoke Test

Run `npx tsc --noEmit && npx jest --no-coverage` — exits 0 with 585 tests passing across 26 suites.

## Test Cases

### 1. LIKE pattern injection prevention

1. Run `npx jest src/features/recipes/__tests__/searchPublicRecipes.test.ts --no-coverage`
2. **Expected:** 11 tests pass, including tests that verify `%` query produces `%\%%` pattern and `_` produces `%\_%`
3. Run `grep -n 'ilike' src/features/recipes/search.ts | grep -v 'escapeLikePattern'`
4. **Expected:** No output — all ilike calls are wrapped with `escapeLikePattern()`

### 2. Scan retry logic boundary

1. Run `npx jest src/lib/scan/__tests__/retry-logic.test.ts --no-coverage`
2. **Expected:** 12 tests pass, covering off-by-one prevention, error preservation, max=0 edge case, and full retry sequence
3. Run `grep -n 'Retrying\.\.\.' supabase/functions/process-scan-job/index.ts`
4. **Expected:** No output — error messages are never overwritten with "Retrying..."

### 3. No in-place data mutation

1. Run `rg "recipe\.ingredients\s*=" src/features/recipes/api.ts`
2. **Expected:** No matches — backfillIngredients does not mutate the recipe object
3. Run `rg "Promise\.all" src/features/recipes/photos.ts`
4. **Expected:** No matches — photo reorder uses atomic RPC, not individual updates

### 4. CORS restriction

1. Run `rg "Allow-Origin.*\*" supabase/functions/`
2. **Expected:** Only result is a doc comment in `_shared/cors.ts` explaining the old policy
3. Run `rg "buildCorsHeaders\|corsHeaders" supabase/functions/ --include-zero`
4. **Expected:** All 11 edge functions import from `_shared/cors.ts`

### 5. Password validation strength

1. Run `npx jest src/features/auth/__tests__/password.test.ts --no-coverage`
2. **Expected:** 14 tests pass, covering uppercase requirement, number/symbol requirement, minimum length, structured error messages, and edge cases

## Edge Cases

### LIKE escape ordering

1. Query containing `\%` (backslash followed by percent)
2. **Expected:** `escapeLikePattern` escapes `\` first → `\\`, then `%` → `\%`, producing `\\%` — no double-escaping

### Retry at max_retries=0

1. `computeRetryDecision(0, 0, "error")` called
2. **Expected:** Returns `{ shouldRetry: false, newRetryCount: 1, errorMessage: "error" }` — no retries allowed

### Password with only lowercase

1. `validatePassword("abcdefgh1!")` — has length, number, symbol, but no uppercase
2. **Expected:** `{ valid: false, errors: ["Must contain an uppercase letter"] }`

## Failure Signals

- `npx tsc --noEmit` reports errors — type regression
- `npx jest` test count below 585 — tests removed or broken
- Any `ilike` call in search.ts without `escapeLikePattern()` — injection vulnerability remains
- Any `Access-Control-Allow-Origin: *` in edge function code (excluding comments) — CORS still open
- `recipe.ingredients =` in api.ts — mutation bug reintroduced

## Requirements Proved By This UAT

- None — this slice addresses technical debt from audit, not tracked requirements. All fixes harden existing validated features (search, scan, recipe API, auth) without advancing or validating new requirement IDs.

## Not Proven By This UAT

- Runtime CORS rejection behavior (requires deployed edge function with cross-origin request)
- Actual scan job retry behavior with real Supabase database (tested via extracted pure function, not live edge function)
- Photo reorder RPC transactional behavior (requires live Supabase with the migration applied)
- Password validation UI display on actual signup/reset-password screens (tested at function level, not rendered UI)

## Notes for Tester

- The CORS and photo reorder RPC changes include a Supabase migration that must be applied before runtime verification. This slice's verification is artifact-driven; runtime proof is deferred to S05 (end-to-end verification).
- The retry logic is tested via the extracted `computeRetryDecision()` pure function. The edge function itself contains an inlined copy — the two should be kept in sync (potential S02 deduplication target).
