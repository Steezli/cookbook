---
phase: 04-trust-collaboration-units-social
plan: 02
subsystem: units
tags: [tdd, conversion, parsing, core-logic]
dependency_graph:
  requires: []
  provides: [unit-conversion-engine, ingredient-parser]
  affects: [recipe-display, recipe-input]
tech_stack:
  added: [jest, ts-jest, @types/jest]
  patterns: [test-driven-development, pure-functions, lookup-tables]
key_files:
  created:
    - jest.config.js
    - src/features/units/types.ts
    - src/features/units/conversions.ts
    - src/features/units/parser.ts
    - src/features/units/__tests__/conversions.test.ts
    - src/features/units/__tests__/parser.test.ts
  modified:
    - package.json
    - package-lock.json
decisions:
  - Use Jest with ts-jest for TypeScript testing
  - Volume conversions use milliliters as intermediate unit
  - Weight conversions use grams as intermediate unit
  - Remove 'oz' from volume table to avoid ambiguity with weight ounces
  - Parse numbers before checking for slash fractions to handle "1/2" correctly
  - Use negative lookahead (?![/]) to prevent consuming number in slash fractions
metrics:
  duration: 319 seconds
  tasks_completed: 2
  files_created: 6
  files_modified: 2
  tests_added: 68
  tests_passing: 68
  completed: 2026-02-16
---

# Phase 4 Plan 02: Unit Conversion Engine and Ingredient Parser Summary

**One-liner:** Test-driven implementation of bidirectional metric/imperial unit conversion with comprehensive ingredient parsing supporting fractions, decimals, and ambiguous terms.

## What Was Built

### Core Functionality

**Unit Conversion Engine** (`src/features/units/conversions.ts`)
- Bidirectional volume conversion (US customary ↔ metric) via milliliter intermediate
- Bidirectional weight conversion (imperial ↔ metric) via gram intermediate
- Support for 15 volume units: tsp, tbsp, fl oz, cup, pint, quart, gallon, ml, l (plus variants)
- Support for 6 weight units: oz, lb, g, kg (plus variants)
- Smart target unit selection based on user preference and magnitude
- Display formatting with "converted target (original amount unit) ingredient" pattern
- Automatic precision handling (strips trailing zeros, rounds to 2 decimals)

**Ingredient Parser** (`src/features/units/parser.ts`)
- Parses "amount unit ingredient" format with high accuracy
- Unicode fraction support: ½ ¼ ¾ ⅓ ⅔ ⅕ ⅖ ⅗ ⅘ ⅙ ⅚ ⅛ ⅜ ⅝ ⅞
- Slash fraction support: 1/2, 3/4, mixed numbers (1 1/2)
- Decimal support: 1.5, 0.125, etc.
- Detects ambiguous terms: pinch, dash, handful, bunch, sprig, "to taste", dollop, smidgen, sprinkle
- Handles metric units without spaces: 250g, 500ml
- Preserves multi-word ingredients: "all-purpose flour", "tomatoes, diced"

**Type System** (`src/features/units/types.ts`)
- UnitSystem: 'metric' | 'imperial'
- ParsedIngredient: structured output from parser
- EnhancedIngredient: database-compatible format

**Test Infrastructure**
- Jest + ts-jest configuration for TypeScript testing
- 68 comprehensive tests covering edge cases
- Test scripts: `npm test`, `npm run test:watch`, `npm run test:coverage`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking Issue] Test infrastructure missing**
- **Found during:** Plan start
- **Issue:** No test framework configured; TDD plan requires running tests
- **Fix:** Installed Jest, @types/jest, ts-jest; created jest.config.js; added test scripts to package.json
- **Files modified:** package.json, package-lock.json, jest.config.js (new)
- **Commit:** 33b7d52

