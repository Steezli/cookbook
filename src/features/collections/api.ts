import { supabase } from "@/lib/supabase";
import type { 
  Collection, 
  CreateCollectionInput, 
  UpdateCollectionInput,
  CollectionWithRecipeCount 
} from "./types";
import type { Recipe } from "@/features/recipes/types";

export async function getCollections(): Promise<CollectionWithRecipeCount[]> {
  const { data, error } = await supabase
    .from("collections")
    .select(`
      *,
      collection_recipes(count)
    `)
    .order("created_at", { ascending: false });
  
  if (error) throw error;
  
  return (data || []).map(c => ({
    ...c,
    recipe_count: c.collection_recipes?.[0]?.count || 0
  }));
}

export async function getCollectionById(id: string): Promise<Collection | null> {
  const { data, error } = await supabase
    .from("collections")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  
  if (error) throw error;
  return (data as Collection | null) ?? null;
}

export async function createCollection(
  input: CreateCollectionInput
): Promise<Collection> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("collections")
    .insert({
      owner_user_id: user.id,
      name: input.name,
      description: input.description || null,
      family_id: input.family_id || null
    })
    .select()
    .single();
  
  if (error) throw error;
  return data as Collection;
}

export async function updateCollection(
  id: string,
  input: UpdateCollectionInput
): Promise<Collection> {
  const { data, error } = await supabase
    .from("collections")
    .update(input)
    .eq("id", id)
    .select()
    .single();
  
  if (error) throw error;
  return data as Collection;
}

export async function deleteCollection(id: string): Promise<void> {
  const { error } = await supabase
    .from("collections")
    .delete()
    .eq("id", id);
  
  if (error) throw error;
}

export async function getCollectionRecipes(collectionId: string): Promise<Recipe[]> {
  const { data, error } = await supabase
    .from("collection_recipes")
    .select(`
      recipe_id,
      recipes(*)
    `)
    .eq("collection_id", collectionId)
    .order("added_at", { ascending: false });
  
  if (error) throw error;
  
  return (data || [])
    .map(cr => cr.recipes as unknown as Recipe)
    .filter(Boolean);
}

export async function addRecipeToCollection(
  collectionId: string,
  recipeId: string
): Promise<void> {
  const { error } = await supabase
    .from("collection_recipes")
    .insert({
      collection_id: collectionId,
      recipe_id: recipeId
    });
  
  if (error) {
    if (error.code === "23505") {
      // Unique constraint violation - recipe already in collection
      throw new Error("Recipe is already in this collection");
    }
    throw error;
  }
}

export async function removeRecipeFromCollection(
  collectionId: string,
  recipeId: string
): Promise<void> {
  const { error } = await supabase
    .from("collection_recipes")
    .delete()
    .eq("collection_id", collectionId)
    .eq("recipe_id", recipeId);
  
  if (error) throw error;
}

export async function getRecipeCollections(recipeId: string): Promise<Collection[]> {
  const { data, error } = await supabase
    .from("collection_recipes")
    .select(`
      collection_id,
      collections(*)
    `)
    .eq("recipe_id", recipeId);
  
  if (error) throw error;
  
  return (data || [])
    .map(cr => cr.collections as unknown as Collection)
    .filter(Boolean);
}