export type RecipeRating = {
  recipe_id: string;
  user_id: string;
  rating: number;  // 0.5 to 5.0 in 0.5 increments
  created_at: string;
  updated_at: string;
};

export type RatingAggregate = {
  average: number | null;  // null if no ratings
  count: number;
};
