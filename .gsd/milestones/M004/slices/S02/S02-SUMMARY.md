---
id: S02
provides:
  - isLiquidIngredient() classification function with 60+ known liquid ingredients
  - Dry ingredient density table with 40+ items (grams per US cup)
  - displayAmount() now accepts optional ingredientName for liquid/dry routing
  - Dry volume→weight conversion (cups flour → grams) for metric preference
  - Dry weight→volume conversion (grams flour → cups) for imperial preference
  - Improved formatAmount() with fractional display for small amounts
  - Both cook.tsx and recipe detail page wired with ingredient name context
key_decisions:
  - Known-liquids set over ML classification — simple, deterministic, no dependencies
  - Density lookup table for common dry ingredients — standard baking measurements
  - Fallback to ml for unknown dry ingredients — safe default when density unknown
  - Backward compatible displayAmount — ingredientName param is optional
  - Substring matching for ingredient classification — "whole milk" matches "milk"
patterns_established:
  - Ingredient name passed as context to displayAmount for smart conversion routing
  - DRY_GRAMS_PER_CUP table as the authority for dry ingredient densities
verification_result: passed — tsc clean, 540 tests pass (21 new)
completed_at: 2026-03-13
---

# S02: Smart Unit Conversions (Liquid vs Dry)

**Added liquid/dry ingredient classification to route volume-to-metric conversions correctly: cups of flour → grams, cups of milk → ml.**

## What Changed

### Liquid/Dry Classification

New `isLiquidIngredient(ingredientName)` function with a `KNOWN_LIQUIDS` set of 60+ items including water, milk, oils, broths, sauces, vinegars, extracts, syrups, and dairy liquids. Uses normalized substring matching for flexibility.

### Dry Ingredient Density Table

New `DRY_GRAMS_PER_CUP` lookup with 40+ entries covering:
- Flours (all-purpose: 125g, bread: 127g, cake: 114g, etc.)
- Sugars (granulated: 200g, brown: 220g, powdered: 120g)
- Fats (butter: 227g, shortening: 191g)
- Grains (rice: 185g, oats: 90g, cornstarch: 128g)
- Nuts & cocoa (almonds: 143g, chocolate chips: 170g, cocoa: 86g)
- Leaveners (salt: 288g, baking soda: 220g)

### Updated `displayAmount()`

New optional `ingredientName` parameter enables smart routing:
- **Dry ingredient + volume unit → metric**: converts to grams using density table
- **Liquid ingredient + volume unit → metric**: converts to ml (unchanged behavior)
- **Unknown dry ingredient**: falls back to ml (safe default)
- **Dry ingredient + weight unit → imperial**: converts grams back to cups using density
- **Backward compatible**: works without ingredientName param (extracts from text)

### Improved `formatAmount()`

- Small amounts (0 < n < 1) now show one decimal place (0.5 instead of rounding to 1)
- Very small amounts show "< 1" instead of "0"

### Wired into UI

Both `cook.tsx` and `recipes/[id].tsx` now pass ingredient name context through `displayIngredient()` → `displayAmount()`.

## Files Modified

- `src/features/units/conversions.ts` — rewritten with liquid/dry logic
- `src/features/units/__tests__/conversions.test.ts` — 55 tests (21 new) covering liquid/dry scenarios
- `app/(tabs)/recipes/[id]/cook.tsx` — passes ingredientName to displayAmount
- `app/(tabs)/recipes/[id].tsx` — passes ingredientName to displayAmount

## Verification

- `npx tsc --noEmit` — exits 0
- `npx jest --ci` — 540 tests, 23 suites, 0 failures
