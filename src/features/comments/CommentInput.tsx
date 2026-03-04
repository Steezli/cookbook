import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { createComment, updateComment } from "./api";
import type { CreateCommentInput, UpdateCommentInput } from "./types";

type CommentInputProps = {
  recipeId: string;
  parentCommentId?: string;
  initialContent?: string;
  isEditing?: boolean;
  editingCommentId?: string;
  onSubmit: () => void;
  onCancel?: () => void;
};

export function CommentInput({
  recipeId,
  parentCommentId,
  initialContent = "",
  isEditing = false,
  editingCommentId,
  onSubmit,
  onCancel
}: CommentInputProps) {
  const [content, setContent] = useState(initialContent);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    if (!content.trim()) return;

    setIsSubmitting(true);
    try {
      if (isEditing && editingCommentId) {
        const input: UpdateCommentInput = { content: content.trim() };
        await updateComment(editingCommentId, input);
      } else {
        const input: CreateCommentInput = {
          recipe_id: recipeId,
          content: content.trim(),
          parent_comment_id: parentCommentId
        };
        await createComment(input);
      }
      setContent("");
      onSubmit();
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : "Failed to submit comment");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder={isEditing ? "Edit your comment..." : "Add a comment..."}
        value={content}
        onChangeText={setContent}
        multiline
        numberOfLines={3}
        textAlignVertical="top"
      />
      <View style={styles.actions}>
        <Pressable
          style={[
            styles.submitButton,
            (isSubmitting || !content.trim()) && styles.submitButtonDisabled
          ]}
          onPress={handleSubmit}
          disabled={isSubmitting || !content.trim()}
        >
          <Text style={styles.submitButtonText}>
            {isSubmitting ? "Submitting..." : isEditing ? "Update" : "Submit"}
          </Text>
        </Pressable>
        {(isEditing || onCancel) && (
          <Pressable style={styles.cancelButton} onPress={onCancel}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    padding: 12,
    marginVertical: 8
  },
  input: {
    fontSize: 16,
    minHeight: 60,
    padding: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 4,
    marginBottom: 8
  },
  actions: {
    flexDirection: "row",
    gap: 8
  },
  submitButton: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    flex: 1
  },
  submitButtonDisabled: {
    opacity: 0.5
  },
  submitButtonText: {
    color: "#fff",
    fontWeight: "600",
    textAlign: "center",
    fontSize: 14
  },
  cancelButton: {
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    flex: 1
  },
  cancelButtonText: {
    color: "#333",
    fontWeight: "600",
    textAlign: "center",
    fontSize: 14
  }
});
