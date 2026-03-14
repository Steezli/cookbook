import { supabase } from "@/lib/supabase";
import { Platform } from "react-native";

export type RecipePhoto = {
  id: string;
  recipe_id: string;
  storage_path: string;
  sort_order: number;
  created_at: string;
};

/**
 * Get public URL for a photo
 */
export function getPhotoUrl(storagePath: string): string {
  const { data } = supabase.storage
    .from("recipe-photos")
    .getPublicUrl(storagePath);
  
  return data.publicUrl;
}

/**
 * Get thumbnail URL (Supabase auto-resize via URL params)
 */
export function getThumbnailUrl(storagePath: string, width: number = 300): string {
  const url = getPhotoUrl(storagePath);
  return `${url}?width=${width}&quality=80`;
}

/**
 * Get all photos for a recipe
 */
export async function getRecipePhotos(recipeId: string): Promise<RecipePhoto[]> {
  const { data, error } = await supabase
    .from("recipe_photos")
    .select("*")
    .eq("recipe_id", recipeId)
    .order("sort_order", { ascending: true });
  
  if (error) throw error;
  return (data as RecipePhoto[]) || [];
}

/**
 * Fetch the first photo per recipe via a single RPC call.
 *
 * Uses Postgres DISTINCT ON to return exactly one row per recipe_id
 * (ordered by sort_order, then created_at), so the database does the
 * deduplication instead of transferring all photos to the client.
 */
export async function getFirstRecipePhotos(
  recipeIds: string[]
): Promise<Record<string, RecipePhoto>> {
  if (recipeIds.length === 0) return {};

  const { data, error } = await supabase.rpc("get_first_recipe_photos", {
    recipe_ids: recipeIds,
  });

  if (error) throw error;

  const firstByRecipeId: Record<string, RecipePhoto> = {};
  for (const row of (data as RecipePhoto[]) || []) {
    firstByRecipeId[row.recipe_id] = row;
  }

  return firstByRecipeId;
}

export async function getRecipeThumbnailUrlMap(
  recipeIds: string[],
  width: number = 120
): Promise<Record<string, string>> {
  const firstPhotos = await getFirstRecipePhotos(recipeIds);
  const out: Record<string, string> = {};
  for (const [recipeId, photo] of Object.entries(firstPhotos)) {
    out[recipeId] = getThumbnailUrl(photo.storage_path, width);
  }
  return out;
}

/**
 * Upload a photo for a recipe
 * 
 * @param recipeId - Recipe to attach photo to
 * @param file - File object with uri, name, type
 * @param sortOrder - Display order (default: 0)
 */
export async function uploadRecipePhoto(
  recipeId: string,
  file: { uri: string; name: string; type: string },
  sortOrder: number = 0
): Promise<RecipePhoto> {
  // Generate unique filename
  const fileExt = file.name.split(".").pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
  const storagePath = `${recipeId}/${fileName}`;

  // Convert file to blob for web, use uri for native
  let fileData: Blob | string;
  if (Platform.OS === "web") {
    const response = await fetch(file.uri);
    fileData = await response.blob();
  } else {
    fileData = file.uri;
  }

  // Upload to storage
  const { error: uploadError } = await supabase.storage
    .from("recipe-photos")
    .upload(storagePath, fileData, {
      contentType: file.type,
      upsert: false
    });

  if (uploadError) throw uploadError;

  // Create database record
  const { data, error: dbError } = await supabase
    .from("recipe_photos")
    .insert({
      recipe_id: recipeId,
      storage_path: storagePath,
      sort_order: sortOrder
    })
    .select()
    .single();

  if (dbError) {
    // Cleanup: delete uploaded file if DB insert fails
    await supabase.storage.from("recipe-photos").remove([storagePath]);
    throw dbError;
  }

  return data as RecipePhoto;
}

/**
 * Delete a recipe photo
 */
export async function deleteRecipePhoto(photoId: string): Promise<void> {
  // Get photo to find storage path
  const { data: photo, error: fetchError } = await supabase
    .from("recipe_photos")
    .select("storage_path")
    .eq("id", photoId)
    .single();

  if (fetchError) throw fetchError;
  if (!photo) throw new Error("Photo not found");

  // Delete from storage
  const { error: storageError } = await supabase.storage
    .from("recipe-photos")
    .remove([photo.storage_path]);

  if (storageError) throw storageError;

  // Delete database record
  const { error: dbError } = await supabase
    .from("recipe_photos")
    .delete()
    .eq("id", photoId);

  if (dbError) throw dbError;
}

/**
 * Reorder photos atomically via a single RPC call.
 *
 * All sort_order updates happen inside one database transaction,
 * so either all succeed or none do — no partial reorder states.
 */
export async function reorderRecipePhotos(
  updates: { id: string; sort_order: number }[]
): Promise<void> {
  if (updates.length === 0) return;

  const { error } = await supabase.rpc("reorder_recipe_photos", {
    updates: updates.map(({ id, sort_order }) => ({ id, sort_order })),
  });

  if (error) throw error;
}