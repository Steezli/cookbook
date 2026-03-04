import { supabase } from "@/lib/supabase";
import type { RecipeRating, RatingAggregate } from "./types";

export async function getUserRating(recipeId: string): Promise<RecipeRating | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("recipe_ratings")
    .select("*")
    .eq("recipe_id", recipeId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) throw error;
  return data as RecipeRating | null;
}

export async function upsertRating(recipeId: string, rating: number): Promise<RecipeRating> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("recipe_ratings")
    .upsert(
      {
        recipe_id: recipeId,
        user_id: user.id,
        rating
      },
      { onConflict: "recipe_id,user_id" }
    )
    .select()
    .single();

  if (error) throw error;
  return data as RecipeRating;
}

export async function deleteRating(recipeId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("recipe_ratings")
    .delete()
    .eq("recipe_id", recipeId)
    .eq("user_id", user.id);

  if (error) throw error;
}

export async function getRecipeRatingAggregate(recipeId: string): Promise<RatingAggregate> {
  const { data, error } = await supabase
    .from("recipes")
    .select("rating_average, rating_count")
    .eq("id", recipeId)
    .single();

  if (error) throw error;

  return {
    average: data.rating_average,
    count: data.rating_count ?? 0
  };
}
