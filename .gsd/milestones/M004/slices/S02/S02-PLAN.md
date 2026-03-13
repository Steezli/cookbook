# S02: Smart Unit Conversions (Liquid vs Dry)

**Goal:** Unit conversions correctly map dry ingredients to weight (g/oz) and liquid ingredients to volume (ml/cups) when switching between imperial and metric.
**Demo:** "2 cups flour" converts to "~250g flour" in metric mode; "1 cup milk" converts to "~237 ml milk" in metric mode.

## Must-Haves

- `isLiquidIngredient(ingredientName)` classification function with known-liquids list
- Updated `displayAmount()` that accepts optional ingredient name for liquid/dry awareness
- Dry ingredients with volume units (cups) convert to weight (g) in metric, weight (oz) in imperial
- Liquid ingredients with volume units keep converting to volume (ml/cups)
- Common dry-to-weight conversion factors (flour, sugar, butter, etc.)
- Updated tests covering liquid/dry scenarios
- Backward compatible — no signature breaks for existing callers

## Proof Level

- This slice proves: contract (unit tests) + integration (cook.tsx passes ingredient context)
- Real runtime required: no (pure function logic)
- Human/UAT required: no (testable entirely with unit tests)

## Verification

- `npx jest --testPathPattern="conversions" --ci` — all conversion tests pass including new liquid/dry tests
- `npx tsc --noEmit` — TypeScript compiles clean
- `npx jest --ci` — all tests pass

## Tasks

- [x] **T01: Add liquid/dry classification and dry-weight conversion tables** `est:30m`
  - Why: Core logic for distinguishing when to convert volume→volume vs volume→weight
  - Files: `src/features/units/conversions.ts`, `src/features/units/__tests__/conversions.test.ts`
  - Do: Add `isLiquidIngredient()` with known-liquids list. Add `DRY_VOLUME_TO_GRAMS` table (cups of flour, sugar, etc.). Update `displayAmount()` with optional `ingredientName` param. When ingredient is dry and unit is volume, convert to weight instead of volume for metric target. Add `formatAmount` fractional display support.
  - Verify: `npx jest --testPathPattern="conversions"`
  - Done when: "2 cups flour" → metric shows grams, "1 cup milk" → metric shows ml

- [x] **T02: Wire ingredient name through cook.tsx displayIngredient** `est:15m`
  - Why: cook.tsx needs to pass the ingredient name to displayAmount for liquid/dry awareness
  - Files: `app/(tabs)/recipes/[id]/cook.tsx`
  - Do: Update `displayIngredient()` calls to pass ingredient name/text to the updated `displayAmount`. Ensure backward compatibility for callers that don't pass ingredient name.
  - Verify: `npx tsc --noEmit` and `npx jest --ci`
  - Done when: TypeScript compiles, all tests pass

## Files Likely Touched

- `src/features/units/conversions.ts`
- `src/features/units/__tests__/conversions.test.ts`
- `app/(tabs)/recipes/[id]/cook.tsx`
