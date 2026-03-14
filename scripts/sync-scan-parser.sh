#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# sync-scan-parser.sh
#
# Keeps the edge function's parser logic in sync with the client source of
# truth at src/lib/scan/multi-recipe-parser.ts.
#
# The edge function (Deno) can't import from src/, so we copy the pure
# functions into the edge file between sync markers.
#
# Usage:  ./scripts/sync-scan-parser.sh [--check]
#   --check   Exit 1 if the synced section is out of date (CI-friendly)
# ---------------------------------------------------------------------------
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SOURCE="$REPO_ROOT/src/lib/scan/multi-recipe-parser.ts"
TARGET="$REPO_ROOT/supabase/functions/process-scan-job/index.ts"

BEGIN_MARKER="// --- BEGIN SYNCED FROM src/lib/scan/multi-recipe-parser.ts ---"
END_MARKER="// --- END SYNCED FROM src/lib/scan/multi-recipe-parser.ts ---"

if [[ ! -f "$SOURCE" ]]; then
  echo "ERROR: Source file not found: $SOURCE" >&2
  exit 1
fi

if [[ ! -f "$TARGET" ]]; then
  echo "ERROR: Target file not found: $TARGET" >&2
  exit 1
fi

# ---------------------------------------------------------------------------
# 1. Extract and transform source content
# ---------------------------------------------------------------------------

# Read the full source file, strip:
#   - the module-level JSDoc comment at the top (first /** ... */ block)
#   - all `export` keywords (edge function uses these as local functions)
transform_source() {
  sed 's/^export //g' "$SOURCE" \
    | sed '/^\/\*\*/,/^ \*\//d'
}

SYNCED_CONTENT="$(transform_source)"

# Compute content hash for drift detection
CONTENT_HASH="$(echo "$SYNCED_CONTENT" | shasum -a 256 | cut -d' ' -f1 | head -c 12)"

# ---------------------------------------------------------------------------
# 2. Build the replacement block as a temp file
# ---------------------------------------------------------------------------

BLOCK_FILE="$(mktemp)"
TMPFILE=""
trap 'rm -f "$BLOCK_FILE" "${TMPFILE:-}" 2>/dev/null' EXIT

{
  echo "$BEGIN_MARKER"
  echo "// DO NOT EDIT this section by hand."
  echo "// Source of truth: src/lib/scan/multi-recipe-parser.ts"
  echo "// Regenerate with: npm run sync:scan-parser"
  echo "// @synced-hash: $CONTENT_HASH"
  echo "// --- END SYNC HEADER ---"
  echo ""
  echo "$SYNCED_CONTENT"
  echo ""
  echo "$END_MARKER"
} > "$BLOCK_FILE"

# ---------------------------------------------------------------------------
# 3. Check mode — compare without writing
# ---------------------------------------------------------------------------

if [[ "${1:-}" == "--check" ]]; then
  # Extract current synced section from target
  CURRENT_FILE="$(mktemp)"
  sed -n "/^${BEGIN_MARKER//\//\\/}$/,/^${END_MARKER//\//\\/}$/p" "$TARGET" > "$CURRENT_FILE"

  if [[ ! -s "$CURRENT_FILE" ]]; then
    rm -f "$CURRENT_FILE"
    echo "ERROR: Sync markers not found in $TARGET" >&2
    exit 1
  fi

  if diff -q "$CURRENT_FILE" "$BLOCK_FILE" > /dev/null 2>&1; then
    rm -f "$CURRENT_FILE"
    echo "✓ Edge function parser is in sync (hash: $CONTENT_HASH)"
    exit 0
  else
    rm -f "$CURRENT_FILE"
    echo "✗ Edge function parser is OUT OF SYNC" >&2
    echo "  Run 'npm run sync:scan-parser' to update." >&2
    exit 1
  fi
fi

# ---------------------------------------------------------------------------
# 4. Write mode — replace the synced section in the target
# ---------------------------------------------------------------------------

TMPFILE="$(mktemp)"

# Use a simple Python script for reliable multi-line replacement
python3 - "$TARGET" "$BLOCK_FILE" "$BEGIN_MARKER" "$END_MARKER" << 'PYEOF'
import sys

target_path = sys.argv[1]
block_path = sys.argv[2]
begin_marker = sys.argv[3]
end_marker = sys.argv[4]

with open(target_path, 'r') as f:
    lines = f.readlines()

with open(block_path, 'r') as f:
    block = f.read()

output = []
inside = False
replaced = False

for line in lines:
    stripped = line.rstrip('\n')
    if stripped == begin_marker and not replaced:
        inside = True
        output.append(block)
        if not block.endswith('\n'):
            output.append('\n')
        replaced = True
        continue
    if stripped == end_marker and inside:
        inside = False
        continue
    if not inside:
        output.append(line)

if not replaced:
    print(f"ERROR: Begin marker not found in {target_path}", file=sys.stderr)
    sys.exit(1)

with open(target_path, 'w') as f:
    f.writelines(output)
PYEOF

echo "✓ Synced parser to edge function (hash: $CONTENT_HASH)"
echo "  Source: $SOURCE"
echo "  Target: $TARGET"
