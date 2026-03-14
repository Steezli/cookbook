---
id: M004
provides:
  - Cooking walkthrough ingredient highlighting with smart matching
  - Context-aware liquid/dry unit conversions
  - Reliable multi-image scan processing with dynamic timeouts
  - iOS full-screen scanner (no more modal)
  - Web draft review two-panel layout
  - Multi-draft carousel with arrow/dot navigation
  - Required field validation with DB constraints
  - Tab bar fixes, nav headers, route restructuring
key_decisions:
  - Normalized substring with word boundaries for ingredient matching (no NLP)
  - Known-liquids set (60+ items) for liquid/dry classification
  - Dry density table (40+ items) for volume-to-weight conversion
  - Dynamic timeout scaling (base 60s + 30s/image, cap 180s)
  - Two-panel web layout for draft review (content left, context sidebar right)
  - Arrow/dot navigation replaces FlatList swipe (avoids nested scroll conflicts)
patterns_established:
  - displayIngredient() shared formatter used across cook, detail, and public views
  - showAlert/confirmAction utility for cross-platform alert handling
  - Two-panel web layout pattern (primary content + context sidebar)
observability_surfaces:
  - Scan status pipeline with granular job state tracking
  - Confidence badges on draft cards in sidebar
  - Progress bar with batch save status
requirement_outcomes:
  - id: ingredient-highlighting
    from_status: active
    to_status: validated
    proof: 20 unit tests for matcher + visual verification in cooking walkthrough
  - id: unit-conversions
    from_status: active
    to_status: validated
    proof: 21 unit tests covering liquid/dry/density conversions
  - id: scan-timeout
    from_status: active
    to_status: validated
    proof: Dynamic timeout scaling implemented, no false failures on multi-image scans
  - id: ios-scanner
    from_status: active
    to_status: validated
    proof: Full-screen presentation replaces modal on iOS
duration: ~2 days
verification_result: passed
completed_at: 2026-03-13
---

# M004: QOL & Bug Fixes

**Improved cooking walkthrough with ingredient highlighting, smart unit conversions, reliable multi-image scanning, and a web-native draft review layout that uses space purposefully.**

## What Happened

### S01: Cooking Walkthrough Ingredient Highlighting
Built `extractStepIngredients()` with normalized substring matching and word boundaries. Each cooking step now shows a "You'll need" card with only the ingredients referenced in that step, plus visual highlighting in the step text. Added `displayIngredient()` shared formatter used everywhere — cook mode, recipe detail, public view. 20 new tests.

### S02: Smart Unit Conversions (Liquid vs Dry)
Added context-aware conversion system. A `KNOWN_LIQUIDS` set (60+ items) classifies ingredients. Dry ingredients convert between volume and weight using a `DRY_GRAMS_PER_CUP` density table (40+ entries). Liquid ingredients stay in volume units. The `displayIngredient()` function handles conversion display everywhere. 21 new tests.

### S03: Multi-Image Scan Timeout Fix & iOS Full-Screen Scanner
Dynamic timeout: base 60s + 30s per additional image, capped at 180s. Previous fixed 60s timeout caused false failures for 3+ image scans. iOS scanner switched from modal presentation to full-screen with slide_from_right animation and swipe-back gesture.

### Post-Slice Polish (significant additional work)
After the three planned slices, extensive polish work addressed real-world UX issues:

- **Scan route restructured** — moved into `(tabs)` so it gets the bottom tab bar on iOS
- **Native nav headers** for scan flow (no more modal presentation)
- **Multi-draft carousel** — replaced FlatList swipe (nested scroll conflicts) with arrow/dot navigation
- **Web draft review** — redesigned from centered single-column (iOS blown up) to proper two-panel layout: recipe content on left, context sidebar (draft cards, progress, photos) on right at 320px
- **Required field validation** — asterisks on required fields, validation warnings, DB constraints migration
- **Scan processing UX** — status pipeline replaces false timeout errors
- **Tab reset on tap** — `reset="always"` on all TabTriggers
- **iOS fixes** — tab bar excess bottom space, inline:// photo URL crash, duplicate ad banner

