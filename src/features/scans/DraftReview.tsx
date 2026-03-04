import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { ScanDraft, scanDraftService } from '@/lib/scan/scan-draft-service';
import { ParsedRecipe, FieldConfidence } from '@/lib/ai/recipe-parsing-service';
import { useSession } from "@/features/auth/session";

interface DraftReviewProps {
  draftId: string;
  onDraftUpdated?: (draft: ScanDraft) => void;
  onEdit?: () => void;
}

const getConfidenceStyle = (confidence: number): { bg: string; text: string } => {
  if (confidence >= 0.85) return { bg: '#dcfce7', text: '#166534' };
  if (confidence >= 0.65) return { bg: '#fef9c3', text: '#854d0e' };
  return { bg: '#fef2f2', text: '#991b1b' };
};

const getConfidenceLabel = (confidence: number): string => {
  if (confidence >= 0.85) return 'High';
  if (confidence >= 0.65) return 'Medium';
  return 'Low';
};

const ConfidenceIndicator = ({
  confidence,
  field,
}: {
  confidence: number;
  field: string;
}) => {
  const colorStyle = getConfidenceStyle(confidence);
  return (
    <View style={styles.confidenceRow}>
      <Text style={styles.confidenceField}>{field}</Text>
      <View style={[styles.confidenceBadge, { backgroundColor: colorStyle.bg }]}>
        <Text style={[styles.confidenceBadgeText, { color: colorStyle.text }]}>
          {getConfidenceLabel(confidence)} ({Math.round(confidence * 100)}%)
        </Text>
      </View>
    </View>
  );
};

