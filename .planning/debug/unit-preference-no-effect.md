---
status: diagnosed
trigger: "unit preference toggle doesn't affect existing recipes"
created: 2026-03-10T00:00:00Z
updated: 2026-03-10T00:00:00Z
---

## Current Focus

hypothesis: This is a combination of two issues - (1) stale preference on navigation and (2) cook mode never reads unit preference
test: Code review of all recipe display surfaces
expecting: Gaps in wiring between preference storage and display
next_action: Report findings

## Symptoms

expected: Changing Imperial/Metric toggle on profile screen should convert ingredient units in recipe displays
actual: Toggle persists preference to DB but recipe displays don't reflect the change until app restart or fresh navigation
errors: None
reproduction: Toggle unit preference, navigate to a recipe, ingredients still show original units
started: Feature gap - conversion logic exists but wiring is incomplete

## Eliminated

(none)

## Evidence

- timestamp: 2026-03-10
  checked: src/features/units/conversions.ts
  found: Complete conversion logic exists (displayAmount, convertVolume, convertWeight, getTargetUnit, formatAmount). All working correctly.
  implication: The conversion engine is fully built

- timestamp: 2026-03-10
  checked: src/features/units/api.ts
  found: getUnitPreference/setUnitPreference read/write from profiles.unit_preference in Supabase
  implication: Storage layer works fine

- timestamp: 2026-03-10
  checked: app/(tabs)/profile.tsx (lines 138-156)
  found: handleUnitChange calls setUnitPreference(preference) to persist to DB. Uses local state only - no global state/context/event broadcast.
  implication: Other screens have no way to know the preference changed

- timestamp: 2026-03-10
  checked: app/(tabs)/recipes/[id].tsx (lines 151-163)
  found: Unit preference loaded via useEffect([session]) - only runs once when session is set. Does NOT re-fetch when screen regains focus (useFocusEffect is only used for recipe data, not unit preference).
  implication: ISSUE 1 - Recipe detail shows stale unit preference after toggle change

- timestamp: 2026-03-10
  checked: app/(tabs)/recipes/[id].tsx (lines 268-285, displayIngredient function)
  found: displayIngredient correctly calls displayAmount(amount, unit, unitPreference, originalText). Conversion IS wired up on recipe detail.
  implication: Recipe detail DOES convert, but only with stale preference

- timestamp: 2026-03-10
  checked: app/(tabs)/recipes/[id]/cook.tsx (line 226)
  found: Cook mode renders {ing.text} raw - never calls displayAmount, never fetches unit preference
  implication: ISSUE 2 - Cook mode completely ignores unit preference

- timestamp: 2026-03-10
  checked: RecipeForm.tsx (lines 256-268)
  found: Form correctly populates amount, unit, original_text, is_ambiguous via parseIngredient. Data IS stored in DB.
  implication: Data pipeline is correct for recipes created through the form

- timestamp: 2026-03-10
  checked: supabase/functions/process-scan-job/index.ts
  found: Scan pipeline stores ingredients with amount/unit but in a different format (name, amount as string, unit). Not clear if these map to the same RecipeIngredient schema with amount as number.
  implication: Scanned recipes may not have properly typed amount/unit fields

## Resolution

root_cause: |
  Two distinct issues:

  1. STALE PREFERENCE (bug): Recipe detail screen loads unit preference in useEffect([session]),
     which only fires once. When user changes preference on profile and navigates back to a recipe,
     the preference is stale. The recipe data itself re-fetches on focus (useFocusEffect), but the
     unit preference does not.

  2. COOK MODE MISSING (feature gap): Cook mode (app/(tabs)/recipes/[id]/cook.tsx) renders
     ingredients as raw {ing.text} and never imports or calls displayAmount. It has zero unit
     conversion awareness.

fix: |
  Issue 1 fix (stale preference):
  - Move unit preference fetch into the useFocusEffect callback alongside recipe loading,
    OR create a React context/global state for unit preference so all screens react to changes.
  - Simplest: add getUnitPreference() call inside the existing useFocusEffect in [id].tsx

  Issue 2 fix (cook mode):
  - Import displayAmount and getUnitPreference in cook.tsx
  - Add unit preference state + fetch (matching [id].tsx pattern)
  - Replace {ing.text} with displayIngredient-style logic using displayAmount

verification: N/A - research only
files_changed: []
