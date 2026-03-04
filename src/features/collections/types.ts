export type Collection = {
  id: string;
  owner_user_id: string;
  family_id: string | null;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
};

export type CreateCollectionInput = {
  name: string;
  description?: string;
  family_id?: string | null;
};

export type UpdateCollectionInput = {
  name?: string;
  description?: string;
};

export type CollectionWithRecipeCount = Collection & {
  recipe_count: number;
};