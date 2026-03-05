import { supabase } from '@/lib/supabase';

export type PublicAuthor = {
  display_name: string | null;
  initials: string;
};

const FALLBACK_AUTHOR: PublicAuthor = { display_name: null, initials: 'U' };

/**
 * Get author display info for a single public recipe via SECURITY DEFINER RPC.
 * Returns fallback { display_name: null, initials: 'U' } if recipe not found or not public.
 */
export async function getPublicRecipeAuthor(recipeId: string): Promise<PublicAuthor> {
  const { data, error } = await supabase.rpc('get_public_recipe_author', {
    p_recipe_id: recipeId,
  });

  if (error) throw error;

  if (!data || data.length === 0) {
    return FALLBACK_AUTHOR;
  }

  return {
    display_name: data[0].display_name,
    initials: data[0].initials,
  };
}

/**
 * Get author display info for multiple public recipes in one RPC call.
 * Returns a Record keyed by recipe_id. Skips RPC for empty input.
 */
export async function getPublicRecipeAuthors(
  recipeIds: string[]
): Promise<Record<string, PublicAuthor>> {
  if (recipeIds.length === 0) {
    return {};
  }

  const { data, error } = await supabase.rpc('get_public_recipe_authors', {
    p_recipe_ids: recipeIds,
  });

  if (error) throw error;

  const result: Record<string, PublicAuthor> = {};
  for (const row of data || []) {
    result[row.recipe_id] = {
      display_name: row.display_name,
      initials: row.initials,
    };
  }
  return result;
}
