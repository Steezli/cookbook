import React, { useRef, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TextInput as TextInputType,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Camera, ChevronDown, ChevronUp, X } from 'lucide-react-native';
import { showAlert } from '@/lib/alert';
import { PageContainer } from '@/components/nav/PageContainer';
import { deleteRecipePhoto, type RecipePhoto } from '@/features/recipes/photos';
import { parseIngredient } from '@/features/units/parser';
import type { CreateRecipeInput, RecipeIngredient, RecipeVisibility } from '@/features/recipes/types';
import {
  accentBlue,
  accentCoral,
  bgCard,
  borderDefault,
  errorText,
  fontFamilyBody,
  fontFamilyBodyBold,
  fontFamilyBodyMedium,
  fontFamilyDisplay,
  fontSizeBase,
  fontSizeSm,
  fontSizeXs,
  radiusMd,
  radiusPill,
  radiusSm,
  textPrimary,
  textSecondary,
  white,
} from '@/lib/tokens';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PendingPhoto = {
  uri: string;
  name: string;
  type: string;
};

export type RecipeFormProps = {
  initialValues?: Partial<CreateRecipeInput>;
  existingPhotos?: RecipePhoto[];
  recipeId?: string;
  onSubmit: (input: CreateRecipeInput, newPhotos: PendingPhoto[]) => Promise<void>;
  submitLabel: string;
  isSubmitting: boolean;
};

