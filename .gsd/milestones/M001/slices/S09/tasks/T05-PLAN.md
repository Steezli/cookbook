# T05: 10-core-screens 04

**Slice:** S09 — **Milestone:** M001

## Description

Extract a shared RecipeForm component and rebuild create/edit recipe screens to cookbook.pen spec with photo-first layout, bulk add, and reorder.

Purpose: Create and edit screens share ~90% of their form UI. Extracting RecipeForm eliminates duplication and ensures both screens match the cookbook.pen spec consistently. The key UX changes are: photo upload at top, single-add + bulk-add toggle for ingredients, and up/down arrow reordering.

Output: RecipeForm shared component + rebuilt create.tsx and edit.tsx wrappers.

## Must-Haves

- [ ] "Create and edit forms use photo-first layout (photo upload area at top)"
- [ ] "Ingredient input has single-add mode (input + Add button) and bulk-add toggle (multiline TextInput)"
- [ ] "Steps input has single-add mode (input + Add button)"
- [ ] "Ingredients and steps have up/down arrow reorder buttons (not drag-and-drop)"
- [ ] "Forms use PageContainer variant='form' (600px max-width centered)"
- [ ] "Create form submits via createRecipe(), edit form prefills and submits via updateRecipe()"
- [ ] "All colors use design tokens, no hardcoded hex values"

## Files

- `src/components/recipes/RecipeForm.tsx`
- `app/(tabs)/recipes/create.tsx`
- `app/(tabs)/recipes/[id]/edit.tsx`
