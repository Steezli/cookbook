import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { ScanDraft, scanDraftService } from '@/lib/scan/scan-draft-service';
import { ParsedRecipe, ParsedIngredient } from '@/features/scan/types';
import { DraftReview } from './DraftReview';
import { DraftManager } from './DraftManager';
import { useSession } from "@/features/auth/session";
import { useBreakpoint } from '@/lib/hooks/useBreakpoint';
import {
  accentBlue,
  accentCoral,
  bgPage,
  bgCard,
  borderDefault,
  borderSubtle,
  textPrimary,
  textSecondary,
  textTertiary,
  white,
  errorBg,
  errorBorder,
  errorTitle as errorTitleColor,
  errorText as errorTextColor,
  warningBg,
  warningBorder,
  warningTitle as warningTitleColor,
  warningText as warningTextColor,
  fontFamilyDisplay,
  fontFamilyBody,
  fontFamilyBodyMedium,
  fontFamilyBodyBold,
  fontSizeXs,
  fontSizeSm,
  fontSizeBase,
  fontSizeLg,
  fontSizeXl,
  fontSize2xl,
  radiusSm,
  radiusMd,
  shadowSm,
  shadowMd,
} from '@/lib/tokens';

interface DraftEditorProps {
  /** Pass a ScanDraft directly to skip internal fetch (multi-draft path) */
  draft?: ScanDraft;
  /** Job ID used to fetch the draft when `draft` prop is not provided (backward compat) */
  draftId?: string;
  onSave?: (draft: ScanDraft) => void;
  onCancel?: () => void;
  /** Override the default post-convert navigation (multi-draft path) */
  onConverted?: (recipeId: string) => void;
}

interface EditHistory {
  recipe: ParsedRecipe;
  timestamp: number;
}

