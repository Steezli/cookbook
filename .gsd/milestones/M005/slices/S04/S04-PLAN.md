# S04: Code Quality & Readability

**Goal:** Consolidate repetitive patterns, trim excess comments, improve readability across the codebase
**Demo:** OAuth functions share extraction logic, API modules follow consistent patterns, no unnecessary comments cluttering code

## Must-Haves

- Social auth OAuth redirect handling extracted to shared helper (3 providers share identical logic)
- Consistent error handling pattern across all API modules
- Excess/obvious comments removed (keep only non-obvious explanations)
- Repetitive Supabase query patterns consolidated where beneficial
- Consistent import ordering

## Proof Level

- This slice proves: contract
- Real runtime required: no
- Human/UAT required: no

## Verification

- `npx tsc --noEmit` exits 0
- `npx jest` — all tests pass (548+)
- Code review: OAuth functions use shared helper, comments are meaningful not obvious

## Observability / Diagnostics

- Runtime signals: none new
- Inspection surfaces: none new
- Failure visibility: none new
- Redaction constraints: none

## Integration Closure

- Upstream surfaces consumed: S01, S02, S03
- New wiring introduced: shared OAuth helper
- What remains: S05 verification

## Tasks

- [x] **T01: Consolidate OAuth redirect handling** `est:25m`
  - Why: signInWithGoogle, signInWithApple (non-iOS), signInWithFacebook have identical redirect/token extraction logic
  - Files: `src/features/auth/social-auth.ts`
  - Do: Extract shared `handleOAuthRedirect(provider, options?)` that handles the WebBrowser.openAuthSessionAsync → URL parse → setSession flow. Each provider function calls it. Apple iOS path stays separate (native, not OAuth).
  - Verify: `npx tsc --noEmit`, `npx jest`
  - Done when: zero duplicated redirect handling code

- [x] **T02: Clean up comments and improve readability** `est:30m`
  - Why: Many comments state the obvious ("Get all photos for a recipe" above getRecipePhotos) adding noise without value
  - Files: All `src/features/*/api.ts`, `src/features/*/types.ts`, `src/lib/**/*.ts`
  - Do: Remove comments that restate the function name or are JSDoc with no additional insight. Keep comments that explain WHY (business logic, edge cases, non-obvious behavior). Ensure consistent formatting. Fix any inconsistent patterns (some files use semicolons in different places, etc.)
  - Verify: Code review for comment quality
  - Done when: remaining comments all explain non-obvious behavior

- [x] **T03: Standardize API module patterns** `est:20m`
  - Why: Inconsistent auth checking (some use getUser(), some use getSession()), inconsistent error handling
  - Files: `src/features/recipes/api.ts`, `src/features/collections/api.ts`, `src/features/ratings/api.ts`, `src/features/comments/api.ts`, `src/features/scan/scan-service.ts`
  - Do: Standardize on `getUser()` for mutations (needs fresh user), `getSession()` for reads (cached is fine). Ensure all modules follow same pattern for auth check, query, error throw. Remove any remaining `as Type` casts that can be replaced with proper generics.
  - Verify: `npx tsc --noEmit`, `npx jest`
  - Done when: all API modules follow consistent auth and error patterns

## Files Likely Touched

- `src/features/auth/social-auth.ts`
- `src/features/recipes/api.ts`
- `src/features/recipes/search.ts`
- `src/features/recipes/photos.ts`
- `src/features/recipes/public.ts`
- `src/features/collections/api.ts`
- `src/features/comments/api.ts`
- `src/features/ratings/api.ts`
- `src/features/scan/scan-service.ts`
- `src/features/scan/scan-photos.ts`
- `src/features/scan/scan-upload.ts`
- `src/features/units/conversions.ts`
- `src/features/units/parser.ts`
- `src/lib/scan/scan-draft-service.ts`
