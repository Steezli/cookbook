---
status: diagnosed
trigger: "UAT gap Phase 12 test 15: unit preference toggle saves but has zero effect on recipe ingredient display"
created: 2026-03-10T00:00:00Z
updated: 2026-03-10T00:00:00Z
---

## Current Focus

hypothesis: The 12-09 fixes were applied correctly but the displayAmount function has a logic gap that silently returns original text for most real-world ingredients
test: Code trace through displayIngredient -> displayAmount with realistic ingredient data
expecting: Identifying exact condition where conversion silently no-ops
next_action: Report findings

## Symptoms

expected: Changing unit preference (Imperial/Metric) in profile settings should convert ingredient units on recipe detail and cook screens
actual: Toggle saves correctly in DB, but ingredient display is unchanged on both screens
errors: None (silent no-op, not a crash)
reproduction: Set preference to metric, navigate to any recipe, ingredients still show original imperial units
started: After 12-09 plan was applied

## Eliminated

- hypothesis: getUnitPreference() not called on focus in [id].tsx
  evidence: Code review confirms useFocusEffect at lines 128-141 calls getUnitPreference().then(setUnitPreference). Fix from v1 diagnosis was applied.
  timestamp: 2026-03-10

- hypothesis: cook.tsx missing displayAmount/displayIngredient entirely
  evidence: cook.tsx imports displayAmount (line 14) and getUnitPreference (line 15), has unitPreference state (line 49), useEffect to load it (lines 67-69), displayIngredient helper (lines 114-120), and uses it in render (line 241). Fix from v1 diagnosis was applied.
  timestamp: 2026-03-10

- hypothesis: displayAmount conversion logic is broken
  evidence: conversions.ts has correct conversion tables, correctly identifies metric vs imperial units, converts via ML/grams intermediate, and formats output. Unit tests exist. The math is correct.
  timestamp: 2026-03-10

## Evidence

- timestamp: 2026-03-10
  checked: app/(tabs)/recipes/[id].tsx lines 128-141
  found: useFocusEffect correctly calls getUnitPreference().then(setUnitPreference) on every focus event. The v1 stale-preference bug is FIXED.
  implication: Preference state is fresh on every screen focus

- timestamp: 2026-03-10
  checked: app/(tabs)/recipes/[id].tsx lines 261-278 (displayIngredient)
  found: Guard condition is `ing.amount !== undefined && ing.unit !== undefined && !ing.is_ambiguous`. If ALL three pass, calls displayAmount(). Otherwise falls through to return raw `ing.text`.
  implication: If amount or unit is undefined (not null, but missing from JSONB), conversion is silently skipped

- timestamp: 2026-03-10
  checked: app/(tabs)/recipes/[id]/cook.tsx lines 114-120 (displayIngredient)
  found: Same guard logic as [id].tsx. Both screens have identical behavior.
  implication: Both screens will silently skip conversion under the same conditions

- timestamp: 2026-03-10
  checked: src/features/units/conversions.ts lines 145-174 (displayAmount)
  found: displayAmount returns originalText unchanged in THREE cases: (1) amount or unit is null, (2) unit not in conversion tables (canConvert returns false), (3) needsConversion is false (unit already matches preference system). Case 3 is correct behavior. Cases 1-2 are silent no-ops.
  implication: Even when displayIngredient calls displayAmount, if amount is null or unit is null, it returns original text unchanged

- timestamp: 2026-03-10
  checked: src/features/recipes/types.ts lines 3-11 (RecipeIngredient)
  found: amount, unit, original_text, is_ambiguous are ALL optional fields (`?:`). Recipes created before the parser was added will have NONE of these fields in their JSONB data.
  implication: Pre-parser recipes have ingredients = [{text: "2 cups flour", sort_order: 0}] with no amount/unit -- displayIngredient skips them entirely

- timestamp: 2026-03-10
  checked: src/components/recipes/RecipeForm.tsx lines 258-266
  found: Form correctly runs parseIngredient() and stores amount, unit, original_text, is_ambiguous in the ingredient JSONB. New recipes created through the form WILL have these fields.
  implication: Recipes created via the form after the parser was added should work

