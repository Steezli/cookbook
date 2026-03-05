---
status: complete
phase: 10-core-screens
source: [10-00-SUMMARY.md, 10-01-SUMMARY.md, 10-02-SUMMARY.md, 10-03-SUMMARY.md, 10-04-SUMMARY.md, 10-05-SUMMARY.md, 10-06-SUMMARY.md]
started: 2026-03-05T05:00:00Z
updated: 2026-03-05T05:15:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Home Screen Greeting & Layout
expected: Open the app (Home tab). You should see "Welcome back, [your name or email prefix]" at the top. Below that: a search bar placeholder ("Search recipes..."), a "Featured Recipes" section with up to 3 recipe cards in a horizontal scroll, and a "Recent Recipes" section with recipe cards in a vertical grid. All text uses the app's custom fonts, no system defaults.
result: pass

### 2. RecipeCard Appearance
expected: Each recipe card on the home screen shows: a 180px-tall image area (or a warm beige placeholder with a utensils icon if no photo), the recipe title (max 2 lines), a metadata line like "45 min . 6 servings", and a small colored visibility badge (Private/Family/Public).
result: pass

### 3. Home Search Bar Navigation
expected: Tap the search bar on the home screen. It should navigate you to the Recipes list screen (not open an inline search — it's a navigation entry point).
result: pass

### 4. Recipe List Screen
expected: Navigate to the Recipes tab. You should see "My Recipes" header with a "+ Create" button, a search input that filters as you type, and recipe cards in a grid. If you have recipes, they appear as RecipeCards. If no recipes, you see "No recipes yet" with a "Create your first recipe" link.
result: pass

### 5. Recipe List Filters
expected: On the recipe list screen, tap the filter toggle. A collapsible section should appear with tag chips, visibility filter (Private/Family/Public), and family filter. Active filters show as blue chips. A "Clear all" link appears when any filter is active.
result: pass

### 6. Recipe Detail Screen
expected: Tap any recipe card to open its detail. You should see: a sticky header bar at the top (back arrow, and "Start Cooking" button in blue), a hero image (or warm placeholder), then scrollable content: title with visibility badge, description, ingredients list, numbered steps with blue circle badges, and story section (if present).
result: issue
reported: "generally passes but does not respect the safe boundaries"
severity: major

### 7. Recipe Detail — Ratings & Comments
expected: Scroll down on a recipe detail screen. You should see a Ratings section showing the average star rating and count, plus an interactive star rating row where you can tap to rate. Below that, a Comments section where you can view and add comments.
result: pass

### 8. Recipe Detail — Start Cooking
expected: On a recipe detail screen, tap the "Start Cooking" button in the sticky header. It should navigate to the cooking mode screen for that recipe.
result: skipped
reason: Start Cooking button hidden behind iOS status bar — blocked by safe area issue (test 6)

### 9. Cooking Mode — Step Display
expected: In cooking mode, you should see: a top bar with an X button and the recipe title, a progress bar showing your position, the current step number in a blue circle badge, the step instruction text, and a "Full Ingredient List" card showing all ingredients. Previous/Next buttons at the bottom.
result: skipped
reason: Cannot reach cooking mode — blocked by test 8

### 10. Cooking Mode — Navigation
expected: In cooking mode, tap "Next" to advance through steps. The progress bar should fill incrementally. "Previous" is disabled on the first step. On the last step, the button changes to "Done" and tapping it exits back to the recipe detail.
result: skipped
reason: Cannot reach cooking mode — blocked by test 8

### 11. Create Recipe Form
expected: Navigate to create a new recipe (via "+ Create" on recipe list or home empty state). The form should show: photo upload area at the very top (dashed border with camera icon), then title, description, ingredients (with an "Add" button and a "Bulk add" toggle), steps (with "Add" button), time/servings fields, visibility chips (Private/Family/Public), story, and tags.
result: pass

### 12. Ingredient Bulk Add & Reorder
expected: On the create form, toggle "Bulk add" for ingredients. A multiline text area appears. Paste multiple ingredients (one per line) and tap "Add All" — they should all appear in the list. Each ingredient row should have up/down arrow buttons and an X delete button. Tap the arrows to reorder.
result: pass

### 13. Edit Recipe Form Prefill
expected: Open a recipe detail, tap "Edit" (you must be the owner). The edit form should open with all fields prefilled: title, description, existing ingredients, steps, time/servings, visibility, story, tags, and existing photos shown as thumbnails.
result: pass

### 14. Safe Area — Content Not Hidden
expected: On all screens (home, recipe list, recipe detail, create/edit, cooking mode, profile), content should NOT be hidden behind the iOS status bar / Dynamic Island. There should be proper spacing at the top so the first element is fully visible below the system UI.
result: issue
reported: "fail the recipe detail still hides behind the ios status bar and due to this I cannot know about the cooking mode at all"
severity: blocker

## Summary

total: 14
passed: 9
issues: 2
pending: 0
skipped: 3

## Gaps

- truth: "Recipe detail screen sticky header respects iOS safe area boundaries"
  status: failed
  reason: "User reported: generally passes but does not respect the safe boundaries"
  severity: major
  test: 6
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""

- truth: "All screens respect iOS safe area — content not hidden behind status bar / Dynamic Island"
  status: failed
  reason: "User reported: fail the recipe detail still hides behind the ios status bar and due to this I cannot know about the cooking mode at all"
  severity: blocker
  test: 14
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""
