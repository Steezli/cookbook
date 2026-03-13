---
id: S01
provides:
  - extractStepIngredients() pure function for matching ingredients to cooking steps
  - highlightStepIngredients() function returning TextSegment[] for rich text rendering
  - Per-step "You'll need" card with warm design tokens matching Pencil cookbook.pen
  - Full ingredient list as expandable section with step-relevant items highlighted
  - Step badge and progress bar now use accentWarm (matching Pencil design)
  - 2 new highlight tokens in tokens.ts (highlightIngredientBg, highlightIngredientText)
key_decisions:
  - Normalized substring matching with word boundaries over full NLP — sufficient for cooking ingredients, zero dependencies
  - Depluralize + pluralize bidirectional matching — handles "egg" vs "eggs" both directions
  - extractIngredientName strips amounts, units, and descriptors to get core food name
  - Tokens >= 3 chars to avoid matching "a", "of", etc.
  - "You'll need" card only shows when step has matched ingredients (no empty card)
  - Full ingredient list accessible via expandable toggle (not removed entirely)
  - Step badge and progress bar changed from accentBlue to accentWarm per Pencil design
patterns_established:
  - Pure ingredient matching functions in src/features/cooking/ingredientMatcher.ts
  - TextSegment[] pattern for highlighted text rendering in React Native
verification_result: partial — code verified (tsc clean, 519 tests pass), visual verification blocked by auth credentials
completed_at: 2026-03-13
---

# S01: Cooking Walkthrough Ingredient Highlighting

**Built ingredient matching logic and wired it into the cooking walkthrough to highlight step-relevant ingredients and show a filtered "You'll need" card per step.**

## What Changed

### New: Ingredient Matcher (`src/features/cooking/ingredientMatcher.ts`)

Two pure functions:

1. **`extractStepIngredients(stepText, ingredients)`** — returns indices of ingredients mentioned in a cooking step. Uses:
   - Normalized text comparison (lowercase, stripped punctuation)
   - Core ingredient name extraction (strips amounts, units, descriptors like "large", "ground")
   - Multi-token matching (both full name and individual words >= 3 chars)
   - Bidirectional plural handling (`depluralize` + `pluralize`)
   - Word-boundary-aware matching (prevents "flour" matching "cauliflower")

2. **`highlightStepIngredients(stepText, ingredients)`** — returns `TextSegment[]` array where each segment has `{ text, highlighted }` for rich text rendering. Handles overlapping matches by merging ranges.

### Updated: Cook Screen (`app/(tabs)/recipes/[id]/cook.tsx`)

- **Step text** now renders with highlighted ingredient mentions (warm background + warm text color)
- **"You'll need" card** replaces "Full Ingredient List" — shows only ingredients relevant to the current step, with warm-colored dot bullets matching the Pencil design
- **Expandable full ingredient list** — "View all ingredients" toggle shows all ingredients with step-relevant ones visually distinguished (bold + warm dot color)
- **Step badge** changed from `accentBlue` to `accentWarm` (56×56 circle, matching Pencil's cookMain design)
- **Progress bar** changed to `accentWarm` to match Pencil design consistency

### New tokens in `src/lib/tokens.ts`

- `highlightIngredientBg` (#FDEEE8) — warm-tinted background for inline ingredient highlights
- `highlightIngredientText` (#C4562E) — warm text color for highlighted ingredients

### Tests (20 new, 519 total)

- 14 tests for `extractStepIngredients` covering: single match, multi-match, prep notes, case insensitivity, word boundary safety, plural/singular bidirectional, original_text field, edge cases
- 6 tests for `highlightStepIngredients` covering: no match, single highlight, multi highlight, casing preservation, empty inputs

## Files Created/Modified

- `src/features/cooking/ingredientMatcher.ts` — new
- `src/features/cooking/__tests__/ingredientMatcher.test.ts` — new
- `src/lib/tokens.ts` — 2 new tokens added
- `app/(tabs)/recipes/[id]/cook.tsx` — rewritten MainContent with highlighting + per-step ingredients

## Verification

- `npx tsc --noEmit` — exits 0
- `npx jest --ci` — 519 tests, 23 suites, 0 failures
- Visual verification of cook mode blocked by auth credentials (not a code issue)
