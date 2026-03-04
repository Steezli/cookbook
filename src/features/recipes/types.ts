export type RecipeVisibility = 'private' | 'family' | 'public';

export type RecipeIngredient = {
  text: string;
  sort_order: number;
  // Phase 4: canonical unit fields (optional for backward compat)
  amount?: number | null;
  unit?: string | null;
  original_text?: string | null;
  is_ambiguous?: boolean;
};

export type RecipeStep = {
  text: string;
  sort_order: number;
};

export type Recipe = {
  id: string;
  owner_user_id: string;
  family_id: string | null;
  visibility: RecipeVisibility;
  title: string;
  description: string | null;
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
  servings: number | null;
  prep_time_minutes: number | null;
  cook_time_minutes: number | null;
  source_story: string | null;
  tags: string[];
  rating_average: number | null;
  rating_count: number | null;
  created_at: string;
  updated_at: string;
};

export type CreateRecipeInput = {
  title: string;
  description?: string;
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
  visibility: RecipeVisibility;
  family_id?: string | null;
  servings?: number | null;
  prep_time_minutes?: number | null;
  cook_time_minutes?: number | null;
  source_story?: string;
  tags?: string[];
};

export type UpdateRecipeInput = Partial<CreateRecipeInput>;