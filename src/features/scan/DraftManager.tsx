import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Modal,
  ActivityIndicator,
  Share,
} from 'react-native';
import * as Linking from 'expo-linking';
import { ScanDraft, scanDraftService } from '@/lib/scan/scan-draft-service';
import { ParsedRecipe } from '@/features/scan/types';
import { useSession } from "@/features/auth/session";
import { useBreakpoint } from '@/lib/hooks/useBreakpoint';
import {
  accentBlue,
  accentCoral,
  accentGreen,
  bgPage,
  bgCard,
  badgeGreenBg,
  borderDefault,
  borderSubtle,
  textPrimary,
  textSecondary,
  textTertiary,
  white,
  errorBg,
  errorBorder,
  errorTitle,
  errorText,
  warningBg,
  warningBorder,
  warningTitle,
  warningText,
  radiusSm,
  radiusMd,
  radiusPill,
  shadowMd,
  fontFamilyDisplay,
  fontFamilyBody,
  fontFamilyBodyMedium,
  fontFamilyBodyBold,
  fontSizeXs,
  fontSizeSm,
  fontSizeBase,
  fontSizeLg,
  accentPurple,
  statusReadyBg,
  statusReadyText,
  statusReviewBg,
  statusReviewText,
  statusEnhancedBg,
  statusEnhancedText,
} from '@/lib/tokens';

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
  const { breakpoint } = useBreakpoint();
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
  const [savedRecipeId, setSavedRecipeId] = useState<string | null>(null);

  // Responsive layout values
  const isMobile = breakpoint === 'mobile';
  const cardPadding = isMobile ? 16 : 24;
  const modalMaxWidth = isMobile ? '100%' as const : 560;
  const modalPadding = isMobile ? 20 : 28;
  const buttonMinWidth = isMobile ? '47%' as const : 150;

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

      setSavedRecipeId(result.recipeId);
      setShowSaveDialog(false);
    } catch (err) {
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
    } catch {
      // Share cancelled or failed — no action needed
    }
  }, [draft]);

  const getStatusColor = (): { bg: string; text: string } => {
    switch (draft.status) {
      case 'ready': return { bg: statusReadyBg, text: statusReadyText };
      case 'needs_review': return { bg: statusReviewBg, text: statusReviewText };
      case 'enhanced': return { bg: statusEnhancedBg, text: statusEnhancedText };
      default: return { bg: borderSubtle, text: textSecondary };
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
      <View style={{
        backgroundColor: white,
        borderRadius: radiusSm,
        padding: cardPadding,
        ...shadowMd,
      }}>
        <ActivityIndicator size="large" color={accentBlue} />
      </View>
    );
  }

  if (!session) {
    return (
      <View style={{
        backgroundColor: white,
        borderRadius: radiusSm,
        padding: cardPadding,
        ...shadowMd,
      }}>
        <View style={{
          backgroundColor: warningBg,
          borderWidth: 1,
          borderColor: warningBorder,
          borderRadius: 8,
          padding: 16,
        }}>
          <Text style={{
            fontFamily: fontFamilyBodyMedium,
            fontSize: fontSizeBase,
            color: warningTitle,
            marginBottom: 6,
          }}>Authentication Required</Text>
          <Text style={{
            fontFamily: fontFamilyBody,
            fontSize: fontSizeSm,
            color: warningText,
          }}>Please log in to manage drafts</Text>
        </View>
      </View>
    );
  }

  const statusColor = getStatusColor();

  return (
    <View style={{
      backgroundColor: white,
      borderRadius: radiusSm,
      padding: cardPadding,
      ...shadowMd,
    }}>
      <View style={{ marginBottom: 16 }}>
        <View>
          <Text style={{
            fontFamily: fontFamilyDisplay,
            fontSize: fontSizeLg,
            color: textPrimary,
            marginBottom: 8,
          }}>Draft Management</Text>
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 10,
          }}>
            <View style={{
              paddingHorizontal: 12,
              paddingVertical: 4,
              borderRadius: radiusPill,
              backgroundColor: statusColor.bg,
            }}>
              <Text style={{
                fontFamily: fontFamilyBodyMedium,
                fontSize: 13,
                color: statusColor.text,
              }}>
                {getStatusText()}
              </Text>
            </View>
            <Text style={{
              fontFamily: fontFamilyBody,
              fontSize: 13,
              color: textSecondary,
            }}>
              Created: {new Date(draft.createdAt).toLocaleDateString()}
            </Text>
          </View>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 16,
      }}>
        <Pressable
          style={({ pressed }) => ({
            flex: isMobile ? undefined : 1,
            minWidth: buttonMinWidth,
            paddingVertical: 14,
            paddingHorizontal: 16,
            borderRadius: 8,
            alignItems: 'center' as const,
            backgroundColor: accentBlue,
            opacity: pressed ? 0.7 : 1,
          })}
          onPress={() => setShowSaveDialog(true)}
        >
          <Text style={{
            fontFamily: fontFamilyBodyBold,
            color: white,
            fontSize: fontSizeBase - 1,
          }}>Save as Recipe</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => ({
            flex: isMobile ? undefined : 1,
            minWidth: buttonMinWidth,
            paddingVertical: 14,
            paddingHorizontal: 16,
            borderRadius: 8,
            alignItems: 'center' as const,
            backgroundColor: textSecondary,
            opacity: (pressed ? 0.7 : 1) * (draft.status === 'needs_review' ? 0.5 : 1),
          })}
          onPress={saveAsDraft}
          disabled={draft.status === 'needs_review'}
        >
          <Text style={{
            fontFamily: fontFamilyBodyBold,
            color: white,
            fontSize: fontSizeBase - 1,
          }}>Save as Draft</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => ({
            flex: isMobile ? undefined : 1,
            minWidth: buttonMinWidth,
            paddingVertical: 14,
            paddingHorizontal: 16,
            borderRadius: 8,
            alignItems: 'center' as const,
            backgroundColor: accentPurple,
            opacity: pressed ? 0.7 : 1,
          })}
          onPress={shareDraft}
        >
          <Text style={{
            fontFamily: fontFamilyBodyBold,
            color: white,
            fontSize: fontSizeBase - 1,
          }}>Share Draft</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => ({
            flex: isMobile ? undefined : 1,
            minWidth: buttonMinWidth,
            paddingVertical: 14,
            paddingHorizontal: 16,
            borderRadius: 8,
            alignItems: 'center' as const,
            backgroundColor: accentCoral,
            opacity: pressed ? 0.7 : 1,
          })}
          onPress={() => setShowDiscardDialog(true)}
        >
          <Text style={{
            fontFamily: fontFamilyBodyBold,
            color: white,
            fontSize: fontSizeBase - 1,
          }}>Discard Draft</Text>
        </Pressable>
      </View>

      {/* Error Display */}
      {error && (
        <View style={{
          backgroundColor: errorBg,
          borderWidth: 1,
          borderColor: errorBorder,
          borderRadius: 8,
          padding: 12,
          marginBottom: 16,
        }}>
          <Text style={{
            fontFamily: fontFamilyBody,
            fontSize: fontSizeSm,
            color: errorTitle,
          }}>{error}</Text>
          <Pressable
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
            onPress={() => setError(null)}
          >
            <Text style={{
              fontFamily: fontFamilyBody,
              fontSize: fontSizeXs,
              color: errorText,
              textDecorationLine: 'underline',
              marginTop: 6,
            }}>Dismiss</Text>
          </Pressable>
        </View>
      )}

      {/* Save as Recipe Dialog */}
      <Modal
        visible={showSaveDialog}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSaveDialog(false)}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 16,
        }}>
          <View style={{
            backgroundColor: white,
            borderRadius: 8,
            maxWidth: modalMaxWidth,
            width: '100%',
            padding: modalPadding,
          }}>
            <Text style={{
              fontFamily: fontFamilyDisplay,
              fontSize: fontSizeLg,
              color: textPrimary,
              marginBottom: 16,
            }}>Save as Recipe</Text>

            <View style={{ gap: 14 }}>
              <View style={{ gap: 6 }}>
                <Text style={{
                  fontFamily: fontFamilyBodyMedium,
                  fontSize: fontSizeSm,
                  color: textPrimary,
                }}>Recipe Title *</Text>
                <TextInput
                  style={{
                    borderWidth: 1,
                    borderColor: borderDefault,
                    borderRadius: 8,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    fontFamily: fontFamilyBody,
                    fontSize: fontSizeBase - 1,
                    color: textPrimary,
                    backgroundColor: white,
                  }}
                  value={conversionOptions.title}
                  onChangeText={(text) =>
                    setConversionOptions((prev) => ({ ...prev, title: text }))
                  }
                  placeholder="Enter recipe title"
                  placeholderTextColor={textTertiary}
                />
              </View>

              <View style={{ gap: 6 }}>
                <Text style={{
                  fontFamily: fontFamilyBodyMedium,
                  fontSize: fontSizeSm,
                  color: textPrimary,
                }}>Description</Text>
                <TextInput
                  style={{
                    borderWidth: 1,
                    borderColor: borderDefault,
                    borderRadius: 8,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    fontFamily: fontFamilyBody,
                    fontSize: fontSizeBase - 1,
                    color: textPrimary,
                    backgroundColor: white,
                    minHeight: 80,
                    textAlignVertical: 'top',
                  }}
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
                  placeholderTextColor={textTertiary}
                />
              </View>

              <View style={{ gap: 6 }}>
                <Text style={{
                  fontFamily: fontFamilyBodyMedium,
                  fontSize: fontSizeSm,
                  color: textPrimary,
                }}>Category</Text>
                <TextInput
                  style={{
                    borderWidth: 1,
                    borderColor: borderDefault,
                    borderRadius: 8,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    fontFamily: fontFamilyBody,
                    fontSize: fontSizeBase - 1,
                    color: textPrimary,
                    backgroundColor: white,
                  }}
                  value={conversionOptions.category || ''}
                  onChangeText={(text) =>
                    setConversionOptions((prev) => ({
                      ...prev,
                      category: text,
                    }))
                  }
                  placeholder="e.g., Main dish, Dessert"
                  placeholderTextColor={textTertiary}
                />
              </View>

              <View style={{ gap: 6 }}>
                <Text style={{
                  fontFamily: fontFamilyBodyMedium,
                  fontSize: fontSizeSm,
                  color: textPrimary,
                }}>Tags (comma separated)</Text>
                <TextInput
                  style={{
                    borderWidth: 1,
                    borderColor: borderDefault,
                    borderRadius: 8,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    fontFamily: fontFamilyBody,
                    fontSize: fontSizeBase - 1,
                    color: textPrimary,
                    backgroundColor: white,
                  }}
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
                  placeholderTextColor={textTertiary}
                />
              </View>
            </View>

            <View style={{
              flexDirection: 'row',
              justifyContent: 'flex-end',
              gap: 10,
              marginTop: 20,
            }}>
              <Pressable
                style={({ pressed }) => ({
                  backgroundColor: borderSubtle,
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: 8,
                  opacity: pressed ? 0.7 : 1,
                })}
                onPress={() => setShowSaveDialog(false)}
              >
                <Text style={{
                  fontFamily: fontFamilyBodyMedium,
                  color: textPrimary,
                  fontSize: fontSizeSm,
                }}>Cancel</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => ({
                  backgroundColor: accentBlue,
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: 8,
                  opacity: (pressed ? 0.7 : 1) * ((saving || !conversionOptions.title.trim()) ? 0.5 : 1),
                })}
                onPress={saveAsRecipe}
                disabled={saving || !conversionOptions.title.trim()}
              >
                <Text style={{
                  fontFamily: fontFamilyBodyBold,
                  color: white,
                  fontSize: fontSizeSm,
                }}>
                  {saving ? 'Saving...' : 'Save Recipe'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Recipe Saved — choice dialog */}
      <Modal
        visible={savedRecipeId !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          const id = savedRecipeId!;
          setSavedRecipeId(null);
          setTimeout(() => onConverted?.(id), 150);
        }}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 16,
        }}>
          <View style={{
            backgroundColor: white,
            borderRadius: 8,
            maxWidth: modalMaxWidth,
            width: '100%',
            padding: modalPadding,
          }}>
            <View style={{
              backgroundColor: badgeGreenBg,
              borderRadius: radiusPill,
              paddingHorizontal: 14,
              paddingVertical: 6,
              alignSelf: 'flex-start',
              marginBottom: 12,
            }}>
              <Text style={{
                fontFamily: fontFamilyBodyMedium,
                fontSize: fontSizeSm,
                color: accentGreen,
              }}>✓ Saved</Text>
            </View>

            <Text style={{
              fontFamily: fontFamilyDisplay,
              fontSize: fontSizeLg,
              color: textPrimary,
              marginBottom: 6,
            }}>Recipe Saved!</Text>

            <Text style={{
              fontFamily: fontFamilyBody,
              fontSize: fontSizeBase - 1,
              color: textSecondary,
              marginBottom: 20,
            }}>
              What would you like to do next?
            </Text>

            <View style={{ gap: 10 }}>
              <Pressable
                style={({ pressed }) => ({
                  backgroundColor: pressed ? '#0066DD' : accentBlue,
                  paddingVertical: 14,
                  paddingHorizontal: 16,
                  borderRadius: 8,
                  alignItems: 'center' as const,
                })}
                onPress={() => {
                  const id = savedRecipeId!;
                  setSavedRecipeId(null);
                  // Small delay to let modal dismiss before navigation
                  setTimeout(() => onConverted?.(id), 150);
                }}
              >
                <Text style={{
                  fontFamily: fontFamilyBodyBold,
                  color: white,
                  fontSize: fontSizeBase - 1,
                }}>View Recipe</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => ({
                  backgroundColor: pressed ? borderDefault : bgCard,
                  paddingVertical: 14,
                  paddingHorizontal: 16,
                  borderRadius: 8,
                  alignItems: 'center' as const,
                  borderWidth: 1,
                  borderColor: borderDefault,
                })}
                onPress={() => {
                  setSavedRecipeId(null);
                  onDiscarded?.();
                }}
              >
                <Text style={{
                  fontFamily: fontFamilyBodyMedium,
                  color: textPrimary,
                  fontSize: fontSizeBase - 1,
                }}>Back to Drafts</Text>
              </Pressable>
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
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 16,
        }}>
          <View style={{
            backgroundColor: white,
            borderRadius: 8,
            maxWidth: modalMaxWidth,
            width: '100%',
            padding: modalPadding,
          }}>
            <Text style={{
              fontFamily: fontFamilyDisplay,
              fontSize: fontSizeLg,
              color: textPrimary,
              marginBottom: 16,
            }}>Discard Draft?</Text>

            <View style={{ marginBottom: 8 }}>
              <Text style={{
                fontFamily: fontFamilyBody,
                fontSize: fontSizeBase - 1,
                color: textSecondary,
                marginBottom: 12,
              }}>
                Discard this draft? This can't be undone.
              </Text>

              <View style={{
                backgroundColor: warningBg,
                borderWidth: 1,
                borderColor: warningBorder,
                borderRadius: 8,
                padding: 14,
              }}>
                <Text style={{
                  fontFamily: fontFamilyBodyMedium,
                  fontSize: fontSizeSm,
                  color: warningTitle,
                  marginBottom: 8,
                }}>
                  Draft to be discarded:
                </Text>
                <View style={{ gap: 4 }}>
                  <Text style={{
                    fontFamily: fontFamilyBody,
                    fontSize: fontSizeSm,
                    color: warningText,
                  }}>
                    <Text style={{ fontFamily: fontFamilyBodyBold }}>Title:</Text>{' '}
                    {draft.recipe.title || 'Untitled'}
                  </Text>
                  <Text style={{
                    fontFamily: fontFamilyBody,
                    fontSize: fontSizeSm,
                    color: warningText,
                  }}>
                    <Text style={{ fontFamily: fontFamilyBodyBold }}>Ingredients:</Text>{' '}
                    {draft.recipe.ingredients?.length || 0}
                  </Text>
                  <Text style={{
                    fontFamily: fontFamilyBody,
                    fontSize: fontSizeSm,
                    color: warningText,
                  }}>
                    <Text style={{ fontFamily: fontFamilyBodyBold }}>Instructions:</Text>{' '}
                    {draft.recipe.instructions?.length || 0}
                  </Text>
                  <Text style={{
                    fontFamily: fontFamilyBody,
                    fontSize: fontSizeSm,
                    color: warningText,
                  }}>
                    <Text style={{ fontFamily: fontFamilyBodyBold }}>Created:</Text>{' '}
                    {new Date(draft.createdAt).toLocaleString()}
                  </Text>
                </View>
              </View>
            </View>

            <View style={{
              flexDirection: 'row',
              justifyContent: 'flex-end',
              gap: 10,
              marginTop: 20,
            }}>
              <Pressable
                style={({ pressed }) => ({
                  backgroundColor: borderSubtle,
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: 8,
                  opacity: pressed ? 0.7 : 1,
                })}
                onPress={() => setShowDiscardDialog(false)}
              >
                <Text style={{
                  fontFamily: fontFamilyBodyMedium,
                  color: textPrimary,
                  fontSize: fontSizeSm,
                }}>Keep Draft</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => ({
                  backgroundColor: accentCoral,
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: 8,
                  opacity: (pressed ? 0.7 : 1) * (saving ? 0.5 : 1),
                })}
                onPress={discardDraft}
                disabled={saving}
              >
                <Text style={{
                  fontFamily: fontFamilyBodyBold,
                  color: white,
                  fontSize: fontSizeSm,
                }}>
                  {saving ? 'Discarding...' : 'Discard Draft'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
