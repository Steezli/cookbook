# S03: Type Safety & Error Handling

**Goal:** Eliminate `any` types in feature code, fix silent error swallowing, add health check endpoint
**Demo:** Zero `any` grep hits in src/features and src/lib, web scan upload shows error on edge function failure, /health endpoint responds 200

## Must-Haves

- Supabase database types generated and integrated
- ScanDraftService uses typed records instead of `any`
- Web scan upload path reports edge function failures to user
- ensureProfile logs errors (not fully silent)
- server.js has /health endpoint
- UpdateRecipeInput uses stricter typing

## Proof Level

- This slice proves: contract
- Real runtime required: no (types + tests)
- Human/UAT required: no

## Verification

- `npx tsc --noEmit` exits 0
- `npx jest` — all tests pass
- `grep -r ': any' src/features/ src/lib/ --include='*.ts' --include='*.tsx' | grep -v node_modules | grep -v __tests__ | grep -v '.d.ts'` returns zero hits (excluding test files and declarations)
- `curl localhost:3000/health` returns 200

## Observability / Diagnostics

- Runtime signals: ensureProfile logs `[SessionProvider]` on failure
- Inspection surfaces: /health endpoint
- Failure visibility: scan upload error propagated to caller
- Redaction constraints: none

## Integration Closure

- Upstream surfaces consumed: S01 security fixes
- New wiring introduced: typed Supabase client, health endpoint
- What remains: S04 code quality, S05 verification

## Tasks

- [x] **T01: Generate Supabase types and replace `any` in scan draft service** `est:30m` ✅
  - Why: ScanDraftService uses `any` for all DB records — schema changes aren't caught by TypeScript
  - Files: new: `src/lib/database.types.ts`, `src/lib/supabase.ts`, `src/lib/scan/scan-draft-service.ts`
  - Do: Generate types with `supabase gen types typescript`. If CLI not available, manually create types from migration schema. Replace all `any` in ScanDraftService with proper types. Type the supabase client with generated types.
  - Verify: `npx tsc --noEmit`, grep for `any` in scan-draft-service shows zero hits
  - Done when: all DB record types are explicit

- [x] **T02: Fix error handling in scan upload and session provider** `est:20m` ✅
  - Why: Web scan upload swallows edge function errors; ensureProfile failures are completely silent
  - Files: `src/features/scan/scan-photos.ts`, `src/features/auth/session.tsx`
  - Do: Web upload path: on edge function failure, update job status to failed (mirror native path behavior). ensureProfile: add console.warn on error instead of completely swallowing. Mark job as failed with meaningful error message.
  - Verify: Code review confirms error paths propagate
  - Done when: no silent error swallowing in scan upload or profile ensure

- [x] **T03: Add health endpoint and tighten UpdateRecipeInput type** `est:15m` ✅
  - Why: No health check for Railway deployment; UpdateRecipeInput allows invalid partial state
  - Files: `server.js`, `src/features/recipes/types.ts`
  - Do: Add `GET /health` that returns `{ status: 'ok', timestamp }`. Tighten UpdateRecipeInput to disallow empty title/ingredients/steps when those keys are present.
  - Verify: `node server.js` starts, `curl localhost:3000/health` returns 200
  - Done when: health endpoint works, type is stricter

## Files Likely Touched

- `src/lib/database.types.ts` (new)
- `src/lib/supabase.ts`
- `src/lib/scan/scan-draft-service.ts`
- `src/features/scan/scan-photos.ts`
- `src/features/auth/session.tsx`
- `server.js`
- `src/features/recipes/types.ts`