type IngredientItem = {
  text: string;
  parsed?: ReturnType<typeof parseIngredient>;
  confirmed?: boolean;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function moveItem<T>(arr: T[], fromIndex: number, direction: 'up' | 'down'): T[] {
  const toIndex = direction === 'up' ? fromIndex - 1 : fromIndex + 1;
  if (toIndex < 0 || toIndex >= arr.length) return arr;
  const result = [...arr];
  [result[fromIndex], result[toIndex]] = [result[toIndex], result[fromIndex]];
  return result;
}

// ---------------------------------------------------------------------------
// RecipeForm
// ---------------------------------------------------------------------------

export function RecipeForm({
  initialValues,
  existingPhotos: initialExistingPhotos = [],
  recipeId,
  onSubmit,
  submitLabel,
  isSubmitting,
}: RecipeFormProps) {
  // Refs for focus chaining
  const descriptionRef = useRef<TextInputType>(null);

  // Photo state
  const [existingPhotos, setExistingPhotos] = useState<RecipePhoto[]>(initialExistingPhotos);
  const [newPhotos, setNewPhotos] = useState<PendingPhoto[]>([]);

  // Core fields
  const [title, setTitle] = useState(initialValues?.title ?? '');
  const [description, setDescription] = useState(initialValues?.description ?? '');

  // Ingredients
  const [ingredients, setIngredients] = useState<IngredientItem[]>(
    initialValues?.ingredients?.map(i => ({ text: i.text, confirmed: !!(i.amount !== undefined && i.unit !== undefined) })) ?? []
  );
  const [ingredientInput, setIngredientInput] = useState('');
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkText, setBulkText] = useState('');

  // Steps
  const [steps, setSteps] = useState<string[]>(
    initialValues?.steps?.map(s => s.text) ?? []
  );
  const [stepInput, setStepInput] = useState('');

  // Metadata
  const [servings, setServings] = useState(
    initialValues?.servings != null ? String(initialValues.servings) : ''
  );
  const [prepTime, setPrepTime] = useState(
    initialValues?.prep_time_minutes != null ? String(initialValues.prep_time_minutes) : ''
  );
  const [cookTime, setCookTime] = useState(
    initialValues?.cook_time_minutes != null ? String(initialValues.cook_time_minutes) : ''
  );

  // Visibility
  const [visibility, setVisibility] = useState<RecipeVisibility>(
    initialValues?.visibility ?? 'private'
  );

  // Story & Tags
  const [sourceStory, setSourceStory] = useState(initialValues?.source_story ?? '');
  const [tags, setTags] = useState<string[]>(initialValues?.tags ?? []);
  const [tagInput, setTagInput] = useState('');

  // -------------------------------------------------------------------------
  // Photo handlers
  // -------------------------------------------------------------------------

  async function pickPhoto() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showAlert('Permission Required', 'Camera roll permission is needed to add photos');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: false,
      quality: 0.8,
      allowsEditing: true,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setNewPhotos(prev => [
        ...prev,
        {
          uri: asset.uri,
          name: asset.fileName || `photo-${Date.now()}.jpg`,
          type: (asset.type as string) || 'image/jpeg',
        },
      ]);
    }
  }

  function removeNewPhoto(index: number) {
    setNewPhotos(prev => prev.filter((_, i) => i !== index));
  }

  async function removeExistingPhoto(photoId: string) {
    try {
      await deleteRecipePhoto(photoId);
      setExistingPhotos(prev => prev.filter(p => p.id !== photoId));
    } catch (err: any) {
      showAlert('Error', err.message ?? 'Failed to delete photo');
    }
  }

  // -------------------------------------------------------------------------
  // Ingredient handlers
  // -------------------------------------------------------------------------

  function addIngredient() {
    const text = ingredientInput.trim();
    if (!text) return;
    const parsed = parseIngredient(text);
    setIngredients(prev => [...prev, { text, parsed }]);
    setIngredientInput('');
  }

  function addBulkIngredients() {
    const lines = bulkText
      .split('\n')
      .map(l => l.trim())
      .filter(Boolean);
    if (lines.length === 0) return;
    const items: IngredientItem[] = lines.map(text => ({
      text,
      parsed: parseIngredient(text),
    }));
    setIngredients(prev => [...prev, ...items]);
    setBulkText('');
    setBulkMode(false);
  }

  function removeIngredient(index: number) {
    setIngredients(prev => prev.filter((_, i) => i !== index));
  }

  function moveIngredient(index: number, direction: 'up' | 'down') {
    setIngredients(prev => moveItem(prev, index, direction));
  }

  // -------------------------------------------------------------------------
  // Step handlers
  // -------------------------------------------------------------------------

  function addStep() {
    const text = stepInput.trim();
    if (!text) return;
    setSteps(prev => [...prev, text]);
    setStepInput('');
  }

  function removeStep(index: number) {
    setSteps(prev => prev.filter((_, i) => i !== index));
  }

  function moveStep(index: number, direction: 'up' | 'down') {
    setSteps(prev => moveItem(prev, index, direction));
  }

  // -------------------------------------------------------------------------
  // Tag handlers
  // -------------------------------------------------------------------------

  function addTag() {
    const text = tagInput.trim().toLowerCase();
    if (!text || tags.includes(text)) return;
    setTags(prev => [...prev, text]);
    setTagInput('');
  }

  function removeTag(tag: string) {
    setTags(prev => prev.filter(t => t !== tag));
  }

  // -------------------------------------------------------------------------
  // Submit
  // -------------------------------------------------------------------------

  async function handleSubmit() {
    if (!title.trim()) {
      showAlert('Validation', 'Title is required');
      return;
    }
    if (ingredients.length < 2) {
      showAlert('Validation', 'At least 2 ingredients are required');
      return;
    }
    if (steps.length < 1) {
      showAlert('Validation', 'At least 1 step is required');
      return;
    }

    const recipeIngredients: RecipeIngredient[] = ingredients.map((ing, i) => {
      const base = { text: ing.text, sort_order: i };
      if (ing.parsed) {
        return {
          ...base,
          amount: ing.parsed.amount,
          unit: ing.parsed.unit,
          original_text: ing.parsed.original,
          is_ambiguous: ing.parsed.isAmbiguous,
        };
      }
      return base;
    });

    const input: CreateRecipeInput = {
      title: title.trim(),
      description: description.trim() || undefined,
      ingredients: recipeIngredients,
      steps: steps.map((text, i) => ({ text, sort_order: i })),
      visibility,
      servings: servings ? parseInt(servings, 10) : undefined,
      prep_time_minutes: prepTime ? parseInt(prepTime, 10) : undefined,
      cook_time_minutes: cookTime ? parseInt(cookTime, 10) : undefined,
      source_story: sourceStory.trim() || undefined,
      tags: tags.length > 0 ? tags : undefined,
    };

    await onSubmit(input, newPhotos);
  }

  const isDisabled = isSubmitting || !title.trim() || ingredients.length < 2 || steps.length < 1;
  const allPhotos = [
    ...existingPhotos.map(p => ({ id: p.id, uri: null as null, storagePath: p.storage_path })),
  ];

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <PageContainer variant="form">
      <ScrollView
        contentContainerStyle={{ paddingVertical: 24, gap: 24 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Section 1: Photo Upload */}
        <View>
          <Text style={labelStyle}>Photos</Text>

          {/* Upload area */}
          <Pressable
            onPress={pickPhoto}
            style={{
              height: 200,
              borderWidth: 2,
              borderStyle: 'dashed',
              borderColor: borderDefault,
              borderRadius: radiusMd,
              backgroundColor: bgCard,
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <Camera size={32} color={textSecondary} />
            <Text
              style={{
                fontFamily: fontFamilyBodyMedium,
                fontSize: fontSizeSm,
                color: textSecondary,
              }}
            >
              Add Photos
            </Text>
          </Pressable>

          {/* Photo thumbnails */}
          {(existingPhotos.length > 0 || newPhotos.length > 0) && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingTop: 12 }}
            >
              {existingPhotos.map(photo => (
                <View key={photo.id} style={thumbnailContainerStyle}>
                  <Image
                    source={{ uri: `${photo.storage_path}` }}
                    style={thumbnailStyle}
                  />
                  <Pressable
                    style={deleteBadgeStyle}
                    onPress={() => removeExistingPhoto(photo.id)}
                  >
                    <X size={10} color={white} />
                  </Pressable>
                </View>
              ))}
              {newPhotos.map((photo, i) => (
                <View key={i} style={thumbnailContainerStyle}>
                  <Image source={{ uri: photo.uri }} style={thumbnailStyle} />
                  <Pressable
                    style={deleteBadgeStyle}
                    onPress={() => removeNewPhoto(i)}
                  >
                    <X size={10} color={white} />
                  </Pressable>
                </View>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Section 2: Title * */}
        <View>
          <Text style={labelStyle}>Title<Text style={requiredStyle}> *</Text></Text>
          <TextInput
            style={inputStyle}
            value={title}
            onChangeText={setTitle}
            placeholder="e.g., Grandma's Chocolate Chip Cookies"
            placeholderTextColor={textSecondary}
            returnKeyType="next"
            onSubmitEditing={() => descriptionRef.current?.focus()}
          />
        </View>

        {/* Section 3: Description */}
        <View>
          <Text style={labelStyle}>Description</Text>
          <TextInput
            ref={descriptionRef}
            style={[inputStyle, { height: 80, textAlignVertical: 'top' }]}
            value={description}
            onChangeText={setDescription}
            placeholder="Brief description"
            placeholderTextColor={textSecondary}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Section 4: Ingredients */}
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <Text style={sectionLabelStyle}>
              Ingredients<Text style={requiredStyle}> *</Text> {ingredients.length > 0 ? `(${ingredients.length})` : ''}
            </Text>
            <Pressable
              onPress={() => setBulkMode(m => !m)}
              style={{ marginLeft: 'auto' }}
            >
              <Text
                style={{
                  fontFamily: fontFamilyBodyMedium,
                  fontSize: fontSizeSm,
                  color: accentBlue,
                }}
              >
                {bulkMode ? 'Single add' : 'Bulk add'}
              </Text>
            </Pressable>
          </View>

          {bulkMode ? (
            <View style={{ gap: 8 }}>
              <TextInput
                style={[inputStyle, { height: 120, textAlignVertical: 'top' }]}
                value={bulkText}
                onChangeText={setBulkText}
                placeholder="Paste ingredients, one per line"
                placeholderTextColor={textSecondary}
                multiline
              />
              <Pressable style={addButtonStyle} onPress={addBulkIngredients}>
                <Text style={addButtonTextStyle}>Add All</Text>
              </Pressable>
            </View>
          ) : (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TextInput
                style={[inputStyle, { flex: 1 }]}
                value={ingredientInput}
                onChangeText={setIngredientInput}
                placeholder="e.g., 2 cups flour"
                placeholderTextColor={textSecondary}
                onSubmitEditing={addIngredient}
                returnKeyType="done"
              />
              <Pressable style={addButtonStyle} onPress={addIngredient}>
                <Text style={addButtonTextStyle}>Add</Text>
              </Pressable>
            </View>
          )}

          {ingredients.map((ing, i) => (
            <View
              key={i}
              style={listItemStyle}
            >
              <Text style={{ fontFamily: fontFamilyBody, fontSize: fontSizeBase, flex: 1, color: textPrimary }}>
                {ing.text}
              </Text>
              <View style={{ flexDirection: 'row', gap: 4 }}>
                <Pressable
                  onPress={() => moveIngredient(i, 'up')}
                  disabled={i === 0}
                  style={{ opacity: i === 0 ? 0.3 : 1 }}
                >
                  <ChevronUp size={18} color={textSecondary} />
                </Pressable>
                <Pressable
                  onPress={() => moveIngredient(i, 'down')}
                  disabled={i === ingredients.length - 1}
                  style={{ opacity: i === ingredients.length - 1 ? 0.3 : 1 }}
                >
                  <ChevronDown size={18} color={textSecondary} />
                </Pressable>
                <Pressable onPress={() => removeIngredient(i)}>
                  <X size={18} color={accentCoral} />
                </Pressable>
              </View>
            </View>
          ))}
        </View>

        {/* Section 5: Steps */}
        <View>
          <Text style={sectionLabelStyle}>
            Steps<Text style={requiredStyle}> *</Text> {steps.length > 0 ? `(${steps.length})` : ''}
          </Text>

          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
            <TextInput
              style={[inputStyle, { flex: 1 }]}
              value={stepInput}
              onChangeText={setStepInput}
              placeholder="Describe this step"
              placeholderTextColor={textSecondary}
              onSubmitEditing={addStep}
              returnKeyType="done"
            />
            <Pressable style={addButtonStyle} onPress={addStep}>
              <Text style={addButtonTextStyle}>Add</Text>
            </Pressable>
          </View>

          {steps.map((step, i) => (
            <View key={i} style={listItemStyle}>
              <Text
                style={{
                  fontFamily: fontFamilyBodyMedium,
                  fontSize: fontSizeSm,
                  color: accentBlue,
                  marginRight: 8,
                  minWidth: 20,
                }}
              >
                {i + 1}.
              </Text>
              <Text style={{ fontFamily: fontFamilyBody, fontSize: fontSizeBase, flex: 1, color: textPrimary }}>
                {step}
              </Text>
              <View style={{ flexDirection: 'row', gap: 4 }}>
                <Pressable
                  onPress={() => moveStep(i, 'up')}
                  disabled={i === 0}
                  style={{ opacity: i === 0 ? 0.3 : 1 }}
                >
                  <ChevronUp size={18} color={textSecondary} />
                </Pressable>
                <Pressable
                  onPress={() => moveStep(i, 'down')}
                  disabled={i === steps.length - 1}
                  style={{ opacity: i === steps.length - 1 ? 0.3 : 1 }}
                >
                  <ChevronDown size={18} color={textSecondary} />
                </Pressable>
                <Pressable onPress={() => removeStep(i)}>
                  <X size={18} color={accentCoral} />
                </Pressable>
              </View>
            </View>
          ))}
        </View>

        {/* Section 6: Metadata */}
        <View>
          <Text style={sectionLabelStyle}>Details</Text>
          <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
            <View style={{ flex: 1, minWidth: 100 }}>
              <Text style={labelStyle}>Prep (min)</Text>
              <TextInput
                style={inputStyle}
                value={prepTime}
                onChangeText={setPrepTime}
                placeholder="15"
                placeholderTextColor={textSecondary}
                keyboardType="numeric"
              />
            </View>
            <View style={{ flex: 1, minWidth: 100 }}>
              <Text style={labelStyle}>Cook (min)</Text>
              <TextInput
                style={inputStyle}
                value={cookTime}
                onChangeText={setCookTime}
                placeholder="30"
                placeholderTextColor={textSecondary}
                keyboardType="numeric"
              />
            </View>
            <View style={{ flex: 1, minWidth: 100 }}>
              <Text style={labelStyle}>Servings</Text>
              <TextInput
                style={inputStyle}
                value={servings}
                onChangeText={setServings}
                placeholder="4"
                placeholderTextColor={textSecondary}
                keyboardType="numeric"
              />
            </View>
          </View>
        </View>

        {/* Section 7: Visibility * */}
        <View>
          <Text style={sectionLabelStyle}>Visibility<Text style={requiredStyle}> *</Text></Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {(['private', 'family', 'public'] as RecipeVisibility[]).map(v => (
              <Pressable
                key={v}
                onPress={() => setVisibility(v)}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: radiusPill,
                  backgroundColor: visibility === v ? accentBlue : bgCard,
                  borderWidth: 1,
                  borderColor: visibility === v ? accentBlue : borderDefault,
                }}
              >
                <Text
                  style={{
                    fontFamily: fontFamilyBodyMedium,
                    fontSize: fontSizeSm,
                    color: visibility === v ? white : textSecondary,
                    textTransform: 'capitalize',
                  }}
                >
                  {v}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Section 8: Story */}
        <View>
          <Text style={sectionLabelStyle}>Story / Source</Text>
          <TextInput
            style={[inputStyle, { height: 100, textAlignVertical: 'top' }]}
            value={sourceStory}
            onChangeText={setSourceStory}
            placeholder="Where did this recipe come from?"
            placeholderTextColor={textSecondary}
            multiline
            numberOfLines={4}
          />
        </View>

        {/* Section 9: Tags */}
        <View>
          <Text style={sectionLabelStyle}>Tags</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
            <TextInput
              style={[inputStyle, { flex: 1 }]}
              value={tagInput}
              onChangeText={setTagInput}
              placeholder="e.g., dessert"
              placeholderTextColor={textSecondary}
              onSubmitEditing={addTag}
              returnKeyType="done"
              autoCapitalize="none"
            />
            <Pressable style={addButtonStyle} onPress={addTag}>
              <Text style={addButtonTextStyle}>Add</Text>
            </Pressable>
          </View>
          {tags.length > 0 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {tags.map(tag => (
                <View
                  key={tag}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                    backgroundColor: bgCard,
                    borderRadius: radiusPill,
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderWidth: 1,
                    borderColor: borderDefault,
                  }}
                >
                  <Text style={{ fontFamily: fontFamilyBody, fontSize: fontSizeSm, color: textPrimary }}>
                    {tag}
                  </Text>
                  <Pressable onPress={() => removeTag(tag)}>
                    <X size={12} color={textSecondary} />
                  </Pressable>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Submit */}
        <Pressable
          onPress={handleSubmit}
          disabled={isDisabled}
          style={{
            backgroundColor: accentBlue,
            padding: 16,
            borderRadius: radiusMd,
            alignItems: 'center',
            opacity: isDisabled ? 0.5 : 1,
            marginBottom: 32,
          }}
        >
          <Text
            style={{
              fontFamily: fontFamilyBodyBold,
              fontSize: fontSizeBase,
              color: white,
            }}
          >
            {isSubmitting ? 'Saving...' : submitLabel}
          </Text>
        </Pressable>
      </ScrollView>
    </PageContainer>
  );
}

// ---------------------------------------------------------------------------
// Shared style constants (not StyleSheet.create — keeps values readable)
// ---------------------------------------------------------------------------

const requiredStyle = {
  color: errorText,
  fontFamily: fontFamilyBody,
} as const;

const labelStyle = {
  fontFamily: fontFamilyBodyMedium,
  fontSize: fontSizeSm,
  color: textSecondary,
  marginBottom: 6,
} as const;

const sectionLabelStyle = {
  fontFamily: fontFamilyDisplay,
  fontSize: fontSizeBase,
  color: textPrimary,
  marginBottom: 8,
} as const;

const inputStyle = {
  backgroundColor: bgCard,
  borderWidth: 1,
  borderColor: borderDefault,
  borderRadius: radiusMd,
  padding: 12,
  fontSize: fontSizeBase,
  fontFamily: fontFamilyBody,
  color: textPrimary,
} as const;

const addButtonStyle = {
  backgroundColor: accentBlue,
  paddingHorizontal: 16,
  paddingVertical: 12,
  borderRadius: radiusMd,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
};

const addButtonTextStyle = {
  fontFamily: fontFamilyBodyMedium,
  fontSize: fontSizeSm,
  color: white,
} as const;

const listItemStyle = {
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  gap: 8,
  paddingVertical: 10,
  paddingHorizontal: 12,
  backgroundColor: bgCard,
  borderRadius: radiusMd,
  borderWidth: 1,
  borderColor: borderDefault,
  marginBottom: 6,
};

const thumbnailContainerStyle = {
  width: 80,
  height: 80,
  position: 'relative' as const,
};

const thumbnailStyle = {
  width: 80,
  height: 80,
  borderRadius: radiusSm,
};

const deleteBadgeStyle = {
  position: 'absolute' as const,
  top: 4,
  right: 4,
  backgroundColor: 'rgba(0,0,0,0.6)',
  borderRadius: radiusPill,
  width: 20,
  height: 20,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
};
