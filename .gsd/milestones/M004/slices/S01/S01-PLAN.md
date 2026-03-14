# S01: Cooking Walkthrough Ingredient Highlighting

**Goal:** Cooking walkthrough shows only the ingredients relevant to the current step, and highlights ingredient names mentioned in the step text.
**Demo:** Open a recipe in cook mode → step text shows ingredient mentions highlighted → "You'll need" card shows only the ingredients for this step (matching Pencil design).

## Must-Haves

- Pure function `extractStepIngredients(stepText, ingredients)` that returns indices of ingredients mentioned in a step
- Normalized/fuzzy substring matching (handles "apples" vs "apple", "butter, melted" vs "melted butter")
- Step text with ingredient mentions visually highlighted (warm accent color)
- "You'll need" card shows only step-relevant ingredients (not full ingredient list)
- Full ingredient list still accessible (e.g. at overview or as expandable section)
- Unit tests for the matching function

## Proof Level

- This slice proves: integration (visual + logic)
- Real runtime required: yes (web browser verification)
- Human/UAT required: yes (visual check of highlighting)

## Verification

- `npx jest -- --testPathPattern="cooking" --ci` — ingredient matching tests pass
- `npx tsc --noEmit` — TypeScript compiles clean
- Visual verification: cook mode step text highlights ingredients; "You'll need" card is filtered
- `npx jest --ci` — all 499+ tests pass

## Observability / Diagnostics

- Runtime signals: none (pure UI feature)
- Inspection surfaces: matching function is pure and testable in isolation
- Failure visibility: if no ingredients match, the "You'll need" card simply doesn't appear for that step
- Redaction constraints: none

## Integration Closure

- Upstream surfaces consumed: `Recipe` type from `src/features/recipes/types.ts`, `displayIngredient()` in `cook.tsx`, tokens from `src/lib/tokens.ts`
- New wiring introduced in this slice: `extractStepIngredients` pure function, new highlight token, updated cook.tsx MainContent
- What remains before the milestone is truly usable end-to-end: S02 (unit conversions), S03 (scan timeout + iOS scanner)

## Tasks

- [x] **T01: Build extractStepIngredients matching function with tests** `est:30m`
  - Why: Core logic for determining which ingredients are referenced in a step — must be pure and well-tested
  - Files: `src/features/cooking/ingredientMatcher.ts`, `src/features/cooking/__tests__/ingredientMatcher.test.ts`
  - Do: Create pure function that normalizes ingredient names and step text, then uses substring matching. Handle plurals, common abbreviations, word boundary matching. Return array of matched ingredient indices.
  - Verify: `npx jest -- --testPathPattern="ingredientMatcher" --ci`
  - Done when: tests cover common cases (exact match, plural, partial name, no match, multiple matches)

- [x] **T02: Add highlight token and update cook.tsx to highlight step ingredients** `est:30m`
  - Why: Wire the matching function into the cooking walkthrough UI — highlight ingredient mentions in step text and filter the "You'll need" card
  - Files: `src/lib/tokens.ts`, `app/(tabs)/recipes/[id]/cook.tsx`
  - Do: Add highlight background token to tokens.ts. In cook.tsx, use `extractStepIngredients` to get matched ingredients for current step. Render step text with highlighted ingredient spans. Replace "Full Ingredient List" card with "You'll need" card showing only matched ingredients. Keep a way to see full list (expandable or separate view). Match Pencil design: warm dot bullets, "You'll need" label.
  - Verify: `npx tsc --noEmit` and visual check on web
  - Done when: step text highlights ingredient names; "You'll need" card shows only relevant ingredients; TypeScript clean

- [x] **T03: Verify end-to-end on web** `est:10m`
  - Why: Confirm the full integration works visually
  - Files: none (verification only)
  - Do: Start dev server, navigate to a recipe with multiple steps and ingredients, enter cook mode, verify highlighting and filtered ingredients across multiple steps
  - Verify: Browser verification with screenshots
  - Done when: visual confirmation that ingredient highlighting and per-step filtering work correctly

## Files Likely Touched

- `src/features/cooking/ingredientMatcher.ts` (new)
- `src/features/cooking/__tests__/ingredientMatcher.test.ts` (new)
- `src/lib/tokens.ts`
- `app/(tabs)/recipes/[id]/cook.tsx`
