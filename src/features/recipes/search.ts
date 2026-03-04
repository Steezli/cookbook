import { supabase } from "@/lib/supabase";
import type { Recipe, RecipeVisibility } from "./types";

export type SearchFilters = {
  query?: string;
  tags?: string[];
  visibility?: RecipeVisibility;
  familyId?: string | null;
};

/**
 * Search recipes with optional filters
 * 
 * RLS automatically applies, so results only include accessible recipes
 */
export async function searchRecipes(filters: SearchFilters = {}): Promise<Recipe[]> {
  let query = supabase
    .from("recipes")
    .select("*")
    .order("created_at", { ascending: false });

  // Title search (case-insensitive substring match)
  if (filters.query && filters.query.trim()) {
    query = query.ilike("title", `%${filters.query.trim()}%`);
  }

  // Tag filter (array contains)
  if (filters.tags && filters.tags.length > 0) {
    query = query.overlaps("tags", filters.tags);
  }

  // Visibility filter
  if (filters.visibility) {
    query = query.eq("visibility", filters.visibility);
  }

  // Family filter
  if (filters.familyId !== undefined) {
    if (filters.familyId === null) {
      // Show private recipes only (no family)
      query = query.is("family_id", null);
    } else {
      // Show recipes from specific family
      query = query.eq("family_id", filters.familyId);
    }
  }

  const { data, error } = await query;

  if (error) throw error;
  return (data as Recipe[]) || [];
}

/**
 * Get all unique tags from accessible recipes
 * 
 * Used for tag autocomplete
 */
export async function getAvailableTags(): Promise<string[]> {
  const { data, error } = await supabase
    .from("recipes")
    .select("tags");

  if (error) throw error;

  // Flatten and deduplicate tags
  const allTags = (data || [])
    .flatMap(r => r.tags || [])
    .filter(Boolean);

  const uniqueTags = Array.from(new Set(allTags));
  return uniqueTags.sort();
}

/**
 * Get all accessible families for filter dropdown
 */
export async function getAccessibleFamilies(): Promise<{ id: string; name: string }[]> {
  const { data, error } = await supabase
    .from("families")
    .select("id, name")
    .order("name");

  if (error) throw error;
  return data || [];
}