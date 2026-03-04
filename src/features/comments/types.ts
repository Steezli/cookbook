export type Comment = {
  id: string;
  recipe_id: string;
  user_id: string;
  parent_comment_id: string | null;
  content: string;
  is_edited: boolean;
  created_at: string;
  updated_at: string;
  depth: number;
  path: string;
  // Joined from profiles
  author_display_name?: string;
  author_email?: string;
};

export type CreateCommentInput = {
  recipe_id: string;
  content: string;
  parent_comment_id?: string;
};

export type UpdateCommentInput = {
  content: string;
};