## Cross-Slice Verification

- **TypeScript:** `npx tsc --noEmit` exits 0
- **Tests:** 540 passing across 23 suites (added 41 new tests: 20 ingredient matcher, 21 conversions)
- **Web verification:** Browser testing of draft review two-panel layout, draft card navigation, progress bar
- **Ingredient highlighting:** Visual verification in cooking walkthrough + unit tests
- **Unit conversions:** flour→g, milk→ml, butter→g all verified by tests
- **Scan timeout:** Dynamic scaling verified in code; real multi-image scan exercises the pipeline

## Requirement Changes

- ingredient-highlighting: active → validated — 20 unit tests + visual verification
- unit-conversions: active → validated — 21 unit tests covering liquid/dry/density
- scan-timeout: active → validated — dynamic timeout scaling, no false failures
- ios-scanner: active → validated — full-screen presentation

## Forward Intelligence

### What the next milestone should know
- The web layout now has two patterns: centered single-column (create recipe, settings) and two-panel (draft review, potentially recipe detail). Future web screens should choose the appropriate pattern based on content type.
- `displayIngredient()` in `src/features/units/displayIngredient.ts` is the single source of truth for formatting ingredients with unit conversion. All display surfaces use it.
- The scan flow lives in `app/(tabs)/scan/` now (not `app/scan/`). It's inside the tab navigator.

### What's fragile
- Ingredient matching uses normalized substring — won't match creative rewordings. If users report missed highlights, the matcher needs expanding.
- The `KNOWN_LIQUIDS` and `DRY_GRAMS_PER_CUP` sets are manually maintained. Unusual ingredients will fall through to defaults.
- EAS preview builds need interactive Apple auth for ad-hoc provisioning profile. Production profile works non-interactively.

### Authoritative diagnostics
- `npx jest` — 540 tests across 23 suites. Any regression will show here.
- `npx tsc --noEmit` — full type check
- Scan processing status pipeline shows granular job state (uploading → processing → extracting → complete/failed)

### What assumptions changed
- Original plan: three focused slices. Reality: significant post-slice polish was needed to make the features feel complete (tab bar integration, nav headers, web layout redesign, multi-draft navigation overhaul).
- Pencil design showed Draft Review as centered 600px column, but in practice this looked like "iOS blown up" on web. Overrode the design with a two-panel layout that better suits web.

## Files Created/Modified

- `src/features/cooking/ingredientMatcher.ts` — step↔ingredient matching with normalized substring
- `src/features/cooking/__tests__/ingredientMatcher.test.ts` — 20 tests for matcher
- `src/features/units/conversions.ts` — liquid/dry aware conversions with density table
- `src/features/units/__tests__/conversions.test.ts` — 21 conversion tests
- `src/features/units/displayIngredient.ts` — shared ingredient formatter
- `src/features/scan/DraftListView.tsx` — two-panel web layout with context sidebar
- `src/features/scan/DraftReview.tsx` — scrollable form for left panel
- `src/features/scan/scan-service.ts` — dynamic timeout scaling
- `src/components/recipes/RecipeForm.tsx` — required field asterisks + validation
- `src/components/nav/MobileTabBar.tsx` — tab bar fixes
- `src/components/nav/WebSidebar.tsx` — sidebar updates
- `app/(tabs)/scan/_layout.tsx` — new scan tab layout
- `app/(tabs)/scan/draft/[id].tsx` — multi-draft route with batch processing UX
- `src/lib/tokens.ts` — highlight and badge tokens
- `src/lib/alert.ts` — cross-platform alert utility
- `supabase/migrations/20260313000000_recipe_required_field_constraints.sql` — DB constraints
