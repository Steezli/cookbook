import { supabase } from "@/lib/supabase";
import type { Recipe, CreateRecipeInput, UpdateRecipeInput, RecipeIngredient } from "./types";
import { searchRecipes } from "./search";
import { parseIngredient } from "@/features/units/parser";

// Remove or mark as deprecated
export async function getRecipes(): Promise<Recipe[]> {
  return searchRecipes();
}

export async function getRecipeById(id: string): Promise<Recipe | null> {
  const { data, error } = await supabase
    .from("recipes")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  
  if (error) throw error;
  const recipe = (data as Recipe | null) ?? null;

  // Auto-backfill: if any ingredients lack structured amount/unit, parse and save.
  // Runs in background — doesn't block the caller. RLS ensures only the owner can
  // update, so this is a safe no-op for recipes the current user doesn't own.
  if (recipe) {
    void backfillIngredients(recipe);
  }

  return recipe;
}

/**
 * Parse and persist structured amount/unit fields for legacy ingredients
 * that only have a `text` field. Idempotent — skips ingredients that
 * already have `amount` set.  Silently no-ops if the current user isn't
 * the recipe owner (RLS will block the update).
 */
async function backfillIngredients(recipe: Recipe): Promise<void> {
  const needsWork = recipe.ingredients.some(
    (ing) => ing.amount === undefined || ing.amount === null
  );
  if (!needsWork) return;

  let changed = false;
  const updated: RecipeIngredient[] = recipe.ingredients.map((ing) => {
    // Already has structured data — leave it alone
    if (ing.amount !== undefined && ing.amount !== null) return ing;

    const parsed = parseIngredient(ing.text);

    if (parsed.isAmbiguous) {
      changed = true;
      return { ...ing, amount: null, unit: null, original_text: ing.text, is_ambiguous: true };
    }

    if (parsed.amount !== null && parsed.unit !== null) {
      changed = true;
      return {
        ...ing,
        amount: parsed.amount,
        unit: parsed.unit,
        original_text: ing.text,
        is_ambiguous: false,
      };
    }

    // Unparseable — mark so we don't re-attempt
    changed = true;
    return { ...ing, amount: null, unit: null, original_text: ing.text, is_ambiguous: false };
  });

  if (!changed) return;

  // Fire-and-forget — RLS silently blocks non-owners, which is fine.
  await supabase
    .from("recipes")
    .update({ ingredients: updated })
    .eq("id", recipe.id)
    .then(({ error }) => {
      if (error) {
        // Expected for recipes the user doesn't own — swallow silently
      } else {
        // Mutate in-place so the current render picks up the structured data
        recipe.ingredients = updated;
      }
    });
}

export async function createRecipe(input: CreateRecipeInput): Promise<Recipe> {
  if (!input.title?.trim()) throw new Error("Title is required");
  if (!input.ingredients || input.ingredients.length < 2) throw new Error("At least 2 ingredients are required");
  if (!input.steps || input.steps.length < 1) throw new Error("At least 1 step is required");

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("recipes")
    .insert({
      owner_user_id: user.id,
      title: input.title,
      description: input.description || null,
      ingredients: input.ingredients,
      steps: input.steps,
      visibility: input.visibility,
      family_id: input.family_id || null,
      servings: input.servings || null,
      prep_time_minutes: input.prep_time_minutes || null,
      cook_time_minutes: input.cook_time_minutes || null,
      source_story: input.source_story || null,
      tags: input.tags || []
    })
    .select()
    .single();
  
  if (error) throw error;
  return data as Recipe;
}

export async function updateRecipe(
  id: string,
  input: UpdateRecipeInput
): Promise<Recipe> {
  if (input.title !== undefined && !input.title.trim()) throw new Error("Title is required");
  if (input.ingredients !== undefined && input.ingredients.length < 2) throw new Error("At least 2 ingredients are required");
  if (input.steps !== undefined && input.steps.length < 1) throw new Error("At least 1 step is required");

  const { data, error } = await supabase
    .from("recipes")
    .update(input)
    .eq("id", id)
    .select()
    .single();
  
  if (error) throw error;
  return data as Recipe;
}

export async function deleteRecipe(id: string): Promise<void> {
  const { error } = await supabase
    .from("recipes")
    .delete()
    .eq("id", id);
  
  if (error) throw error;
}