- timestamp: 2026-03-10
  checked: src/lib/scan/scan-draft-service.ts lines 442-450
  found: Scan draft finalization maps `ing.quantity ?? parseFloat(ing.amount)` to amount, and `ing.unit || null` to unit. The AI parsing service returns amount as a STRING and quantity as an optional number.
  implication: If the AI returns amount as "2" but no quantity field, parseFloat("2") = 2 (correct). If AI returns neither, amount is null. Unit depends on AI extraction accuracy.

- timestamp: 2026-03-10
  checked: src/features/units/conversions.ts lines 164-169 (needsConversion logic)
  found: The needsConversion check compares preference against whether the unit is metric or imperial. If preference is "imperial" and units are already imperial (cup, tsp, etc.), needsConversion=false and originalText is returned. This is CORRECT behavior (no conversion needed). But it means switching FROM imperial default TO metric should trigger conversion for imperial-unit recipes.
  implication: For recipes with properly populated amount/unit fields using imperial units, switching to metric SHOULD work

- timestamp: 2026-03-10
  checked: displayAmount output format (line 191)
  found: When conversion fires, output is `"${convertedAmount} ${targetUnit} (${amount} ${unit}) ${ingredientName}"`. The ingredientName extraction regex on line 187 is `originalText.match(/(?:\d+\.?\d*\s*(?:[a-z]+\s+)?)?(.+)$/i)` which is greedy and may capture the entire original text as ingredient name in some cases.
  implication: Minor formatting issue but not the root cause of "zero effect"

## Resolution

root_cause: |
  The 12-09 plan fixes (useFocusEffect for preference, displayIngredient in cook.tsx) were
  correctly applied. The wiring is now complete. The remaining "zero effect" has TWO causes:

  **PRIMARY: Data gap for pre-parser recipes.**
  The `ingredients` JSONB column stores whatever was written at creation time. Recipes created
  BEFORE the ingredient parser was integrated (Phase 4) have ingredients stored as:
  `[{text: "2 cups flour", sort_order: 0}]` -- with NO amount, unit, original_text, or
  is_ambiguous fields. The displayIngredient guard `ing.amount !== undefined && ing.unit !== undefined`
  fails for these, so displayAmount is never called. The conversion path is completely dead
  for legacy data.

  **SECONDARY: displayAmount null-returns for incomplete parsed data.**
  Even for recipes that DO have amount/unit fields, if either is null (e.g., AI parsing didn't
  extract a unit), displayAmount returns originalText unchanged. This is a correct fallback
  but means partial parses also show no conversion.

  In summary: the conversion engine works, the wiring is now correct, but most existing recipes
  in the database lack the structured amount/unit data needed to trigger conversion.

fix: |
  Option A (runtime parsing fallback):
  - In displayIngredient, if ing.amount is undefined, run parseIngredient(ing.text) on the fly
  - Use the parsed result to call displayAmount
  - This handles legacy data without a migration
  - Adds ~negligible overhead (regex parsing per ingredient per render)

  Option B (data migration):
  - Write a migration/script that reads all recipes, runs parseIngredient on each ingredient
    text, and backfills the amount/unit/original_text/is_ambiguous fields
  - One-time fix, no runtime overhead
  - Requires Supabase migration or edge function

  Option C (both):
  - Migration for existing data + runtime fallback for any edge cases
  - Most robust

  Recommended: Option A for immediate fix (minimal code change, no migration risk),
  followed by Option B as a cleanup task.

  Code change for Option A in displayIngredient:
  ```typescript
  function displayIngredient(ing: Recipe["ingredients"][0]): string {
    let amount = ing.amount;
    let unit = ing.unit;
    let originalText = ing.original_text || ing.text;
    let isAmbiguous = ing.is_ambiguous;

    // Fallback: parse on the fly for legacy ingredients missing structured data
    if (amount === undefined && unit === undefined) {
      const parsed = parseIngredient(ing.text);
      amount = parsed.amount;
      unit = parsed.unit;
      originalText = parsed.original;
      isAmbiguous = parsed.isAmbiguous;
    }

    if (amount !== undefined && amount !== null && unit !== undefined && unit !== null && !isAmbiguous) {
      return displayAmount(amount, unit, unitPreference, originalText);
    }
    if (isAmbiguous) {
      return `${ing.text} (approx.)`;
    }
    return ing.text;
  }
  ```

  This same change needs to be applied in BOTH:
  - app/(tabs)/recipes/[id].tsx (displayIngredient)
  - app/(tabs)/recipes/[id]/cook.tsx (displayIngredient)

verification: N/A - diagnosis only
files_changed: []