export function DraftReview({ draftId, onDraftUpdated, onEdit }: DraftReviewProps) {
  const { session, isLoading: authLoading } = useSession();
  const [draft, setDraft] = useState<ScanDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadDraft = async () => {
      try {
        setLoading(true);
        const userId = session!.user.id;
        const draftData = await scanDraftService.getDraftByJobId(draftId, userId);

        if (!draftData) {
          setError('Draft not found');
          return;
        }

        setDraft(draftData);
        onDraftUpdated?.(draftData);
      } catch (err) {
        console.error('Failed to load draft:', err);
        setError(err instanceof Error ? err.message : 'Failed to load draft');
      } finally {
        setLoading(false);
      }
    };

    if (draftId && session?.user?.id) {
      loadDraft();
    }
  }, [draftId, session, onDraftUpdated]);

  if (authLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  if (!session) {
    return (
      <View style={styles.outerContainer}>
        <View style={styles.warningCard}>
          <Text style={styles.warningTitle}>Authentication Required</Text>
          <Text style={styles.warningText}>Please log in to review drafts</Text>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  if (error || !draft) {
    return (
      <View style={styles.outerContainer}>
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>Error Loading Draft</Text>
          <Text style={styles.errorText}>{error || 'Draft not found'}</Text>
        </View>
      </View>
    );
  }

  const recipe = draft.recipe;
  const fieldConfidence = draft.fieldConfidence;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header */}
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <Text style={styles.heading1}>Recipe Draft Review</Text>
            <Text style={styles.subtitleText}>
              Review and edit the extracted recipe data before saving
            </Text>
          </View>

          <View style={styles.headerRight}>
            {/* Overall Confidence */}
            <View style={styles.overallConfidenceContainer}>
              <View
                style={[
                  styles.overallConfidenceBadge,
                  { backgroundColor: getConfidenceStyle(draft.overallConfidence.score).bg },
                ]}
              >
                <Text
                  style={[
                    styles.overallConfidenceText,
                    { color: getConfidenceStyle(draft.overallConfidence.score).text },
                  ]}
                >
                  Overall: {Math.round(draft.overallConfidence.score * 100)}%
                </Text>
              </View>
              <Text style={styles.confidenceLabelSmall}>Confidence</Text>
            </View>

            {/* Action Buttons */}
            <TouchableOpacity style={styles.primaryButton} onPress={onEdit}>
              <Text style={styles.primaryButtonText}>Edit Draft</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Original Photo */}
      <View style={styles.card}>
        <Text style={styles.heading2}>Original Photo</Text>
        <View style={styles.photoPlaceholder}>
          <Text style={styles.photoPlaceholderEmoji}>{'📷'}</Text>
          <Text style={styles.photoPlaceholderText}>
            Original photo would be displayed here
          </Text>
          <Text style={styles.photoPlaceholderSubtext}>
            From scan job: {draft.jobId}
          </Text>
        </View>
      </View>

      {/* Raw OCR Text */}
      <View style={styles.card}>
        <Text style={styles.heading2}>Raw Extracted Text</Text>
        <View style={styles.rawTextContainer}>
          <Text style={styles.monospace}>{draft.rawText}</Text>
        </View>
        <View style={styles.ocrConfidenceRow}>
          <Text style={styles.secondaryText}>
            OCR Confidence: {Math.round(draft.ocrConfidence * 100)}%
          </Text>
          <ConfidenceIndicator
            confidence={draft.ocrConfidence}
            field="OCR Quality"
          />
        </View>
      </View>

      {/* Recipe Title */}
      <View style={styles.card}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.heading2}>Recipe Title</Text>
          <ConfidenceIndicator
            confidence={fieldConfidence.title}
            field="Title"
          />
        </View>
        <View style={styles.fieldValueContainer}>
          <Text style={styles.fieldValueText}>
            {recipe.title || 'No title detected'}
          </Text>
        </View>
      </View>

      {/* Metadata */}
      <View style={styles.card}>
        <Text style={styles.heading2}>Recipe Details</Text>
        <View style={styles.detailsContainer}>
          {/* Servings */}
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Servings:</Text>
            <View style={styles.detailValueRow}>
              <Text style={styles.detailValue}>
                {recipe.servings || 'Not detected'}
              </Text>
              <ConfidenceIndicator
                confidence={fieldConfidence.servings}
                field="Servings"
              />
            </View>
          </View>

          {/* Prep Time */}
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Prep Time:</Text>
            <View style={styles.detailValueRow}>
              <Text style={styles.detailValue}>
                {recipe.prepTimeMinutes
                  ? `${recipe.prepTimeMinutes} min`
                  : 'Not detected'}
              </Text>
              <ConfidenceIndicator
                confidence={fieldConfidence.prepTime}
                field="Prep Time"
              />
            </View>
          </View>

          {/* Cook Time */}
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Cook Time:</Text>
            <View style={styles.detailValueRow}>
              <Text style={styles.detailValue}>
                {recipe.cookTimeMinutes
                  ? `${recipe.cookTimeMinutes} min`
                  : 'Not detected'}
              </Text>
              <ConfidenceIndicator
                confidence={fieldConfidence.cookTime}
                field="Cook Time"
              />
            </View>
          </View>

          {/* Category */}
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Category:</Text>
            <Text style={styles.detailValue}>
              {recipe.category || 'Not detected'}
            </Text>
          </View>

          {/* Cuisine */}
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Cuisine:</Text>
            <Text style={styles.detailValue}>
              {recipe.cuisine || 'Not detected'}
            </Text>
          </View>
        </View>
      </View>

      {/* Ingredients Preview */}
      <View style={styles.card}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.heading2}>
            Ingredients ({recipe.ingredients?.length || 0})
          </Text>
          <ConfidenceIndicator
            confidence={fieldConfidence.ingredients}
            field="Ingredients"
          />
        </View>
        <View style={styles.listContainer}>
          {recipe.ingredients?.map((ingredient, index) => {
            const ingStyle = getConfidenceStyle(ingredient.confidence);
            return (
              <View key={index} style={styles.listItemRow}>
                <Text style={styles.listItemText}>
                  {ingredient.amount && `${ingredient.amount} `}
                  {ingredient.unit && `${ingredient.unit} `}
                  {ingredient.name}
                  {ingredient.preparation && `, ${ingredient.preparation}`}
                </Text>
                <View
                  style={[
                    styles.inlineConfidenceBadge,
                    { backgroundColor: ingStyle.bg },
                  ]}
                >
                  <Text style={[styles.inlineConfidenceText, { color: ingStyle.text }]}>
                    {Math.round(ingredient.confidence * 100)}%
                  </Text>
                </View>
              </View>
            );
          }) || (
            <Text style={styles.emptyText}>No ingredients detected</Text>
          )}
        </View>
      </View>

      {/* Instructions Preview */}
      <View style={styles.card}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.heading2}>
            Instructions ({recipe.instructions?.length || 0})
          </Text>
          <ConfidenceIndicator
            confidence={fieldConfidence.instructions}
            field="Instructions"
          />
        </View>
        <View style={styles.listContainer}>
          {recipe.instructions?.map((instruction, index) => (
            <View key={index} style={styles.instructionRow}>
              <View style={styles.stepBadge}>
                <Text style={styles.stepBadgeText}>{index + 1}</Text>
              </View>
              <Text style={styles.instructionText}>{instruction}</Text>
            </View>
          )) || (
            <Text style={styles.emptyText}>No instructions detected</Text>
          )}
        </View>
      </View>

      {/* Status and Actions */}
      <View style={styles.card}>
        <View style={styles.statusRow}>
          <View style={styles.statusLeft}>
            <Text style={styles.heading3}>Draft Status</Text>
            <Text style={styles.statusDescription}>
              {draft.status === 'ready' &&
                'This draft is ready to be saved as a recipe'}
              {draft.status === 'needs_review' &&
                'This draft needs review - check extracted fields'}
              {draft.status === 'enhanced' &&
                'This draft has been AI-enhanced'}
            </Text>
          </View>

          <View style={styles.statusActions}>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => router.back()}
            >
              <Text style={styles.secondaryButtonText}>Back to Scans</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryButton} onPress={onEdit}>
              <Text style={styles.primaryButtonText}>Continue Editing</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  contentContainer: {
    padding: 16,
  },
  outerContainer: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f3f4f6',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {
    flex: 1,
    marginRight: 16,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  heading1: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  heading2: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  heading3: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  subtitleText: {
    fontSize: 14,
    color: '#6b7280',
  },
  secondaryText: {
    fontSize: 14,
    color: '#6b7280',
  },
  overallConfidenceContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  overallConfidenceBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  overallConfidenceText: {
    fontSize: 14,
    fontWeight: '500',
  },
  confidenceLabelSmall: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  confidenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  confidenceField: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginRight: 8,
  },
  confidenceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  confidenceBadgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  primaryButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginRight: 12,
  },
  secondaryButtonText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '500',
  },
  photoPlaceholder: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoPlaceholderEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  photoPlaceholderText: {
    fontSize: 14,
    color: '#6b7280',
  },
  photoPlaceholderSubtext: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  rawTextContainer: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 16,
  },
  monospace: {
    fontSize: 14,
    color: '#374151',
    fontFamily: 'monospace',
  },
  ocrConfidenceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  fieldValueContainer: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
  },
  fieldValueText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#111827',
  },
  detailsContainer: {
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  detailValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailValue: {
    fontSize: 14,
    color: '#111827',
    marginRight: 8,
  },
  listContainer: {
    gap: 8,
  },
  listItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 8,
  },
  listItemText: {
    fontSize: 14,
    color: '#111827',
    flex: 1,
    marginRight: 8,
  },
  inlineConfidenceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  inlineConfidenceText: {
    fontSize: 12,
    fontWeight: '500',
  },
  instructionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 8,
  },
  stepBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepBadgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6b7280',
  },
  instructionText: {
    fontSize: 14,
    color: '#111827',
    flex: 1,
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    paddingVertical: 16,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusLeft: {
    flex: 1,
    marginRight: 16,
  },
  statusDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  statusActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  warningCard: {
    backgroundColor: '#fefce8',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: 12,
    padding: 20,
  },
  warningTitle: {
    fontSize: 18,
    fontWeight: '500',
    color: '#92400e',
    marginBottom: 8,
  },
  warningText: {
    fontSize: 14,
    color: '#a16207',
  },
  errorCard: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    borderRadius: 12,
    padding: 20,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '500',
    color: '#991b1b',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#dc2626',
  },
});
