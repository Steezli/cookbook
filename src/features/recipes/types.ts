export type RecipeVisibility = 'private' | 'family' | 'public';

export type RecipeIngredient = {
  text: string;
  sort_order: number;
  // Phase 4: canonical unit fields (optional for backward compat)
  amount?: number | string | null;
  unit?: string | null;
  original_text?: string | null;
  is_ambiguous?: boolean;
  // Legacy field — older recipes stored ingredient name here instead of `text`
  name?: string;
};

export type RecipeStep = {
  text: string;
  sort_order: number;
};

/** A non-empty array — at least one element is required. */
export type NonEmptyArray<T> = [T, ...T[]];

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
  ingredients: NonEmptyArray<RecipeIngredient>;
  steps: NonEmptyArray<RecipeStep>;
  visibility: RecipeVisibility;
  family_id?: string | null;
  servings?: number | null;
  prep_time_minutes?: number | null;
  cook_time_minutes?: number | null;
  source_story?: string;
  tags?: string[];
};

/**
 * When updating a recipe, keys are optional (partial update), but when present
 * they must satisfy stricter constraints than Partial<CreateRecipeInput>:
 * - title must be a non-empty string (enforced at runtime in api.ts)
 * - ingredients must contain at least one item
 * - steps must contain at least one item
 */
export type UpdateRecipeInput = Omit<
  Partial<CreateRecipeInput>,
  'ingredients' | 'steps'
> & {
  ingredients?: NonEmptyArray<RecipeIngredient>;
  steps?: NonEmptyArray<RecipeStep>;
};
