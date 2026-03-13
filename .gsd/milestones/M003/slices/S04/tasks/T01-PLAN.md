---
estimated_steps: 5
estimated_files: 24
---

# T01: Remove debug console.* calls from client-side code

**Slice:** S04 — Logging & Dead Code Sweep
**Milestone:** M003

## Description

Remove all debug `console.log`, redundant `console.error`, and debug-leftover `console.warn` calls from client-side code (`src/` and `app/`). Preserve ~15 intentional calls that serve as documented diagnostic surfaces (ErrorBoundary crash reporter, auth callback diagnostics, ads consent observability, ad banner load failures, layout consent sequence). Edge functions are excluded per DECISIONS.md.

## Steps

1. Inventory all `console.log` calls in `src/` and `app/` (excluding tests and edge functions). Remove all — these are pure debug traces per research.
2. Inventory all `console.error` calls. Remove those in service methods that log then throw (redundant — error propagates to caller). Remove those in components that log then set error state (redundant — error displayed in UI). **Keep** `ErrorBoundary.componentDidCatch` (intentional crash reporter) and `app/auth/callback.tsx` (only diagnostic — page redirects). For each component catch block, verify the error message shown to the user includes enough detail — if the UI shows a generic message like "Failed to load" and the console.error is the only place with the real error, consider keeping it or improving the error state to include the actual message.
3. Inventory all `console.warn` calls. Remove debug leftovers (loading errors, connection state warnings). **Keep** `src/features/ads/consent.ts` (6 calls — documented `[AdsConsent]` operational observability), `src/features/ads/AdBanner.tsx` (ad load failure diagnostics), and `app/_layout.tsx` consent sequence error.
4. Run `npx tsc --noEmit` to verify no compilation errors introduced.
5. Run `npx jest --ci` to verify all 502+ tests still pass.

## Must-Haves

- [ ] Zero `console.log` calls in `src/` and `app/` (excluding tests)
- [ ] All redundant `console.error` calls removed (service throw-after-log, component set-state-after-log)
- [ ] All debug-leftover `console.warn` calls removed
- [ ] ErrorBoundary `console.error` preserved (intentional crash reporter)
- [ ] Auth callback `console.error` preserved (only diagnostic on redirect)
- [ ] Ads consent `console.warn` calls preserved (documented operational observability)
- [ ] Ad banner `console.warn` preserved (non-fatal diagnostic)
- [ ] Layout consent `console.warn` preserved (non-fatal startup)
- [ ] Edge functions (`supabase/functions/`) untouched
- [ ] `npx tsc --noEmit` exits 0
- [ ] `npx jest --ci` passes

## Verification

- `rg 'console\.log' src/ app/ --glob '!**/__tests__/**' --glob '!**/test/**' -c` returns 0 matches
- `rg 'console\.(warn|error)' src/ app/ --glob '!**/__tests__/**' --glob '!**/test/**' -l` returns only: `ErrorBoundary.tsx`, `callback.tsx`, `consent.ts`, `AdBanner.tsx`, `_layout.tsx`
- `npx tsc --noEmit` exits 0
- `npx jest --ci` — 502+ tests pass

## Observability Impact

- Signals added/changed: None added. ~85 debug console calls removed, ~15 intentional calls preserved.
- How a future agent inspects this: `rg 'console\.' src/ app/` to audit remaining console usage
- Failure state exposed: None changed — intentional error surfaces (ErrorBoundary, auth callback) preserved

## Inputs

- S04 research inventory: 100 console.* calls across 24 files with per-call triage decisions
- DECISIONS.md: "Console.log policy — keep edge functions, clean client"
- ErrorBoundary.tsx JSDoc documenting intentional `console.error`
- consent.ts JSDoc documenting intentional `console.warn`

## Expected Output

- ~24 client-side files modified with debug console calls removed
- Zero `console.log` in client code
- Only ~15 intentional `console.warn`/`console.error` calls remaining in 5 known files
- TypeScript compilation and test suite clean