**2. [Rule 1 - Bug] Ounce unit ambiguity**
- **Found during:** GREEN phase test execution
- **Issue:** 'oz' defined in both VOLUME_TO_ML (as fluid ounces) and WEIGHT_TO_GRAMS (as weight ounces). getTargetUnit checked volume first, treating weight oz as volume.
- **Fix:** Removed 'oz', 'ounce', 'ounces' from VOLUME_TO_ML, keeping only in WEIGHT_TO_GRAMS. 'fl oz' remains for fluid ounces.
- **Files modified:** src/features/units/conversions.ts
- **Commit:** 717ee7d (included in GREEN commit)

**3. [Rule 1 - Bug] Parser consumed digits before detecting slash fractions**
- **Found during:** GREEN phase test execution
- **Issue:** Pattern like "1/2" was matched as whole number "1", leaving "/2" unparsed. Parser flow checked whole numbers before slash fractions.
- **Fix:** Reordered parsing logic to use negative lookahead `(?![/])` to prevent consuming digits if followed by slash. Check for standalone slash fractions separately.
- **Files modified:** src/features/units/parser.ts
- **Commit:** 717ee7d (included in GREEN commit)

## Test Results

All 68 tests pass:
- **Conversion tests (36):** Volume conversions (10), weight conversions (6), canConvert (3), getTargetUnit (4), formatAmount (4), displayAmount (5)
- **Parser tests (32):** Basic parsing (4), fraction parsing (8), unit variations (7), ambiguous terms (9), compound ingredients (2), edge cases (4)

TypeScript compilation: All unit files compile without errors.

## Verification

- [x] All conversion tests pass (volume metric↔imperial, weight metric↔imperial, edge cases)
- [x] All parser tests pass (fractions, Unicode, ambiguous, no-unit, no-amount)
- [x] displayAmount produces "converted target (original)" format per locked decision
- [x] TypeScript compiles without errors for unit files

## Success Criteria Met

- [x] Unit conversion and parsing modules exist with comprehensive test coverage
- [x] Any future changes to conversion logic are protected by tests
- [x] The modules export clean APIs that Plan 05 can import directly
- [x] Pure functions with well-defined inputs and outputs
- [x] Foundation ready for UNIT-01 (canonical storage) and UNIT-02 (display in preferred system)

## Key Decisions

1. **Jest over Vitest:** Chose Jest + ts-jest for mature TypeScript support and Expo compatibility
2. **Intermediate unit pattern:** Volume via ml, weight via grams simplifies conversion matrix
3. **Negative lookahead for slash fractions:** Prevents regex from consuming "1" in "1/2" before detecting fraction
4. **Unicode fraction support:** Recognizes 15 common fractions for natural recipe input
5. **Ambiguous term detection:** Returns isAmbiguous flag rather than failing, allowing UI to handle gracefully

## Integration Points

**Exports for downstream plans:**
- `convertVolume(amount, fromUnit, toUnit): number`
- `convertWeight(amount, fromUnit, toUnit): number`
- `canConvert(unit): boolean`
- `getTargetUnit(unit, preference): string`
- `formatAmount(num): string`
- `displayAmount(amount, unit, preference, originalText): string`
- `parseIngredient(text): ParsedIngredient`

**Ready for:**
- Plan 03: Unit preference storage (will use UnitSystem type)
- Plan 05: Recipe input with unit conversion (will use parseIngredient + conversions)

## Self-Check: PASSED

Created files exist:
- FOUND: jest.config.js
- FOUND: src/features/units/types.ts
- FOUND: src/features/units/conversions.ts
- FOUND: src/features/units/parser.ts
- FOUND: src/features/units/__tests__/conversions.test.ts
- FOUND: src/features/units/__tests__/parser.test.ts

Commits exist:
- FOUND: 33b7d52 (test infrastructure)
- FOUND: b8e9e50 (RED phase - failing tests)
- FOUND: 717ee7d (GREEN phase - implementation)

All files committed, all tests passing, TypeScript compiles.
