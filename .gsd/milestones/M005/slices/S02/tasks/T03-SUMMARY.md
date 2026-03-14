---
id: T03
parent: S02
milestone: M005
provides:
  - Single source of truth for scan parser logic (src/lib/scan/multi-recipe-parser.ts)
  - Automated sync script that copies parser functions to edge function with hash-based drift detection
  - npm scripts for sync (sync:scan-parser) and CI check (sync:scan-parser:check)
key_files:
  - scripts/sync-scan-parser.sh
  - supabase/functions/process-scan-job/index.ts
  - src/lib/scan/multi-recipe-parser.ts
key_decisions:
  - Used marker-based sync with content hash rather than runtime shared module (edge function can't import from src/)
  - Renamed edge function's buildClaudePrompt to buildScanPrompt to match source name
  - Transform strips export keywords and JSDoc module comments to produce valid local declarations for Deno
patterns_established:
  - Sync marker pattern (BEGIN/END SYNCED FROM) with hash-based drift detection for code that must be duplicated across runtimes
observability_surfaces:
  - sync:scan-parser:check script exits non-zero when edge function is out of sync (CI-friendly)
duration: 15m
verification_result: passed
completed_at: 2026-03-14
blocker_discovered: false
---

# T03: Deduplicate parser logic between client and edge function

**Created sync script that keeps edge function parser in sync with client source of truth, eliminating ~150 lines of manual duplication.**

## What Happened

The scan parser logic (types, parsing, deduplication, prompt building) was duplicated between `src/lib/scan/multi-recipe-parser.ts` (client) and `supabase/functions/process-scan-job/index.ts` (Deno edge function). The edge function can't import from `src/` since it runs on Deno, so the duplication was necessary but error-prone.

Created `scripts/sync-scan-parser.sh` which:
1. Reads the source file and transforms it (strips `export` keywords and module-level JSDoc comments)
2. Replaces the section between `// --- BEGIN SYNCED ---` / `// --- END SYNCED ---` markers in the edge function
3. Stamps a SHA-256 content hash for drift detection
4. Supports `--check` mode that exits non-zero if out of sync (for CI)

Updated the edge function to:
- Use sync markers delineating the copied section
- Rename `buildClaudePrompt` → `buildScanPrompt` to match the source function name
- Include the `Ingredient` interface from source (previously inlined into `ScanResult`)

Added `sync:scan-parser` and `sync:scan-parser:check` npm scripts.

## Verification

- `npx tsc --noEmit` — exits 0 ✓
- `npx jest` — all 602 tests pass ✓
- `grep -r 'getRecipes()' src/` — no calls remain ✓
- `npm run sync:scan-parser:check` — edge function parser matches client parser exactly ✓
- Diff of transformed source vs synced section in edge function: IDENTICAL ✓

All four slice verification checks pass (this is the final task in S02).

## Diagnostics

- `npm run sync:scan-parser:check` — verifies edge function is in sync, exits 1 with message if not
- Sync markers in edge function clearly delineate auto-generated code
- Content hash in `@synced-hash` comment enables quick visual drift detection

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `scripts/sync-scan-parser.sh` — New sync script that copies parser logic from client to edge function
- `supabase/functions/process-scan-job/index.ts` — Replaced manually-duplicated parser section with sync-marker-delineated auto-synced version; renamed buildClaudePrompt → buildScanPrompt
- `package.json` — Added sync:scan-parser and sync:scan-parser:check scripts
