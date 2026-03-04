import { supabase } from "@/lib/supabase";
import type { Recipe, CreateRecipeInput, UpdateRecipeInput } from "./types";
import { searchRecipes } from "./search";

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
  return (data as Recipe | null) ?? null;
}

export async function createRecipe(input: CreateRecipeInput): Promise<Recipe> {
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

