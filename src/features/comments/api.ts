import { supabase } from "@/lib/supabase";
import type { Comment, CreateCommentInput, UpdateCommentInput } from "./types";

export type CommentPage = {
  comments: Comment[];
  hasMore: boolean;
  total: number;
};

export type GetCommentsOptions = {
  limit?: number;
  offset?: number;
};

const DEFAULT_COMMENT_LIMIT = 50;

/**
 * Fetch threaded comments for a recipe with pagination.
 *
 * Pagination applies to **top-level** comments (depth 0).
 * All replies to those top-level comments are always included so
 * threads remain complete.  `total` reports the full count of
 * top-level comments so callers can render "load more" affordances.
 */
export async function getRecipeComments(
  recipeId: string,
  options: GetCommentsOptions = {}
): Promise<CommentPage> {
  const limit = options.limit ?? DEFAULT_COMMENT_LIMIT;
  const offset = options.offset ?? 0;

  const { data: allComments, error: rpcError } = await supabase
    .rpc('get_recipe_comments', { p_recipe_id: recipeId });

  if (rpcError) throw rpcError;
  if (!allComments || allComments.length === 0) {
    return { comments: [], hasMore: false, total: 0 };
  }

  const topLevel = allComments.filter((c: Comment) => c.parent_comment_id === null);
  const total = topLevel.length;
  const paginatedTopLevel = topLevel.slice(offset, offset + limit);
  const topLevelIds = new Set(paginatedTopLevel.map((c: Comment) => c.id));

  // Include all descendants — filter by path prefix so threads stay complete
  const paginatedComments = allComments.filter((c: Comment) => {
    if (topLevelIds.has(c.id)) return true;
    const rootId = c.path?.split('/')[0];
    return rootId ? topLevelIds.has(rootId) : false;
  });

  const userIds = Array.from(new Set(paginatedComments.map((c: Comment) => c.user_id)));

  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('user_id, display_name, email')
    .in('user_id', userIds);

  if (profilesError) throw profilesError;

  const profileMap = new Map(
    (profiles || []).map(p => [p.user_id, p])
  );

  const comments = paginatedComments.map((comment: Comment) => {
    const profile = profileMap.get(comment.user_id);
    return {
      ...comment,
      author_display_name: profile?.display_name ?? undefined,
      author_email: profile?.email
    };
  });

  return {
    comments,
    hasMore: offset + limit < total,
    total,
  };
}

export async function createComment(input: CreateCommentInput): Promise<Comment> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from('recipe_comments')
    .insert({
      recipe_id: input.recipe_id,
      user_id: user.id,
      parent_comment_id: input.parent_comment_id || null,
      content: input.content
    })
    .select()
    .single();

  if (error) throw error;
  return data as Comment;
}

export async function updateComment(
  commentId: string,
  input: UpdateCommentInput
): Promise<Comment> {
  const { data, error } = await supabase
    .from('recipe_comments')
    .update({
      content: input.content,
      is_edited: true
    })
    .eq('id', commentId)
    .select()
    .single();

  if (error) throw error;
  return data as Comment;
}

export async function deleteComment(commentId: string): Promise<void> {
  const { error } = await supabase
    .rpc('delete_recipe_comment', { p_comment_id: commentId });

  if (error) throw error;
}