export function DraftEditor({ draft: draftProp, draftId, onSave, onCancel, onConverted: onConvertedProp }: DraftEditorProps) {
  const { session, isLoading: authLoading } = useSession();
  const { breakpoint } = useBreakpoint();
  const isMobile = breakpoint === 'mobile';
  const isWeb = breakpoint === 'web';

  const [draft, setDraft] = useState<ScanDraft | null>(draftProp ?? null);
  const [recipe, setRecipe] = useState<ParsedRecipe | null>(draftProp?.recipe ?? null);
  const [loading, setLoading] = useState(!draftProp);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<EditHistory[]>(
    draftProp ? [{ recipe: draftProp.recipe, timestamp: Date.now() }] : []
  );
  const [historyIndex, setHistoryIndex] = useState(draftProp ? 0 : -1);
  const [lastSaved, setLastSaved] = useState<Date | null>(draftProp ? new Date() : null);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');

  // Responsive values
  const contentPadding = isMobile ? 16 : isWeb ? 32 : 24;
  const cardPadding = isMobile ? 16 : isWeb ? 24 : 20;
  const metadataGap = isMobile ? 12 : 16;

  // When draft prop changes (multi-draft path), sync into local state
  useEffect(() => {
    if (!draftProp) return;
    setDraft(draftProp);
    setRecipe(draftProp.recipe);
    setHistory([{ recipe: draftProp.recipe, timestamp: Date.now() }]);
    setHistoryIndex(0);
    setLastSaved(new Date());
    setLoading(false);
    setError(null);
  }, [draftProp]);

  // Legacy path: load draft by jobId when draft prop is not provided
  useEffect(() => {
    if (draftProp) return; // Skip — draft was passed directly

    const loadDraft = async () => {
      try {
        setLoading(true);
        const userId = session!.user.id;
        const draftData = await scanDraftService.getDraftByJobId(draftId!, userId);

        if (!draftData) {
          setError('Draft not found');
          return;
        }

        setDraft(draftData);
        setRecipe(draftData.recipe);
        setHistory([{ recipe: draftData.recipe, timestamp: Date.now() }]);
        setHistoryIndex(0);
        setLastSaved(new Date());
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load draft');
      } finally {
        setLoading(false);
      }
    };

    if (draftId && session?.user?.id) {
      loadDraft();
    }
  }, [draftProp, draftId, session]);

  // Auto-save with debouncing
  const saveChanges = useCallback(async (recipeToSave: ParsedRecipe) => {
    if (!draft || saving) return;

    try {
      setSaving(true);
      setAutoSaveStatus('saving');

      const userId = session!.user.id;
      await scanDraftService.updateDraftRecipe(draft.id, userId, recipeToSave);

      setLastSaved(new Date());
      setAutoSaveStatus('saved');
      setError(null);

      // Update draft in state
      const updatedDraft = { ...draft, recipe: recipeToSave };
      setDraft(updatedDraft);
      onSave?.(updatedDraft);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save draft');
      setAutoSaveStatus('error');
    } finally {
      setSaving(false);
    }
  }, [draft, saving, onSave, session]);

  // Debounced auto-save
  useEffect(() => {
    if (!recipe || !draft || historyIndex === 0) return;

    const timer = setTimeout(() => {
      saveChanges(recipe);
    }, 2000); // 2 second debounce

    return () => clearTimeout(timer);
  }, [recipe, saveChanges, historyIndex, draft]);

  // Add to history
  const addToHistory = useCallback((newRecipe: ParsedRecipe) => {
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push({ recipe: newRecipe, timestamp: Date.now() });
      // Keep only last 50 changes
      return newHistory.slice(-50);
    });
    setHistoryIndex(prev => Math.min(prev + 1, 49));
  }, [historyIndex]);

  // Recipe field updates
  const updateRecipe = useCallback((updates: Partial<ParsedRecipe>) => {
    if (!recipe) return;

    const newRecipe = { ...recipe, ...updates };
    setRecipe(newRecipe);
    addToHistory(newRecipe);
  }, [recipe, addToHistory]);

  // Draft management handlers
  const handleDraftConverted = useCallback((recipeId: string) => {
    if (onConvertedProp) {
      onConvertedProp(recipeId);
    } else {
      router.replace(`/recipes/${recipeId}`);
    }
  }, [onConvertedProp]);

  const handleDraftDiscarded = useCallback(() => {
    router.replace('/scan');
  }, []);

  // Ingredient updates
  const updateIngredient = useCallback((index: number, updates: Partial<ParsedIngredient>) => {
    if (!recipe) return;

    const newIngredients = [...recipe.ingredients];
    newIngredients[index] = { ...newIngredients[index], ...updates };
    updateRecipe({ ingredients: newIngredients });
  }, [recipe, updateRecipe]);

  const addIngredient = useCallback(() => {
    if (!recipe) return;

    const newIngredient: ParsedIngredient = {
      name: '',
      amount: '',
      unit: '',
      preparation: '',
      confidence: 1.0
    };

    const newIngredients = [...recipe.ingredients, newIngredient];
    updateRecipe({ ingredients: newIngredients });
  }, [recipe, updateRecipe]);

  const removeIngredient = useCallback((index: number) => {
    if (!recipe) return;

    const newIngredients = recipe.ingredients.filter((_, i) => i !== index);
    updateRecipe({ ingredients: newIngredients });
  }, [recipe, updateRecipe]);

  const moveIngredient = useCallback((fromIndex: number, toIndex: number) => {
    if (!recipe) return;

    const newIngredients = [...recipe.ingredients];
    const [moved] = newIngredients.splice(fromIndex, 1);
    newIngredients.splice(toIndex, 0, moved);
    updateRecipe({ ingredients: newIngredients });
  }, [recipe, updateRecipe]);

  // Instruction updates
  const updateInstruction = useCallback((index: number, instruction: string) => {
    if (!recipe) return;

    const newInstructions = [...recipe.instructions];
    newInstructions[index] = instruction;
    updateRecipe({ instructions: newInstructions });
  }, [recipe, updateRecipe]);

  const addInstruction = useCallback(() => {
    if (!recipe) return;

    const newInstructions = [...recipe.instructions, ''];
    updateRecipe({ instructions: newInstructions });
  }, [recipe, updateRecipe]);

  const removeInstruction = useCallback((index: number) => {
    if (!recipe) return;

    const newInstructions = recipe.instructions.filter((_, i) => i !== index);
    updateRecipe({ instructions: newInstructions });
  }, [recipe, updateRecipe]);

  const moveInstruction = useCallback((fromIndex: number, toIndex: number) => {
    if (!recipe) return;

    const newInstructions = [...recipe.instructions];
    const [moved] = newInstructions.splice(fromIndex, 1);
    newInstructions.splice(toIndex, 0, moved);
    updateRecipe({ instructions: newInstructions });
  }, [recipe, updateRecipe]);

  if (authLoading) {
    return (
      <View style={{
        flex: 1,
        backgroundColor: bgCard,
        justifyContent: 'center',
        alignItems: 'center',
        padding: contentPadding,
      }}>
        <ActivityIndicator size="large" color={accentBlue} />
      </View>
    );
  }

  if (!session) {
    return (
      <View style={{
        flex: 1,
        backgroundColor: bgCard,
        justifyContent: 'center',
        alignItems: 'center',
        padding: contentPadding,
      }}>
        <View style={{
          backgroundColor: warningBg,
          borderWidth: 1,
          borderColor: warningBorder,
          borderRadius: radiusSm,
          padding: 20,
          width: '100%',
          maxWidth: 400,
        }}>
          <Text style={{
            fontSize: fontSizeLg,
            fontFamily: fontFamilyBodyMedium,
            color: warningTitleColor,
            marginBottom: 8,
          }}>Authentication Required</Text>
          <Text style={{
            fontSize: fontSizeBase,
            fontFamily: fontFamilyBody,
            color: warningTextColor,
          }}>Please log in to edit drafts</Text>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={{
        flex: 1,
        backgroundColor: bgCard,
        justifyContent: 'center',
        alignItems: 'center',
        padding: contentPadding,
      }}>
        <ActivityIndicator size="large" color={accentBlue} />
      </View>
    );
  }

  if (error || !draft || !recipe) {
    return (
      <View style={{
        flex: 1,
        backgroundColor: bgCard,
        justifyContent: 'center',
        alignItems: 'center',
        padding: contentPadding,
      }}>
        <View style={{
          backgroundColor: errorBg,
          borderWidth: 1,
          borderColor: errorBorder,
          borderRadius: radiusSm,
          padding: 20,
          width: '100%',
          maxWidth: 400,
        }}>
          <Text style={{
            fontSize: fontSizeLg,
            fontFamily: fontFamilyBodyMedium,
            color: errorTitleColor,
            marginBottom: 8,
          }}>Error Loading Draft</Text>
          <Text style={{
            fontSize: fontSizeBase,
            fontFamily: fontFamilyBody,
            color: errorTextColor,
          }}>{error || 'Draft not found'}</Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={{ flex: 1, backgroundColor: bgCard }}
        contentContainerStyle={{
          padding: contentPadding,
          ...(isWeb ? { maxWidth: 800, alignSelf: 'center' as const, width: '100%' } : {}),
        }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header with Actions */}
        <View style={{
          backgroundColor: white,
          borderRadius: radiusSm,
          padding: cardPadding,
          marginBottom: 16,
          ...shadowMd,
        }}>
          <View style={{
            flexDirection: isMobile ? 'column' : 'row',
            justifyContent: 'space-between',
            alignItems: isMobile ? 'stretch' : 'flex-start',
            gap: isMobile ? 12 : 0,
          }}>
            <View style={{
              flex: isMobile ? undefined : 1,
              marginRight: isMobile ? 0 : 12,
            }}>
              <Text style={{
                fontSize: fontSize2xl - 2,
                fontFamily: fontFamilyDisplay,
                color: textPrimary,
                marginBottom: 4,
              }}>Edit Recipe Draft</Text>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
              }}>
                <Text style={{
                  fontSize: fontSizeSm - 1,
                  fontFamily: fontFamilyBody,
                  color: textSecondary,
                }}>
                  Auto-save:{' '}
                  {autoSaveStatus === 'saved'
                    ? 'Saved'
                    : autoSaveStatus === 'saving'
                    ? 'Saving...'
                    : 'Error'}
                </Text>
                {lastSaved && (
                  <Text style={{
                    fontSize: fontSizeSm - 1,
                    fontFamily: fontFamilyBody,
                    color: textSecondary,
                  }}>
                    Last saved: {lastSaved.toLocaleTimeString()}
                  </Text>
                )}
              </View>
            </View>

            <View style={{
              flexDirection: 'row',
              gap: 8,
              ...(isMobile ? { justifyContent: 'flex-end' } : {}),
            }}>
              <Pressable
                style={({ pressed }) => [{
                  backgroundColor: bgCard,
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: 8,
                }, { opacity: pressed ? 0.7 : 1 }]}
                onPress={onCancel}
                accessibilityRole="button"
                accessibilityLabel="Cancel editing"
              >
                <Text style={{
                  color: textPrimary,
                  fontSize: fontSizeSm,
                  fontFamily: fontFamilyBodyMedium,
                }}>Cancel</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [{
                  backgroundColor: accentBlue,
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: 8,
                }, saving && { opacity: 0.5 }, { opacity: pressed ? 0.7 : 1 }]}
                disabled={saving}
                onPress={() => saveChanges(recipe)}
                accessibilityRole="button"
                accessibilityLabel={saving ? 'Saving recipe' : 'Save recipe now'}
              >
                <Text style={{
                  color: white,
                  fontSize: fontSizeSm,
                  fontFamily: fontFamilyBodyBold,
                }}>
                  {saving ? 'Saving...' : 'Save Now'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* Recipe Title */}
        <View style={{
          backgroundColor: white,
          borderRadius: radiusSm,
          padding: cardPadding,
          marginBottom: 16,
          ...shadowMd,
        }}>
          <Text style={{
            fontSize: fontSizeSm,
            fontFamily: fontFamilyBodyMedium,
            color: textPrimary,
            marginBottom: 6,
          }}>Recipe Title</Text>
          <TextInput
            style={{
              borderWidth: 1,
              borderColor: borderDefault,
              borderRadius: 8,
              paddingHorizontal: 12,
              paddingVertical: 10,
              fontSize: fontSizeBase - 1,
              fontFamily: fontFamilyBody,
              color: textPrimary,
              backgroundColor: white,
            }}
            value={recipe.title || ''}
            onChangeText={(text) => updateRecipe({ title: text })}
            placeholder="Enter recipe title"
            placeholderTextColor={textTertiary}
            accessibilityLabel="Recipe title"
          />
        </View>

        {/* Recipe Metadata */}
        <View style={{
          backgroundColor: white,
          borderRadius: radiusSm,
          padding: cardPadding,
          marginBottom: 16,
          ...shadowMd,
        }}>
          <Text style={{
            fontSize: fontSizeLg,
            fontFamily: fontFamilyBodyBold,
            color: textPrimary,
            marginBottom: 12,
          }}>Recipe Details</Text>

          <View style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: metadataGap,
          }}>
            <View style={{ width: '48%' }}>
              <Text style={{
                fontSize: fontSizeSm,
                fontFamily: fontFamilyBodyMedium,
                color: textPrimary,
                marginBottom: 6,
              }}>Servings</Text>
              <TextInput
                style={{
                  borderWidth: 1,
                  borderColor: borderDefault,
                  borderRadius: 8,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  fontSize: fontSizeBase - 1,
                  fontFamily: fontFamilyBody,
                  color: textPrimary,
                  backgroundColor: white,
                }}
                value={recipe.servings != null ? String(recipe.servings) : ''}
                onChangeText={(text) =>
                  updateRecipe({
                    servings: text ? parseInt(text) || undefined : undefined,
                  })
                }
                keyboardType="numeric"
                placeholder="4"
                placeholderTextColor={textTertiary}
              />
            </View>

            <View style={{ width: '48%' }}>
              <Text style={{
                fontSize: fontSizeSm,
                fontFamily: fontFamilyBodyMedium,
                color: textPrimary,
                marginBottom: 6,
              }}>Category</Text>
              <TextInput
                style={{
                  borderWidth: 1,
                  borderColor: borderDefault,
                  borderRadius: 8,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  fontSize: fontSizeBase - 1,
                  fontFamily: fontFamilyBody,
                  color: textPrimary,
                  backgroundColor: white,
                }}
                value={recipe.category || ''}
                onChangeText={(text) => updateRecipe({ category: text })}
                placeholder="Main dish, Dessert, etc."
                placeholderTextColor={textTertiary}
              />
            </View>

            <View style={{ width: '48%' }}>
              <Text style={{
                fontSize: fontSizeSm,
                fontFamily: fontFamilyBodyMedium,
                color: textPrimary,
                marginBottom: 6,
              }}>Prep Time (minutes)</Text>
              <TextInput
                style={{
                  borderWidth: 1,
                  borderColor: borderDefault,
                  borderRadius: 8,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  fontSize: fontSizeBase - 1,
                  fontFamily: fontFamilyBody,
                  color: textPrimary,
                  backgroundColor: white,
                }}
                value={
                  recipe.prepTimeMinutes != null
                    ? String(recipe.prepTimeMinutes)
                    : ''
                }
                onChangeText={(text) =>
                  updateRecipe({
                    prepTimeMinutes: text
                      ? parseInt(text) || undefined
                      : undefined,
                  })
                }
                keyboardType="numeric"
                placeholder="15"
                placeholderTextColor={textTertiary}
              />
            </View>

            <View style={{ width: '48%' }}>
              <Text style={{
                fontSize: fontSizeSm,
                fontFamily: fontFamilyBodyMedium,
                color: textPrimary,
                marginBottom: 6,
              }}>Cook Time (minutes)</Text>
              <TextInput
                style={{
                  borderWidth: 1,
                  borderColor: borderDefault,
                  borderRadius: 8,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  fontSize: fontSizeBase - 1,
                  fontFamily: fontFamilyBody,
                  color: textPrimary,
                  backgroundColor: white,
                }}
                value={
                  recipe.cookTimeMinutes != null
                    ? String(recipe.cookTimeMinutes)
                    : ''
                }
                onChangeText={(text) =>
                  updateRecipe({
                    cookTimeMinutes: text
                      ? parseInt(text) || undefined
                      : undefined,
                  })
                }
                keyboardType="numeric"
                placeholder="30"
                placeholderTextColor={textTertiary}
              />
            </View>
          </View>

          <View style={{ marginTop: 12 }}>
            <Text style={{
              fontSize: fontSizeSm,
              fontFamily: fontFamilyBodyMedium,
              color: textPrimary,
              marginBottom: 6,
            }}>Cuisine</Text>
            <TextInput
              style={{
                borderWidth: 1,
                borderColor: borderDefault,
                borderRadius: 8,
                paddingHorizontal: 12,
                paddingVertical: 10,
                fontSize: fontSizeBase - 1,
                fontFamily: fontFamilyBody,
                color: textPrimary,
                backgroundColor: white,
              }}
              value={recipe.cuisine || ''}
              onChangeText={(text) => updateRecipe({ cuisine: text })}
              placeholder="Italian, Mexican, etc."
              placeholderTextColor={textTertiary}
            />
          </View>
        </View>

        {/* Ingredients */}
        <View style={{
          backgroundColor: white,
          borderRadius: radiusSm,
          padding: cardPadding,
          marginBottom: 16,
          ...shadowMd,
        }}>
          <View style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 4,
          }}>
            <Text style={{
              fontSize: fontSizeLg,
              fontFamily: fontFamilyBodyBold,
              color: textPrimary,
              marginBottom: 12,
            }}>
              Ingredients ({recipe.ingredients?.length || 0})
            </Text>
          </View>

          <View style={{ gap: 12 }}>
            {recipe.ingredients?.map((ingredient, index) => (
              <View key={index} style={{
                borderWidth: 1,
                borderColor: borderDefault,
                borderRadius: 8,
                padding: 12,
              }}>
                <View style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 10,
                }}>
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                  }}>
                    <Pressable
                      onPress={() =>
                        moveIngredient(index, Math.max(0, index - 1))
                      }
                      disabled={index === 0}
                      style={({ pressed }) => [{
                        padding: 4,
                      },
                        index === 0 && { opacity: 0.3 },
                        { opacity: pressed ? 0.7 : 1 },
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={`Move ingredient ${index + 1} up`}
                    >
                      <Text style={{
                        fontSize: fontSizeBase,
                        fontFamily: fontFamilyBody,
                        color: textSecondary,
                      }}>↑</Text>
                    </Pressable>
                    <Pressable
                      onPress={() =>
                        moveIngredient(
                          index,
                          Math.min(recipe.ingredients!.length - 1, index + 1)
                        )
                      }
                      disabled={index === recipe.ingredients!.length - 1}
                      style={({ pressed }) => [{
                        padding: 4,
                      },
                        index === recipe.ingredients!.length - 1 &&
                          { opacity: 0.3 },
                        { opacity: pressed ? 0.7 : 1 },
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={`Move ingredient ${index + 1} down`}
                    >
                      <Text style={{
                        fontSize: fontSizeBase,
                        fontFamily: fontFamilyBody,
                        color: textSecondary,
                      }}>↓</Text>
                    </Pressable>
                    <Text style={{
                      fontSize: fontSizeSm - 1,
                      fontFamily: fontFamilyBodyMedium,
                      color: textPrimary,
                      marginLeft: 4,
                    }}>#{index + 1}</Text>
                  </View>
                  <Pressable
                    onPress={() => removeIngredient(index)}
                    style={({ pressed }) => [{ padding: 4 }, { opacity: pressed ? 0.7 : 1 }]}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ingredient ${index + 1}`}
                  >
                    <Text style={{
                      fontSize: fontSizeBase,
                      fontFamily: fontFamilyBody,
                      color: accentCoral,
                    }}>✕</Text>
                  </Pressable>
                </View>

                <View style={{
                  flexDirection: 'row',
                  gap: 8,
                }}>
                  <TextInput
                    style={{
                      flex: 1,
                      borderWidth: 1,
                      borderColor: borderDefault,
                      borderRadius: 6,
                      paddingHorizontal: 8,
                      paddingVertical: 8,
                      fontSize: fontSizeSm,
                      fontFamily: fontFamilyBody,
                      color: textPrimary,
                      backgroundColor: white,
                    }}
                    value={ingredient.amount || ''}
                    onChangeText={(text) =>
                      updateIngredient(index, { amount: text })
                    }
                    placeholder="Amt"
                    placeholderTextColor={textTertiary}
                  />
                  <TextInput
                    style={{
                      flex: 1,
                      borderWidth: 1,
                      borderColor: borderDefault,
                      borderRadius: 6,
                      paddingHorizontal: 8,
                      paddingVertical: 8,
                      fontSize: fontSizeSm,
                      fontFamily: fontFamilyBody,
                      color: textPrimary,
                      backgroundColor: white,
                    }}
                    value={ingredient.unit || ''}
                    onChangeText={(text) =>
                      updateIngredient(index, { unit: text })
                    }
                    placeholder="Unit"
                    placeholderTextColor={textTertiary}
                  />
                  <TextInput
                    style={{
                      flex: 2,
                      borderWidth: 1,
                      borderColor: borderDefault,
                      borderRadius: 6,
                      paddingHorizontal: 8,
                      paddingVertical: 8,
                      fontSize: fontSizeSm,
                      fontFamily: fontFamilyBody,
                      color: textPrimary,
                      backgroundColor: white,
                    }}
                    value={ingredient.name || ''}
                    onChangeText={(text) =>
                      updateIngredient(index, { name: text })
                    }
                    placeholder="Ingredient name"
                    placeholderTextColor={textTertiary}
                  />
                </View>

                {ingredient.preparation ? (
                  <View style={{ marginTop: 8 }}>
                    <TextInput
                      style={{
                        borderWidth: 1,
                        borderColor: borderDefault,
                        borderRadius: 6,
                        paddingHorizontal: 8,
                        paddingVertical: 8,
                        fontSize: fontSizeSm,
                        fontFamily: fontFamilyBody,
                        color: textPrimary,
                        backgroundColor: white,
                      }}
                      value={ingredient.preparation || ''}
                      onChangeText={(text) =>
                        updateIngredient(index, { preparation: text })
                      }
                      placeholder="Preparation notes (chopped, diced, etc.)"
                      placeholderTextColor={textTertiary}
                    />
                  </View>
                ) : null}
              </View>
            )) || (
              <Text style={{
                fontSize: fontSizeSm,
                fontFamily: fontFamilyBody,
                color: textTertiary,
                textAlign: 'center',
                paddingVertical: 16,
              }}>
                No ingredients yet. Tap "Add Ingredient" to start.
              </Text>
            )}
          </View>

          <Pressable
            style={({ pressed }) => [{
              backgroundColor: accentBlue,
              paddingHorizontal: 16,
              paddingVertical: 10,
              borderRadius: 8,
              alignItems: 'center' as const,
              marginTop: 12,
            }, { opacity: pressed ? 0.7 : 1 }]}
            onPress={addIngredient}
            accessibilityRole="button"
            accessibilityLabel="Add ingredient"
          >
            <Text style={{
              color: white,
              fontSize: fontSizeSm,
              fontFamily: fontFamilyBodyBold,
            }}>+ Add Ingredient</Text>
          </Pressable>
        </View>

        {/* Instructions */}
        <View style={{
          backgroundColor: white,
          borderRadius: radiusSm,
          padding: cardPadding,
          marginBottom: 16,
          ...shadowMd,
        }}>
          <View style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 4,
          }}>
            <Text style={{
              fontSize: fontSizeLg,
              fontFamily: fontFamilyBodyBold,
              color: textPrimary,
              marginBottom: 12,
            }}>
              Instructions ({recipe.instructions?.length || 0})
            </Text>
          </View>

          <View style={{ gap: 12 }}>
            {recipe.instructions?.map((instruction, index) => (
              <View key={index} style={{
                borderWidth: 1,
                borderColor: borderDefault,
                borderRadius: 8,
                padding: 12,
              }}>
                <View style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 10,
                }}>
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                  }}>
                    <Pressable
                      onPress={() =>
                        moveInstruction(index, Math.max(0, index - 1))
                      }
                      disabled={index === 0}
                      style={({ pressed }) => [{
                        padding: 4,
                      },
                        index === 0 && { opacity: 0.3 },
                        { opacity: pressed ? 0.7 : 1 },
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={`Move step ${index + 1} up`}
                    >
                      <Text style={{
                        fontSize: fontSizeBase,
                        fontFamily: fontFamilyBody,
                        color: textSecondary,
                      }}>↑</Text>
                    </Pressable>
                    <Pressable
                      onPress={() =>
                        moveInstruction(
                          index,
                          Math.min(
                            recipe.instructions!.length - 1,
                            index + 1
                          )
                        )
                      }
                      disabled={index === recipe.instructions!.length - 1}
                      style={({ pressed }) => [{
                        padding: 4,
                      },
                        index === recipe.instructions!.length - 1 &&
                          { opacity: 0.3 },
                        { opacity: pressed ? 0.7 : 1 },
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={`Move step ${index + 1} down`}
                    >
                      <Text style={{
                        fontSize: fontSizeBase,
                        fontFamily: fontFamilyBody,
                        color: textSecondary,
                      }}>↓</Text>
                    </Pressable>
                    <Text style={{
                      fontSize: fontSizeSm - 1,
                      fontFamily: fontFamilyBodyMedium,
                      color: textPrimary,
                      marginLeft: 4,
                    }}>Step {index + 1}</Text>
                  </View>
                  <Pressable
                    onPress={() => removeInstruction(index)}
                    style={({ pressed }) => [{ padding: 4 }, { opacity: pressed ? 0.7 : 1 }]}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove step ${index + 1}`}
                  >
                    <Text style={{
                      fontSize: fontSizeBase,
                      fontFamily: fontFamilyBody,
                      color: accentCoral,
                    }}>✕</Text>
                  </Pressable>
                </View>

                <TextInput
                  style={{
                    borderWidth: 1,
                    borderColor: borderDefault,
                    borderRadius: 8,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    fontSize: fontSizeBase - 1,
                    fontFamily: fontFamilyBody,
                    color: textPrimary,
                    backgroundColor: white,
                    minHeight: 80,
                    textAlignVertical: 'top',
                  }}
                  value={instruction}
                  onChangeText={(text) => updateInstruction(index, text)}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  placeholder="Enter instruction step..."
                  placeholderTextColor={textTertiary}
                />
              </View>
            )) || (
              <Text style={{
                fontSize: fontSizeSm,
                fontFamily: fontFamilyBody,
                color: textTertiary,
                textAlign: 'center',
                paddingVertical: 16,
              }}>
                No instructions yet. Tap "Add Step" to start.
              </Text>
            )}
          </View>

          <Pressable
            style={({ pressed }) => [{
              backgroundColor: accentBlue,
              paddingHorizontal: 16,
              paddingVertical: 10,
              borderRadius: 8,
              alignItems: 'center' as const,
              marginTop: 12,
            }, { opacity: pressed ? 0.7 : 1 }]}
            onPress={addInstruction}
            accessibilityRole="button"
            accessibilityLabel="Add instruction step"
          >
            <Text style={{
              color: white,
              fontSize: fontSizeSm,
              fontFamily: fontFamilyBodyBold,
            }}>+ Add Step</Text>
          </Pressable>
        </View>

        {/* Draft Management */}
        <View style={{ marginBottom: 16 }}>
          <DraftManager
            draft={draft}
            onDraftUpdated={setDraft}
            onConverted={handleDraftConverted}
            onDiscarded={handleDraftDiscarded}
          />
        </View>

        {/* Notes */}
        {recipe.notes && recipe.notes.length > 0 && (
          <View style={{
            backgroundColor: white,
            borderRadius: radiusSm,
            padding: cardPadding,
            marginBottom: 16,
            ...shadowMd,
          }}>
            <Text style={{
              fontSize: fontSizeLg,
              fontFamily: fontFamilyBodyBold,
              color: textPrimary,
              marginBottom: 12,
            }}>Notes</Text>
            <View style={{ gap: 8 }}>
              {recipe.notes.map((note, index) => (
                <View key={index} style={{
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  gap: 8,
                }}>
                  <Text style={{
                    fontSize: fontSizeSm,
                    fontFamily: fontFamilyBody,
                    color: textTertiary,
                  }}>&#8226;</Text>
                  <Text style={{
                    fontSize: fontSizeSm,
                    fontFamily: fontFamilyBody,
                    color: textPrimary,
                    flex: 1,
                  }}>{note}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
