import { supabase } from "@/lib/supabase";
import type { Recipe, RecipeVisibility } from "./types";

/**
 * Escape special LIKE/ILIKE pattern characters in user input.
 *
 * PostgreSQL's LIKE treats `%` as "any string" and `_` as "any single char".
 * Backslash is the default escape character. Without escaping, a user query
 * containing these characters can match unintended rows (e.g. `%` matches
 * every recipe title).
 */
export function escapeLikePattern(input: string): string {
  return input
    .replace(/\\/g, "\\\\") // escape backslash first
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_");
}

export type SearchFilters = {
  query?: string;
  tags?: string[];
  visibility?: RecipeVisibility;
  familyId?: string | null;
};

/** RLS automatically scopes results to accessible recipes. */
export async function searchRecipes(filters: SearchFilters = {}): Promise<Recipe[]> {
  let query = supabase
    .from("recipes")
    .select("*")
    .order("created_at", { ascending: false });

  if (filters.query && filters.query.trim()) {
    query = query.ilike("title", `%${escapeLikePattern(filters.query.trim())}%`);
  }

  if (filters.tags && filters.tags.length > 0) {
    query = query.overlaps("tags", filters.tags);
  }

  if (filters.visibility) {
    query = query.eq("visibility", filters.visibility);
  }

  if (filters.familyId !== undefined) {
    if (filters.familyId === null) {
      query = query.is("family_id", null);
    } else {
      query = query.eq("family_id", filters.familyId);
    }
  }

  const { data, error } = await query;

  if (error) throw error;
  return (data as Recipe[]) || [];
}

/**
 * Get all unique tags from accessible recipes.
 *
 * Filters out recipes with empty/null tag arrays at the DB level
 * (`.neq('tags', '{}')`) so we transfer fewer rows.
 */
export async function getAvailableTags(): Promise<string[]> {
  const { data, error } = await supabase
    .from("recipes")
    .select("tags")
    .neq("tags", "{}" as unknown as string[]);

  if (error) throw error;

  const allTags = (data || [])
    .flatMap(r => r.tags || [])
    .filter(Boolean);

  const uniqueTags = Array.from(new Set(allTags));
  return uniqueTags.sort();
}

export async function getAccessibleFamilies(): Promise<{ id: string; name: string }[]> {
  const { data, error } = await supabase
    .from("families")
    .select("id, name")
    .order("name");

  if (error) throw error;
  return data || [];
}

// --- Public browsing (cursor-based pagination) ---

export type PublicBrowseCursor = { page: number };

export type PublicBrowseFilters = {
  query?: string;
  tag?: string; // single tag chip — ignored when 'All'
  cursor?: PublicBrowseCursor;
  pageSize?: number; // default 20
};

export type PublicBrowsePage = {
  recipes: Recipe[];
  hasMore: boolean;
  nextCursor: PublicBrowseCursor | null;
};

/**
 * Search public recipes with cursor-based pagination.
 *
 * Fetches pageSize+1 rows to detect hasMore without a separate count query.
 * Always filters visibility='public' and orders by created_at desc.
 */
export async function searchPublicRecipes(
  filters: PublicBrowseFilters = {}
): Promise<PublicBrowsePage> {
  const pageSize = filters.pageSize ?? 20;
  const page = filters.cursor?.page ?? 0;
  const from = page * pageSize;
  const to = from + pageSize; // Supabase range is inclusive, so this fetches pageSize+1 rows

  let query = supabase
    .from("recipes")
    .select("*")
    .eq("visibility", "public")
    .order("created_at", { ascending: false });

  if (filters.query && filters.query.trim()) {
    query = query.ilike("title", `%${escapeLikePattern(filters.query.trim())}%`);
  }

  if (filters.tag && filters.tag !== "All") {
    query = query.overlaps("tags", [filters.tag]);
  }

  query = query.range(from, to);

  const { data, error } = await query;

  if (error) throw error;

  const items = (data as Recipe[]) || [];
  const hasMore = items.length > pageSize;
  const recipes = hasMore ? items.slice(0, pageSize) : items;
  const nextCursor = hasMore ? { page: page + 1 } : null;

  return { recipes, hasMore, nextCursor };
}

/**
 * Get exact count of public recipes matching filters.
 *
 * Uses head:true + count:'exact' for efficiency (no row data transferred).
 */
export async function getPublicRecipeCount(
  filters: { query?: string; tag?: string } = {}
): Promise<number> {
  let query = supabase
    .from("recipes")
    .select("id", { count: "exact", head: true })
    .eq("visibility", "public");

  if (filters.query && filters.query.trim()) {
    query = query.ilike("title", `%${escapeLikePattern(filters.query.trim())}%`);
  }

  if (filters.tag && filters.tag !== "All") {
    query = query.overlaps("tags", [filters.tag]);
  }

  const { count, error } = await query;

  if (error) throw error;
  return count ?? 0;
}