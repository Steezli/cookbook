import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { router } from 'expo-router';
import { ScanDraft, scanDraftService } from '@/lib/scan/scan-draft-service';
import { ParsedRecipe, ParsedIngredient } from '@/lib/ai/recipe-parsing-service';
import { DraftReview } from './DraftReview';
import { DraftManager } from './DraftManager';
import { useSession } from "@/features/auth/session";

interface DraftEditorProps {
  draftId: string;
  onSave?: (draft: ScanDraft) => void;
  onCancel?: () => void;
}

interface EditHistory {
  recipe: ParsedRecipe;
  timestamp: number;
}

export function DraftEditor({ draftId, onSave, onCancel }: DraftEditorProps) {
  const { session, isLoading: authLoading } = useSession();
  const [draft, setDraft] = useState<ScanDraft | null>(null);
  const [recipe, setRecipe] = useState<ParsedRecipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<EditHistory[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');

  // Load draft on mount
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
        setRecipe(draftData.recipe);
        setHistory([{ recipe: draftData.recipe, timestamp: Date.now() }]);
        setHistoryIndex(0);
        setLastSaved(new Date());
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
  }, [draftId, session]);

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
      console.error('Failed to save draft:', err);
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
    router.replace(`/recipes/${recipeId}`);
  }, []);

  const handleDraftDiscarded = useCallback(() => {
    router.replace('/(scan)');
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
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  if (!session) {
    return (
      <View style={styles.centerContainer}>
        <View style={styles.warningCard}>
          <Text style={styles.warningTitle}>Authentication Required</Text>
          <Text style={styles.warningText}>Please log in to edit drafts</Text>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  if (error || !draft || !recipe) {
    return (
      <View style={styles.centerContainer}>
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>Error Loading Draft</Text>
          <Text style={styles.errorText}>{error || 'Draft not found'}</Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex1}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header with Actions */}
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <Text style={styles.heading}>Edit Recipe Draft</Text>
              <View style={styles.autoSaveRow}>
                <Text style={styles.autoSaveText}>
                  Auto-save:{' '}
                  {autoSaveStatus === 'saved'
                    ? 'Saved'
                    : autoSaveStatus === 'saving'
                    ? 'Saving...'
                    : 'Error'}
                </Text>
                {lastSaved && (
                  <Text style={styles.lastSavedText}>
                    Last saved: {lastSaved.toLocaleTimeString()}
                  </Text>
                )}
              </View>
            </View>

            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.buttonSecondary}
                onPress={onCancel}
              >
                <Text style={styles.buttonSecondaryText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.buttonPrimary, saving && styles.buttonDisabled]}
                disabled={saving}
                onPress={() => saveChanges(recipe)}
              >
                <Text style={styles.buttonPrimaryText}>
                  {saving ? 'Saving...' : 'Save Now'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Recipe Title */}
        <View style={styles.card}>
          <Text style={styles.label}>Recipe Title</Text>
          <TextInput
            style={styles.textInput}
            value={recipe.title || ''}
            onChangeText={(text) => updateRecipe({ title: text })}
            placeholder="Enter recipe title"
            placeholderTextColor="#9ca3af"
          />
        </View>

        {/* Recipe Metadata */}
        <View style={styles.card}>
          <Text style={styles.sectionHeading}>Recipe Details</Text>

          <View style={styles.metadataGrid}>
            <View style={styles.metadataHalf}>
              <Text style={styles.label}>Servings</Text>
              <TextInput
                style={styles.textInput}
                value={recipe.servings != null ? String(recipe.servings) : ''}
                onChangeText={(text) =>
                  updateRecipe({
                    servings: text ? parseInt(text) || undefined : undefined,
                  })
                }
                keyboardType="numeric"
                placeholder="4"
                placeholderTextColor="#9ca3af"
              />
            </View>

            <View style={styles.metadataHalf}>
              <Text style={styles.label}>Category</Text>
              <TextInput
                style={styles.textInput}
                value={recipe.category || ''}
                onChangeText={(text) => updateRecipe({ category: text })}
                placeholder="Main dish, Dessert, etc."
                placeholderTextColor="#9ca3af"
              />
            </View>

            <View style={styles.metadataHalf}>
              <Text style={styles.label}>Prep Time (minutes)</Text>
              <TextInput
                style={styles.textInput}
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
                placeholderTextColor="#9ca3af"
              />
            </View>

            <View style={styles.metadataHalf}>
              <Text style={styles.label}>Cook Time (minutes)</Text>
              <TextInput
                style={styles.textInput}
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
                placeholderTextColor="#9ca3af"
              />
            </View>
          </View>

          <View style={styles.cuisineContainer}>
            <Text style={styles.label}>Cuisine</Text>
            <TextInput
              style={styles.textInput}
              value={recipe.cuisine || ''}
              onChangeText={(text) => updateRecipe({ cuisine: text })}
              placeholder="Italian, Mexican, etc."
              placeholderTextColor="#9ca3af"
            />
          </View>
        </View>

        {/* Ingredients */}
        <View style={styles.card}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeading}>
              Ingredients ({recipe.ingredients?.length || 0})
            </Text>
          </View>

          <View style={styles.listContainer}>
            {recipe.ingredients?.map((ingredient, index) => (
              <View key={index} style={styles.itemCard}>
                <View style={styles.itemHeaderRow}>
                  <View style={styles.itemControls}>
                    <TouchableOpacity
                      onPress={() =>
                        moveIngredient(index, Math.max(0, index - 1))
                      }
                      disabled={index === 0}
                      style={[
                        styles.controlButton,
                        index === 0 && styles.controlButtonDisabled,
                      ]}
                    >
                      <Text style={styles.controlButtonText}>↑</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() =>
                        moveIngredient(
                          index,
                          Math.min(recipe.ingredients!.length - 1, index + 1)
                        )
                      }
                      disabled={index === recipe.ingredients!.length - 1}
                      style={[
                        styles.controlButton,
                        index === recipe.ingredients!.length - 1 &&
                          styles.controlButtonDisabled,
                      ]}
                    >
                      <Text style={styles.controlButtonText}>↓</Text>
                    </TouchableOpacity>
                    <Text style={styles.itemNumber}>#{index + 1}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => removeIngredient(index)}
                    style={styles.deleteButton}
                  >
                    <Text style={styles.deleteButtonText}>✕</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.ingredientRow}>
                  <TextInput
                    style={[styles.ingredientInput, styles.ingredientAmount]}
                    value={ingredient.amount || ''}
                    onChangeText={(text) =>
                      updateIngredient(index, { amount: text })
                    }
                    placeholder="Amt"
                    placeholderTextColor="#9ca3af"
                  />
                  <TextInput
                    style={[styles.ingredientInput, styles.ingredientUnit]}
                    value={ingredient.unit || ''}
                    onChangeText={(text) =>
                      updateIngredient(index, { unit: text })
                    }
                    placeholder="Unit"
                    placeholderTextColor="#9ca3af"
                  />
                  <TextInput
                    style={[styles.ingredientInput, styles.ingredientName]}
                    value={ingredient.name || ''}
                    onChangeText={(text) =>
                      updateIngredient(index, { name: text })
                    }
                    placeholder="Ingredient name"
                    placeholderTextColor="#9ca3af"
                  />
                </View>

                {ingredient.preparation ? (
                  <View style={styles.preparationContainer}>
                    <TextInput
                      style={styles.ingredientInput}
                      value={ingredient.preparation || ''}
                      onChangeText={(text) =>
                        updateIngredient(index, { preparation: text })
                      }
                      placeholder="Preparation notes (chopped, diced, etc.)"
                      placeholderTextColor="#9ca3af"
                    />
                  </View>
                ) : null}
              </View>
            )) || (
              <Text style={styles.emptyText}>
                No ingredients yet. Tap "Add Ingredient" to start.
              </Text>
            )}
          </View>

          <TouchableOpacity
            style={styles.addButton}
            onPress={addIngredient}
          >
            <Text style={styles.addButtonText}>+ Add Ingredient</Text>
          </TouchableOpacity>
        </View>

        {/* Instructions */}
        <View style={styles.card}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeading}>
              Instructions ({recipe.instructions?.length || 0})
            </Text>
          </View>

          <View style={styles.listContainer}>
            {recipe.instructions?.map((instruction, index) => (
              <View key={index} style={styles.itemCard}>
                <View style={styles.itemHeaderRow}>
                  <View style={styles.itemControls}>
                    <TouchableOpacity
                      onPress={() =>
                        moveInstruction(index, Math.max(0, index - 1))
                      }
                      disabled={index === 0}
                      style={[
                        styles.controlButton,
                        index === 0 && styles.controlButtonDisabled,
                      ]}
                    >
                      <Text style={styles.controlButtonText}>↑</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
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
                      style={[
                        styles.controlButton,
                        index === recipe.instructions!.length - 1 &&
                          styles.controlButtonDisabled,
                      ]}
                    >
                      <Text style={styles.controlButtonText}>↓</Text>
                    </TouchableOpacity>
                    <Text style={styles.itemNumber}>Step {index + 1}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => removeInstruction(index)}
                    style={styles.deleteButton}
                  >
                    <Text style={styles.deleteButtonText}>✕</Text>
                  </TouchableOpacity>
                </View>

                <TextInput
                  style={[styles.textInput, styles.multilineInput]}
                  value={instruction}
                  onChangeText={(text) => updateInstruction(index, text)}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  placeholder="Enter instruction step..."
                  placeholderTextColor="#9ca3af"
                />
              </View>
            )) || (
              <Text style={styles.emptyText}>
                No instructions yet. Tap "Add Step" to start.
              </Text>
            )}
          </View>

          <TouchableOpacity
            style={styles.addButton}
            onPress={addInstruction}
          >
            <Text style={styles.addButtonText}>+ Add Step</Text>
          </TouchableOpacity>
        </View>

        {/* Draft Management */}
        <View style={styles.draftManagerContainer}>
          <DraftManager
            draft={draft}
            onDraftUpdated={setDraft}
            onConverted={handleDraftConverted}
            onDiscarded={handleDraftDiscarded}
          />
        </View>

        {/* Notes */}
        {recipe.notes && recipe.notes.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionHeading}>Notes</Text>
            <View style={styles.notesList}>
              {recipe.notes.map((note, index) => (
                <View key={index} style={styles.noteRow}>
                  <Text style={styles.noteBullet}>&#8226;</Text>
                  <Text style={styles.noteText}>{note}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex1: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  contentContainer: {
    padding: 16,
  },
  centerContainer: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  heading: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  sectionHeading: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {
    flex: 1,
    marginRight: 12,
  },
  autoSaveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  autoSaveText: {
    fontSize: 13,
    color: '#6b7280',
  },
  lastSavedText: {
    fontSize: 13,
    color: '#6b7280',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  buttonPrimary: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  buttonPrimaryText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  buttonSecondary: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  buttonSecondaryText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '500',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  metadataGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metadataHalf: {
    width: '48%',
  },
  cuisineContainer: {
    marginTop: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  listContainer: {
    gap: 12,
  },
  itemCard: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
  },
  itemHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  itemControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  controlButton: {
    padding: 4,
  },
  controlButtonDisabled: {
    opacity: 0.3,
  },
  controlButtonText: {
    fontSize: 16,
    color: '#6b7280',
  },
  itemNumber: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
    marginLeft: 4,
  },
  deleteButton: {
    padding: 4,
  },
  deleteButtonText: {
    fontSize: 16,
    color: '#ef4444',
  },
  ingredientRow: {
    flexDirection: 'row',
    gap: 8,
  },
  ingredientInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 8,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#ffffff',
  },
  ingredientAmount: {
    flex: 1,
  },
  ingredientUnit: {
    flex: 1,
  },
  ingredientName: {
    flex: 2,
  },
  preparationContainer: {
    marginTop: 8,
  },
  addButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  addButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    paddingVertical: 16,
  },
  draftManagerContainer: {
    marginBottom: 16,
  },
  notesList: {
    gap: 8,
  },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  noteBullet: {
    fontSize: 14,
    color: '#9ca3af',
  },
  noteText: {
    fontSize: 14,
    color: '#111827',
    flex: 1,
  },
  warningCard: {
    backgroundColor: '#fefce8',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    maxWidth: 400,
  },
  warningTitle: {
    fontSize: 18,
    fontWeight: '500',
    color: '#92400e',
    marginBottom: 8,
  },
  warningText: {
    fontSize: 15,
    color: '#a16207',
  },
  errorCard: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    maxWidth: 400,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '500',
    color: '#991b1b',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 15,
    color: '#dc2626',
  },
});
