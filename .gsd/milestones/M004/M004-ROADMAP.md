# M004: QOL & Bug Fixes

**Vision:** Improve the cooking and scanning experience with ingredient highlighting in walkthrough steps, smarter liquid/dry-aware unit conversions, reliable multi-image scan processing, and a full-screen iOS scanner.

## Success Criteria

- Cooking walkthrough step text visually highlights ingredients mentioned in that step
- Unit conversions correctly map dry ingredients to weight (g/oz) and liquid ingredients to volume (ml/cups)
- Multi-image scan (3+ photos) completes without false timeout/failure errors
- iOS scan screen renders full-screen instead of modal/popup presentation
- All existing tests pass, TypeScript compiles clean
- Verified on web and iOS

## Key Risks / Unknowns

- **Ingredient matching accuracy** — step text may use different forms than the ingredient list (e.g. "apples" vs "apple slices", "butter, melted" vs "melted butter"). Fuzzy matching is needed.
- **Liquid vs dry classification** — no existing metadata distinguishes ingredient types. Need a heuristic approach with a known-liquids list. Edge cases exist (honey, cream cheese, yogurt).
- **Multi-image timeout root cause** — the 60s client timeout may be too short for Claude API calls with 3+ images. Need to identify whether it's client timeout, edge function timeout, or something else.

## Proof Strategy

- **Ingredient matching** → retire in S01 by proving substring/normalized matching produces correct highlights for common recipe steps, verified with unit tests and visual walkthrough
- **Liquid/dry conversion** → retire in S02 by proving unit tests cover flour→g, milk→ml, butter→g conversions correctly
- **Scan timeout** → retire in S03 by proving multi-image scan no longer shows false timeout with dynamic timeout scaling

## Verification Classes

- Contract verification: Jest tests for ingredient matching, unit conversions, timeout logic
- Integration verification: cooking walkthrough renders highlights; unit conversions display correctly; multi-image scan completes
- Operational verification: none
- UAT / human verification: visual check of ingredient highlights in cooking mode on web and iOS

## Milestone Definition of Done

This milestone is complete only when all are true:

- All four feature areas are implemented and tested
- Cooking walkthrough highlights ingredients per step, verified visually
- Unit conversions handle liquid/dry correctly, verified by tests
- Multi-image scan does not false-timeout, verified by exercising a real multi-image scan
- iOS scanner is full-screen, verified in simulator
- `npx tsc --noEmit` passes
- All tests pass
- Success criteria re-checked against live behavior

## Requirement Coverage

- Covers: QOL ingredient highlighting, unit conversion accuracy, scan timeout fix, iOS scanner UX
- Partially covers: none
- Leaves for later: subscriptions, recipe scaling, timers
- Orphan risks: none

## Slices

- [x] **S01: Cooking Walkthrough Ingredient Highlighting** `risk:medium` `depends:[]`
  > After this: cooking walkthrough step text visually highlights ingredients referenced in that step, with a "You'll need" card showing only the relevant ingredients for the current step

- [x] **S02: Smart Unit Conversions (Liquid vs Dry)** `risk:medium` `depends:[]`
  > After this: switching to metric converts flour/sugar to grams, milk/water to ml; switching to imperial converts grams to oz/cups and ml to cups correctly

- [x] **S03: Multi-Image Scan Timeout Fix & iOS Full-Screen Scanner** `risk:low` `depends:[]`
  > After this: multi-image scans use dynamic timeout based on image count, no false timeout errors; iOS scanner renders full-screen instead of modal

## Boundary Map

### S01 → S02

Produces:
- `extractStepIngredients(stepText, ingredients)` pure function that returns matched ingredient indices
- Highlight styling tokens in `tokens.ts`

Consumes:
- nothing (first slice, independent)

### S02 → S03

Produces:
- Updated `displayAmount()` with liquid/dry awareness
- `isLiquidIngredient()` classification function
- Updated conversion target maps

Consumes:
- nothing (independent of S01)

### S03

Produces:
- Dynamic timeout calculation based on image count
- Updated scan route presentation (full-screen on iOS)

Consumes:
- nothing (independent of S01 and S02)
