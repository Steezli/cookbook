import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { showAlert, confirmAction } from "@/lib/alert";
import { useSession } from "@/features/auth/session";
import { supabase } from "@/lib/supabase";
import { getRecipeComments, deleteComment } from "./api";
import type { Comment } from "./types";
import type { CommentPage } from "./api";
import { CommentInput } from "./CommentInput";

type CommentThreadProps = {
  recipeId: string;
  recipeOwnerId: string;
  recipeFamilyId?: string | null;
};

type CommentsByParent = Map<string | null, Comment[]>;

export function CommentThread({
  recipeId,
  recipeOwnerId,
  recipeFamilyId
}: CommentThreadProps) {
  const { session } = useSession();
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [totalTopLevel, setTotalTopLevel] = useState(0);
  const [showReplyFormFor, setShowReplyFormFor] = useState<string | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [userFamilyRole, setUserFamilyRole] = useState<"admin" | "member" | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const userId = session?.user.id;

  async function loadComments() {
    setIsLoading(true);
    try {
      const page = await getRecipeComments(recipeId);
      setComments(page.comments);
      setHasMore(page.hasMore);
      setTotalTopLevel(page.total);
    } catch (e) {
      showAlert("Error", e instanceof Error ? e.message : "Failed to load comments");
    } finally {
      setIsLoading(false);
    }
  }

  async function loadMoreComments() {
    if (!hasMore || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const page = await getRecipeComments(recipeId, { offset: comments.filter(c => c.parent_comment_id === null).length });
      // Merge: append new comments, avoid duplicates by id
      const existingIds = new Set(comments.map(c => c.id));
      const newComments = page.comments.filter(c => !existingIds.has(c.id));
      setComments(prev => [...prev, ...newComments]);
      setHasMore(page.hasMore);
    } catch (e) {
      showAlert("Error", e instanceof Error ? e.message : "Failed to load more comments");
    } finally {
      setIsLoadingMore(false);
    }
  }

  async function loadUserFamilyRole() {
    if (!userId || !recipeFamilyId) {
      setUserFamilyRole(null);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("family_memberships")
        .select("role")
        .eq("family_id", recipeFamilyId)
        .eq("user_id", userId)
        .maybeSingle();

      if (error) throw error;
      setUserFamilyRole(data?.role ?? null);
    } catch (e) {
      setUserFamilyRole(null);
    }
  }

  useEffect(() => {
    void loadComments();
    void loadUserFamilyRole();
  }, [recipeId, userId, recipeFamilyId]);

  async function handleDelete(commentId: string) {
    async function doDelete() {
      try {
        await deleteComment(commentId);
        await loadComments();
      } catch (e) {
        showAlert("Error", e instanceof Error ? e.message : "Failed to delete comment");
      }
    }

    confirmAction(
      "Delete Comment",
      "Are you sure you want to delete this comment?",
      doDelete,
    );
  }

  function canDeleteComment(comment: Comment): boolean {
    if (!userId) return false;
    // User can delete their own comment
    if (comment.user_id === userId) return true;
    // Recipe owner can delete any comment
    if (userId === recipeOwnerId) return true;
    // Family admin can delete any comment on a family recipe
    if (recipeFamilyId && userFamilyRole === "admin") return true;
    return false;
  }

  function canEditComment(comment: Comment): boolean {
    if (!userId) return false;
    return comment.user_id === userId;
  }

  function groupCommentsByParent(comments: Comment[]): CommentsByParent {
    const grouped = new Map<string | null, Comment[]>();
    for (const comment of comments) {
      const parentKey = comment.parent_comment_id;
      if (!grouped.has(parentKey)) {
        grouped.set(parentKey, []);
      }
      grouped.get(parentKey)!.push(comment);
    }
    return grouped;
  }

  function formatTimestamp(timestamp: string): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  }

  function renderComment(comment: Comment, depth: number, grouped: CommentsByParent) {
    const isEditing = editingCommentId === comment.id;
    const showReplyForm = showReplyFormFor === comment.id;
    const canReply = depth < 3; // Flatten after depth 3
    const canEdit = canEditComment(comment);
    const canDelete = canDeleteComment(comment);

    const authorName = comment.author_display_name || comment.author_email || "Unknown";

    return (
      <View key={comment.id} style={[styles.commentContainer, { marginLeft: depth * 16 }]}>
        <View style={styles.commentHeader}>
          <Text style={styles.authorName}>{authorName}</Text>
          <Text style={styles.timestamp}>{formatTimestamp(comment.created_at)}</Text>
        </View>

        {isEditing ? (
          <CommentInput
            recipeId={recipeId}
            initialContent={comment.content}
            isEditing={true}
            editingCommentId={comment.id}
            onSubmit={() => {
              setEditingCommentId(null);
              void loadComments();
            }}
            onCancel={() => setEditingCommentId(null)}
          />
        ) : (
          <>
            <Text style={styles.commentContent}>
              {comment.content}
              {comment.is_edited && <Text style={styles.editedIndicator}> (edited)</Text>}
            </Text>

            <View style={styles.commentActions}>
              {canReply && (
                <Pressable onPress={() => setShowReplyFormFor(comment.id)}>
                  <Text style={styles.actionButton}>Reply</Text>
                </Pressable>
              )}
              {canEdit && (
                <Pressable onPress={() => setEditingCommentId(comment.id)}>
                  <Text style={styles.actionButton}>Edit</Text>
                </Pressable>
              )}
              {canDelete && (
                <Pressable onPress={() => handleDelete(comment.id)}>
                  <Text style={[styles.actionButton, styles.deleteButton]}>Delete</Text>
                </Pressable>
              )}
            </View>
          </>
        )}

        {showReplyForm && (
          <View style={styles.replyForm}>
            <CommentInput
              recipeId={recipeId}
              parentCommentId={comment.id}
              onSubmit={() => {
                setShowReplyFormFor(null);
                void loadComments();
              }}
              onCancel={() => setShowReplyFormFor(null)}
            />
          </View>
        )}

        {/* Render nested replies */}
        {grouped.has(comment.id) &&
          grouped.get(comment.id)!.map((reply) => renderComment(reply, depth + 1, grouped))}
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator />
      </View>
    );
  }

  const grouped = groupCommentsByParent(comments);
  const topLevelComments = grouped.get(null) || [];

  return (
    <View style={styles.container}>
      {topLevelComments.length === 0 ? (
        <Text style={styles.noComments}>No comments yet. Be the first to comment!</Text>
      ) : (
        <>
          {topLevelComments.map((comment) => renderComment(comment, 0, grouped))}
          {hasMore && (
            <Pressable
              style={styles.loadMoreButton}
              onPress={() => void loadMoreComments()}
              disabled={isLoadingMore}
            >
              {isLoadingMore ? (
                <ActivityIndicator size="small" />
              ) : (
                <Text style={styles.loadMoreText}>
                  Load more comments ({totalTopLevel - topLevelComments.length} remaining)
                </Text>
              )}
            </Pressable>
          )}
        </>
      )}

      <CommentInput
        recipeId={recipeId}
        onSubmit={() => {
          void loadComments();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 16
  },
  loadingContainer: {
    padding: 24,
    alignItems: "center"
  },
  noComments: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    fontStyle: "italic",
    marginBottom: 16
  },
  commentContainer: {
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    padding: 12,
    marginBottom: 8
  },
  commentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8
  },
  authorName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333"
  },
  timestamp: {
    fontSize: 12,
    color: "#999"
  },
  commentContent: {
    fontSize: 14,
    lineHeight: 20,
    color: "#333",
    marginBottom: 8
  },
  editedIndicator: {
    fontStyle: "italic",
    color: "#999"
  },
  commentActions: {
    flexDirection: "row",
    gap: 16
  },
  actionButton: {
    fontSize: 12,
    color: "#007AFF",
    fontWeight: "500"
  },
  deleteButton: {
    color: "#FF3B30"
  },
  replyForm: {
    marginTop: 8
  },
  loadMoreButton: {
    alignItems: "center",
    padding: 12,
    marginBottom: 8,
    borderRadius: 8,
    backgroundColor: "#f0f0f0"
  },
  loadMoreText: {
    fontSize: 14,
    color: "#007AFF",
    fontWeight: "500"
  }
});
