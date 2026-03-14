# S03: Type Safety & Error Handling — UAT

**Milestone:** M005
**Written:** 2026-03-14

## UAT Type

- UAT mode: artifact-driven
- Why this mode is sufficient: This slice is purely type safety (compile-time checks), error handling code paths (code review + tests), and a health endpoint (curl verification). No user-facing UI changes require live-runtime or human-experience testing.

## Preconditions

- Node.js and npm installed
- Project dependencies installed (`npm install`)
- TypeScript compiler available (`npx tsc`)
- Jest test runner available (`npx jest`)
- `server.js` can bind to port 3000

## Smoke Test

Run `npx tsc --noEmit && npx jest` — both exit 0 with zero errors.

## Test Cases

### 1. Zero `any` types in feature/lib code

1. Run `grep -r ': any' src/features/ src/lib/ --include='*.ts' --include='*.tsx' | grep -v node_modules | grep -v __tests__ | grep -v '.d.ts'`
2. **Expected:** Zero output lines (exit code 1 — no matches)

### 2. TypeScript compilation clean

1. Run `npx tsc --noEmit`
2. **Expected:** Exits 0 with no output (no type errors)

### 3. All tests pass

1. Run `npx jest`
2. **Expected:** 602 tests passing, 28 suites, exit code 0

### 4. Health endpoint responds

1. Start the server: `node server.js &`
2. Run `curl -s localhost:3000/health`
3. **Expected:** HTTP 200 with JSON body `{ "status": "ok", "timestamp": "<ISO8601>" }`
4. Stop the server

### 5. Web scan upload error path marks job as failed

1. Open `src/features/scan/scan-photos.ts`
2. Find the web path `.catch()` handler for edge function invocation
3. **Expected:** The catch block updates `scan_jobs` with `status: 'failed'` and sets `error_message` — same pattern as the native path

### 6. ensureProfile logs errors

1. Open `src/features/auth/session.tsx`
2. Find the `ensureProfile` function's error handling
3. **Expected:** `console.warn('[SessionProvider] ensureProfile failed:', error.message)` is present

### 7. NonEmptyArray enforced on recipe inputs

1. Open `src/features/recipes/types.ts`
2. **Expected:** `NonEmptyArray<T>` type defined as `[T, ...T[]]`. Both `CreateRecipeInput` and `UpdateRecipeInput` use `NonEmptyArray` for `ingredients` and `steps` fields.

### 8. Supabase client is typed

1. Open `src/lib/supabase.ts`
2. **Expected:** `createClient<Database>(...)` with `Database` imported from `./database.types`

## Edge Cases

### RPC type workaround

1. Open `src/features/recipes/photos.ts`
2. Find uses of `supabase.rpc`
3. **Expected:** Unregistered RPCs use `(supabase.rpc as Function)` cast with a TODO comment explaining the workaround

### multi-recipe-parser unknown narrowing

1. Open `src/lib/scan/multi-recipe-parser.ts`
2. Search for `: any`
3. **Expected:** Zero hits — all untyped JSON parsing uses `unknown` with `Record<string, unknown>` narrowing

## Failure Signals

- `npx tsc --noEmit` exits non-zero — type regression introduced
- `npx jest` has failures — test breakage from type changes
- `grep ': any'` returns hits in src/features/ or src/lib/ — any types reintroduced
- `curl localhost:3000/health` returns non-200 or connection refused — health endpoint broken or server won't start
- Web scan upload `.catch()` doesn't update job status — silent error swallowing regression

## Requirements Proved By This UAT

- None — this slice proves internal code quality (type safety, error propagation, health monitoring) rather than user-facing requirements

## Not Proven By This UAT

- Runtime behavior of the web scan upload error path (would require a failing edge function invocation in a live environment)
- Runtime behavior of ensureProfile logging (would require a failing profiles upsert in a live environment)
- Health endpoint behavior under Railway's actual health check probe (would require deployment)
- Whether NonEmptyArray catches real bugs at call sites beyond the two files already updated

## Notes for Tester

- All verification is artifact-driven (compiler, test runner, grep, curl). No browser or device testing needed.
- The health endpoint test requires briefly starting `server.js` on port 3000 — ensure nothing else is bound to that port.
- Two RPCs have `Function` cast workarounds — this is intentional, not a bug. The RPCs exist in local migrations but haven't been applied to the remote DB yet.
