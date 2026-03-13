import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  Share,
  StyleSheet,
} from 'react-native';
import * as Linking from 'expo-linking';
import { ScanDraft, scanDraftService } from '@/lib/scan/scan-draft-service';
import { ParsedRecipe } from '@/features/scan/types';
import { useSession } from "@/features/auth/session";

interface DraftManagerProps {
  draft: ScanDraft;
  onDraftUpdated?: (draft: ScanDraft) => void;
  onConverted?: (recipeId: string) => void;
  onDiscarded?: () => void;
}

interface ConversionOptions {
  title: string;
  description?: string;
  category?: string;
  tags?: string[];
}

export function DraftManager({
  draft,
  onDraftUpdated,
  onConverted,
  onDiscarded
}: DraftManagerProps) {
  const { session, isLoading: authLoading } = useSession();
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [conversionOptions, setConversionOptions] = useState<ConversionOptions>({
    title: draft.recipe.title || '',
    description: '',
    category: draft.recipe.category || '',
    tags: []
  });
  const [error, setError] = useState<string | null>(null);

  const saveAsDraft = useCallback(async () => {
    try {
      setSaving(true);
      setError(null);

      const userId = session!.user.id;
      await scanDraftService.updateDraftStatus(draft.id, userId, 'needs_review');

      // Update local draft status
      const updatedDraft = { ...draft, status: 'needs_review' as const };
      onDraftUpdated?.(updatedDraft);

      setShowSaveDialog(false);
    } catch (err) {
      console.error('Failed to save draft:', err);
      setError(err instanceof Error ? err.message : 'Failed to save draft');
    } finally {
      setSaving(false);
    }
  }, [draft, onDraftUpdated]);

  const saveAsRecipe = useCallback(async () => {
    try {
      setSaving(true);
      setError(null);

      const userId = session!.user.id;
      const result = await scanDraftService.convertToRecipe(draft.id, userId, {
        title: conversionOptions.title,
        description: conversionOptions.description,
        ingredients: draft.recipe.ingredients,
        instructions: draft.recipe.instructions,
        prepTimeMinutes: draft.recipe.prepTimeMinutes,
        cookTimeMinutes: draft.recipe.cookTimeMinutes,
        servings: draft.recipe.servings,
        category: conversionOptions.category,
        tags: conversionOptions.tags || []
      });

      onConverted?.(result.recipeId);
      setShowSaveDialog(false);
    } catch (err) {
      console.error('Failed to convert draft:', err);
      setError(err instanceof Error ? err.message : 'Failed to save recipe');
    } finally {
      setSaving(false);
    }
  }, [draft, conversionOptions, onConverted]);

  const discardDraft = useCallback(async () => {
    try {
      setSaving(true);
      setError(null);

      const userId = session!.user.id;
      await scanDraftService.deleteDraft(draft.id, userId);

      onDiscarded?.();
      setShowDiscardDialog(false);
    } catch (err) {
      console.error('Failed to discard draft:', err);
      setError(err instanceof Error ? err.message : 'Failed to discard draft');
    } finally {
      setSaving(false);
    }
  }, [draft, onDiscarded]);

  const shareDraft = useCallback(async () => {
    // Build share URL using app scheme (no window.location in React Native)
    const shareUrl = Linking.createURL(`/draft/${draft.id}`);
    try {
      await Share.share({
        message: `Check out this recipe draft: ${draft.recipe.title || 'Untitled'}`,
        url: shareUrl,
      });
    } catch (err) {
      console.log('Share cancelled or failed:', err);
    }
  }, [draft]);

  const getStatusColor = (): { bg: string; text: string } => {
    switch (draft.status) {
      case 'ready': return { bg: '#dcfce7', text: '#166534' };
      case 'needs_review': return { bg: '#dbeafe', text: '#1e40af' };
      case 'enhanced': return { bg: '#f3e8ff', text: '#6b21a8' };
      default: return { bg: '#f3f4f6', text: '#4b5563' };
    }
  };

  const getStatusText = () => {
    switch (draft.status) {
      case 'ready': return 'Ready - Can be saved as recipe';
      case 'needs_review': return 'Needs Review - Check extracted fields';
      case 'enhanced': return 'Enhanced - AI improved fields';
      default: return draft.status;
    }
  };

  if (authLoading) {
    return (
      <View style={styles.card}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  if (!session) {
    return (
      <View style={styles.card}>
        <View style={styles.warningCard}>
          <Text style={styles.warningTitle}>Authentication Required</Text>
          <Text style={styles.warningText}>Please log in to manage drafts</Text>
        </View>
      </View>
    );
  }

  const statusColor = getStatusColor();

  return (
    <View style={styles.card}>
      <View style={styles.headerSection}>
        <View>
          <Text style={styles.heading}>Draft Management</Text>
          <View style={styles.statusRow}>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: statusColor.bg },
              ]}
            >
              <Text style={[styles.statusBadgeText, { color: statusColor.text }]}>
                {getStatusText()}
              </Text>
            </View>
            <Text style={styles.createdText}>
              Created: {new Date(draft.createdAt).toLocaleDateString()}
            </Text>
          </View>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.buttonGrid}>
        <TouchableOpacity
          style={[styles.actionButton, styles.saveButton]}
          onPress={() => setShowSaveDialog(true)}
        >
          <Text style={styles.actionButtonText}>Save as Recipe</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.actionButton,
            styles.draftButton,
            draft.status === 'needs_review' && styles.actionButtonDisabled,
          ]}
          onPress={saveAsDraft}
          disabled={draft.status === 'needs_review'}
        >
          <Text style={styles.actionButtonText}>Save as Draft</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.shareButton]}
          onPress={shareDraft}
        >
          <Text style={styles.actionButtonText}>Share Draft</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.discardButton]}
          onPress={() => setShowDiscardDialog(true)}
        >
          <Text style={styles.actionButtonText}>Discard Draft</Text>
        </TouchableOpacity>
      </View>

      {/* Error Display */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={() => setError(null)}>
            <Text style={styles.errorDismiss}>Dismiss</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Save as Recipe Dialog */}
      <Modal
        visible={showSaveDialog}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSaveDialog(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Save as Recipe</Text>

            <View style={styles.modalForm}>
              <View style={styles.formField}>
                <Text style={styles.label}>Recipe Title *</Text>
                <TextInput
                  style={styles.textInput}
                  value={conversionOptions.title}
                  onChangeText={(text) =>
                    setConversionOptions((prev) => ({ ...prev, title: text }))
                  }
                  placeholder="Enter recipe title"
                  placeholderTextColor="#9ca3af"
                />
              </View>

              <View style={styles.formField}>
                <Text style={styles.label}>Description</Text>
                <TextInput
                  style={[styles.textInput, styles.multilineInput]}
                  value={conversionOptions.description || ''}
                  onChangeText={(text) =>
                    setConversionOptions((prev) => ({
                      ...prev,
                      description: text,
                    }))
                  }
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  placeholder="Optional description"
                  placeholderTextColor="#9ca3af"
                />
              </View>

              <View style={styles.formField}>
                <Text style={styles.label}>Category</Text>
                <TextInput
                  style={styles.textInput}
                  value={conversionOptions.category || ''}
                  onChangeText={(text) =>
                    setConversionOptions((prev) => ({
                      ...prev,
                      category: text,
                    }))
                  }
                  placeholder="e.g., Main dish, Dessert"
                  placeholderTextColor="#9ca3af"
                />
              </View>

              <View style={styles.formField}>
                <Text style={styles.label}>Tags (comma separated)</Text>
                <TextInput
                  style={styles.textInput}
                  value={conversionOptions.tags?.join(', ') || ''}
                  onChangeText={(text) =>
                    setConversionOptions((prev) => ({
                      ...prev,
                      tags: text
                        .split(',')
                        .map((tag) => tag.trim())
                        .filter(Boolean),
                    }))
                  }
                  placeholder="e.g., easy, vegetarian, quick"
                  placeholderTextColor="#9ca3af"
                />
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalButtonSecondary}
                onPress={() => setShowSaveDialog(false)}
              >
                <Text style={styles.modalButtonSecondaryText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButtonPrimary,
                  (saving || !conversionOptions.title.trim()) &&
                    styles.actionButtonDisabled,
                ]}
                onPress={saveAsRecipe}
                disabled={saving || !conversionOptions.title.trim()}
              >
                <Text style={styles.modalButtonPrimaryText}>
                  {saving ? 'Saving...' : 'Save Recipe'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Discard Confirmation Dialog */}
      <Modal
        visible={showDiscardDialog}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDiscardDialog(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Discard Draft?</Text>

            <View style={styles.discardBody}>
              <Text style={styles.discardMessage}>
                Discard this draft? This can't be undone.
              </Text>

              <View style={styles.discardWarningCard}>
                <Text style={styles.discardWarningTitle}>
                  Draft to be discarded:
                </Text>
                <View style={styles.discardDetails}>
                  <Text style={styles.discardDetailText}>
                    <Text style={styles.bold}>Title:</Text>{' '}
                    {draft.recipe.title || 'Untitled'}
                  </Text>
                  <Text style={styles.discardDetailText}>
                    <Text style={styles.bold}>Ingredients:</Text>{' '}
                    {draft.recipe.ingredients?.length || 0}
                  </Text>
                  <Text style={styles.discardDetailText}>
                    <Text style={styles.bold}>Instructions:</Text>{' '}
                    {draft.recipe.instructions?.length || 0}
                  </Text>
                  <Text style={styles.discardDetailText}>
                    <Text style={styles.bold}>Created:</Text>{' '}
                    {new Date(draft.createdAt).toLocaleString()}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalButtonSecondary}
                onPress={() => setShowDiscardDialog(false)}
              >
                <Text style={styles.modalButtonSecondaryText}>Keep Draft</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButtonDanger,
                  saving && styles.actionButtonDisabled,
                ]}
                onPress={discardDraft}
                disabled={saving}
              >
                <Text style={styles.modalButtonPrimaryText}>
                  {saving ? 'Discarding...' : 'Discard Draft'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  headerSection: {
    marginBottom: 16,
  },
  heading: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
  },
  statusBadgeText: {
    fontSize: 13,
    fontWeight: '500',
  },
  createdText: {
    fontSize: 13,
    color: '#6b7280',
  },
  buttonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
    minWidth: 150,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  saveButton: {
    backgroundColor: '#3b82f6',
  },
  draftButton: {
    backgroundColor: '#4b5563',
  },
  shareButton: {
    backgroundColor: '#7c3aed',
  },
  discardButton: {
    backgroundColor: '#ef4444',
  },
  errorContainer: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 14,
    color: '#991b1b',
  },
  errorDismiss: {
    fontSize: 12,
    color: '#dc2626',
    textDecorationLine: 'underline',
    marginTop: 6,
  },
  warningCard: {
    backgroundColor: '#fefce8',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: 8,
    padding: 16,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#92400e',
    marginBottom: 6,
  },
  warningText: {
    fontSize: 14,
    color: '#a16207',
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    maxWidth: 448,
    width: '100%',
    padding: 24,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  modalForm: {
    gap: 14,
  },
  formField: {
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#ffffff',
  },
  multilineInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 20,
  },
  modalButtonSecondary: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  modalButtonSecondaryText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '500',
  },
  modalButtonPrimary: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  modalButtonPrimaryText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  modalButtonDanger: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },

  // Discard dialog styles
  discardBody: {
    marginBottom: 8,
  },
  discardMessage: {
    fontSize: 15,
    color: '#4b5563',
    marginBottom: 12,
  },
  discardWarningCard: {
    backgroundColor: '#fefce8',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: 8,
    padding: 14,
  },
  discardWarningTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#92400e',
    marginBottom: 8,
  },
  discardDetails: {
    gap: 4,
  },
  discardDetailText: {
    fontSize: 14,
    color: '#a16207',
  },
  bold: {
    fontWeight: '600',
  },
});
