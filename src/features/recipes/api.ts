import { supabase } from "@/lib/supabase";

export type RecipeVisibility = "private" | "family" | "public";

export type Recipe = {
  id: string;
  title: string | null;
  visibility: RecipeVisibility;
  owner_user_id: string;
  family_id: string | null;
};

export async function getRecipeById(id: string): Promise<Recipe | null> {
  const { data, error } = await supabase
    .from("recipes")
    .select("id,title,visibility,owner_user_id,family_id")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return (data as Recipe | null) ?? null;
}

