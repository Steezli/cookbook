import { supabase } from "@/lib/supabase";
import type { Comment, CreateCommentInput, UpdateCommentInput } from "./types";

export async function getRecipeComments(recipeId: string): Promise<Comment[]> {
  // Call the RPC function to get threaded comments
  const { data: comments, error: rpcError } = await supabase
    .rpc('get_recipe_comments', { p_recipe_id: recipeId });

  if (rpcError) throw rpcError;
  if (!comments || comments.length === 0) return [];

  // Extract unique user_ids to fetch author information
  const userIds = Array.from(new Set(comments.map((c: Comment) => c.user_id)));

  // Fetch author information from profiles
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('user_id, display_name, email')
    .in('user_id', userIds);

  if (profilesError) throw profilesError;

  // Create a map for quick lookup
  const profileMap = new Map(
    (profiles || []).map(p => [p.user_id, p])
  );

  // Merge author information into comments
  return comments.map((comment: Comment) => {
    const profile = profileMap.get(comment.user_id);
    return {
      ...comment,
      author_display_name: profile?.display_name,
      author_email: profile?.email
    };
  });
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
