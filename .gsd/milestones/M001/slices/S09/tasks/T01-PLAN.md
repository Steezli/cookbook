# T01: 10-core-screens 00

**Slice:** S09 — **Milestone:** M001

## Description

Create Wave 0 test stubs and their corresponding pure utility modules for RecipeCard and Cooking Mode.

Purpose: The Nyquist validation strategy requires automated test coverage for the two testable areas in Phase 10 -- RecipeCard metadata formatting and cooking mode progress/navigation. These pure functions are extracted into utility modules so they can be tested independently of React components. Plans 01 and 05 will import these utilities rather than inlining the logic.

Output: Two test files and two utility modules, all tests green.

## Must-Haves

- [ ] "Pure utility functions for RecipeCard metadata formatting are tested and passing"
- [ ] "Pure utility functions for cooking mode progress and step navigation are tested and passing"

## Files

- `src/components/recipes/__tests__/RecipeCard.test.ts`
- `src/features/cooking/__tests__/cookingMode.test.ts`
- `src/components/recipes/recipeCardUtils.ts`
- `src/features/cooking/cookingModeUtils.ts`
