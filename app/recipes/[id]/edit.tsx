import { router, Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { 
  ActivityIndicator,
  Alert, 
  Pressable, 
  ScrollView, 
  StyleSheet, 
  Text, 
  TextInput, 
  View 
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Image } from "react-native";
import { getRecipeById, updateRecipe } from "@/features/recipes/api";
import { uploadRecipePhoto, getRecipePhotos, type RecipePhoto } from "@/features/recipes/photos";
import type { Recipe, CreateRecipeInput, UpdateRecipeInput, RecipeVisibility, RecipeIngredient } from "@/features/recipes/types";
import { parseIngredient } from "@/features/units/parser";
import type { ParsedIngredient } from "@/features/units/types";

type IngredientInput = {
  text: string;
  parsed?: ParsedIngredient;
  confirmed?: boolean;
};

export default function EditRecipeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Form state (same as create.tsx)
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [ingredients, setIngredients] = useState<IngredientInput[]>([{ text: "" }]);
  const [steps, setSteps] = useState<string[]>([""]);
  const [visibility, setVisibility] = useState<RecipeVisibility>("private");
  const [tags, setTags] = useState("");
  const [servings, setServings] = useState("");
  const [prepTime, setPrepTime] = useState("");
  const [cookTime, setCookTime] = useState("");
  const [sourceStory, setSourceStory] = useState("");
  const [photos, setPhotos] = useState<{ uri: string; name: string; type: string }[]>([]);
  const [existingPhotos, setExistingPhotos] = useState<RecipePhoto[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  useEffect(() => {
    async function load() {
      if (!id) return;

      try {
        const data = await getRecipeById(id);
        if (!data) {
          Alert.alert("Error", "Recipe not found");
          router.back();
          return;
        }

        setRecipe(data);
        setTitle(data.title);
        setDescription(data.description || "");

        // Load ingredients with existing canonical fields if present
        setIngredients(data.ingredients.map(i => {
          if (i.amount !== undefined || i.unit !== undefined) {
            // Has canonical fields - mark as confirmed
            return {
              text: i.text,
              parsed: {
                amount: i.amount ?? null,
                amountDisplay: i.amount != null ? String(i.amount) : null,
                unit: i.unit ?? null,
                ingredient: i.text,
                original: i.original_text ?? i.text,
                isAmbiguous: i.is_ambiguous ?? false,
              },
              confirmed: true,
            };
          }
          // Legacy ingredient - no canonical fields
          return { text: i.text };
        }));

        setSteps(data.steps.map(s => s.text));
        setVisibility(data.visibility);
        setTags(data.tags.join(", "));
        setServings(data.servings?.toString() || "");
        setPrepTime(data.prep_time_minutes?.toString() || "");
        setCookTime(data.cook_time_minutes?.toString() || "");
        setSourceStory(data.source_story || "");
        
        // Load existing photos
        try {
          const photoData = await getRecipePhotos(data.id);
          setExistingPhotos(photoData);
        } catch (photoError) {
          console.error("Failed to load photos:", photoError);
          // Continue without photos - not a critical error
        }
      } catch (e) {
        Alert.alert("Error", "Failed to load recipe");
        router.back();
      } finally {
        setIsLoading(false);
      }
    }

    void load();
  }, [id]);

  function addIngredient() {
    setIngredients([...ingredients, { text: "" }]);
  }

  function updateIngredient(index: number, value: string) {
    const updated = [...ingredients];
    updated[index] = { text: value, parsed: undefined, confirmed: false };
    setIngredients(updated);
  }

  function parseIngredientAtIndex(index: number) {
    const ingredient = ingredients[index];
    if (!ingredient.text.trim()) return;

    const parsed = parseIngredient(ingredient.text);
    const updated = [...ingredients];
    updated[index] = { ...ingredient, parsed };
    setIngredients(updated);
  }

  function confirmParse(index: number) {
    const updated = [...ingredients];
    updated[index] = { ...updated[index], confirmed: true };
    setIngredients(updated);
  }

  function dismissParse(index: number) {
    const updated = [...ingredients];
    updated[index] = { text: updated[index].text, parsed: undefined, confirmed: false };
    setIngredients(updated);
  }

  function removeIngredient(index: number) {
    setIngredients(ingredients.filter((_, i) => i !== index));
  }

  function addStep() {
    setSteps([...steps, ""]);
  }

  function updateStep(index: number, value: string) {
    const updated = [...steps];
    updated[index] = value;
    setSteps(updated);
  }

  function removeStep(index: number) {
    setSteps(steps.filter((_, i) => i !== index));
  }

  async function pickPhoto() {
    // Request permissions
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Required", "Camera roll permission is needed to add photos");
      return;
    }

    // Pick image
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: false,
      quality: 0.8,
      allowsEditing: true
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const file = {
        uri: asset.uri,
        name: asset.fileName || `photo-${Date.now()}.jpg`,
        type: asset.type || "image/jpeg"
      };
      setPhotos([...photos, file]);
    }
  }

  function removePhoto(index: number) {
    setPhotos(photos.filter((_, i) => i !== index));
  }

  async function handleSubmit() {
    if (!recipe) return;

    // Validation
    if (!title.trim()) {
      Alert.alert("Validation Error", "Title is required");
      return;
    }

    const nonEmptyIngredients = ingredients.filter(i => i.text.trim());
    if (nonEmptyIngredients.length === 0) {
      Alert.alert("Validation Error", "At least one ingredient is required");
      return;
    }

    const nonEmptySteps = steps.filter(s => s.trim());
    if (nonEmptySteps.length === 0) {
      Alert.alert("Validation Error", "At least one step is required");
      return;
    }

    setIsSubmitting(true);
    try {
      // Build recipe ingredients with canonical fields if confirmed
      const recipeIngredients: RecipeIngredient[] = nonEmptyIngredients.map((ing, i) => {
        const base = {
          text: ing.text,
          sort_order: i,
        };

        // If parsed and confirmed, add canonical fields
        if (ing.confirmed && ing.parsed) {
          return {
            ...base,
            amount: ing.parsed.amount,
            unit: ing.parsed.unit,
            original_text: ing.parsed.original,
            is_ambiguous: ing.parsed.isAmbiguous,
          };
        }

        // Otherwise just text and sort_order (backward compat)
        return base;
      });

      const input: UpdateRecipeInput = {
        title: title.trim(),
        description: description.trim() || undefined,
        ingredients: recipeIngredients,
        steps: nonEmptySteps.map((text, i) => ({
          text,
          sort_order: i
        })),
        visibility,
        servings: servings ? parseInt(servings, 10) : undefined,
        prep_time_minutes: prepTime ? parseInt(prepTime, 10) : undefined,
        cook_time_minutes: cookTime ? parseInt(cookTime, 10) : undefined,
        source_story: sourceStory.trim() || undefined,
        tags: tags
          .split(",")
          .map(t => t.trim().toLowerCase())
          .filter(Boolean)
      };

      await updateRecipe(recipe.id, input);
      
      // Upload new photos if any
      if (photos.length > 0) {
        setIsUploadingPhoto(true);
        for (let i = 0; i < photos.length; i++) {
          await uploadRecipePhoto(recipe.id, photos[i], existingPhotos.length + i);
        }
      }
      
      router.back();
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : "Failed to update recipe");
    } finally {
      setIsSubmitting(false);
      setIsUploadingPhoto(false);
    }
  }

  if (isLoading) {
    return (
      <>
        <Stack.Screen options={{ title: "Edit Recipe" }} />
        <View style={styles.container}>
          <ActivityIndicator />
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: "Edit Recipe" }} />
      <ScrollView style={styles.container}>
        <Text style={styles.label}>Title *</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="e.g., Grandma's Chocolate Chip Cookies"
        />

        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={description}
          onChangeText={setDescription}
          placeholder="Brief description"
          multiline
          numberOfLines={3}
        />

        <Text style={styles.label}>Ingredients *</Text>
        {ingredients.map((ingredient, index) => (
          <View key={index} style={styles.ingredientContainer}>
            <View style={styles.arrayItemRow}>
              <TextInput
                style={[styles.input, styles.arrayInput]}
                value={ingredient.text}
                onChangeText={(value) => updateIngredient(index, value)}
                onBlur={() => parseIngredientAtIndex(index)}
                placeholder={`Ingredient ${index + 1}`}
              />
              {ingredients.length > 1 && (
                <Pressable onPress={() => removeIngredient(index)}>
                  <Text style={styles.removeButton}>✕</Text>
                </Pressable>
              )}
            </View>
            {ingredient.parsed && !ingredient.confirmed && (
              <View style={styles.parsePreview}>
                {ingredient.parsed.isAmbiguous ? (
                  <Text style={styles.parsePreviewText}>
                    Ambiguous measurement — will be preserved as-is
                  </Text>
                ) : ingredient.parsed.amount !== null || ingredient.parsed.unit !== null ? (
                  <Text style={styles.parsePreviewText}>
                    Parsed: {ingredient.parsed.amountDisplay || ""} {ingredient.parsed.unit || ""} {ingredient.parsed.ingredient}
                  </Text>
                ) : (
                  <Text style={styles.parsePreviewText}>
                    {ingredient.parsed.ingredient}
                  </Text>
                )}
                <Pressable
                  style={styles.dismissButton}
                  onPress={() => dismissParse(index)}
                >
                  <Text style={styles.dismissButtonText}>Dismiss</Text>
                </Pressable>
                <Pressable
                  style={styles.confirmButton}
                  onPress={() => confirmParse(index)}
                >
                  <Text style={styles.confirmButtonText}>Confirm</Text>
                </Pressable>
              </View>
            )}
            {ingredient.confirmed && (
              <Text style={styles.confirmedText}>✓ Parsed and confirmed</Text>
            )}
          </View>
        ))}
        <Pressable onPress={addIngredient}>
          <Text style={styles.addButton}>+ Add Ingredient</Text>
        </Pressable>

        <Text style={styles.label}>Steps *</Text>
        {steps.map((step, index) => (
          <View key={index} style={styles.arrayItemRow}>
            <TextInput
              style={[styles.input, styles.arrayInput, styles.textArea]}
              value={step}
              onChangeText={(value) => updateStep(index, value)}
              placeholder={`Step ${index + 1}`}
              multiline
            />
            {steps.length > 1 && (
              <Pressable onPress={() => removeStep(index)}>
                <Text style={styles.removeButton}>✕</Text>
              </Pressable>
            )}
          </View>
        ))}
        <Pressable onPress={addStep}>
          <Text style={styles.addButton}>+ Add Step</Text>
        </Pressable>

        <Text style={styles.label}>Visibility</Text>
        <View style={styles.radioGroup}>
          {(["private", "family", "public"] as RecipeVisibility[]).map((v) => (
            <Pressable
              key={v}
              style={styles.radioButton}
              onPress={() => setVisibility(v)}
            >
              <View style={[
                styles.radioCircle,
                visibility === v && styles.radioCircleSelected
              ]} />
              <Text>{v}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>Tags (comma-separated)</Text>
        <TextInput
          style={styles.input}
          value={tags}
          onChangeText={setTags}
          placeholder="e.g., dessert, holiday, family favorite"
        />

        <Text style={styles.label}>Servings</Text>
        <TextInput
          style={styles.input}
          value={servings}
          onChangeText={setServings}
          placeholder="e.g., 12"
          keyboardType="numeric"
        />

        <Text style={styles.label}>Prep Time (minutes)</Text>
        <TextInput
          style={styles.input}
          value={prepTime}
          onChangeText={setPrepTime}
          placeholder="e.g., 15"
          keyboardType="numeric"
        />

        <Text style={styles.label}>Cook Time (minutes)</Text>
        <TextInput
          style={styles.input}
          value={cookTime}
          onChangeText={setCookTime}
          placeholder="e.g., 30"
          keyboardType="numeric"
        />

        <Text style={styles.label}>Source Story</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={sourceStory}
          onChangeText={setSourceStory}
          placeholder="Where did this recipe come from?"
          multiline
          numberOfLines={3}
        />

        <Text style={styles.label}>Photos</Text>
        {existingPhotos.length > 0 && (
          <View style={styles.existingPhotosContainer}>
            <Text style={styles.existingPhotosLabel}>Existing photos:</Text>
            {existingPhotos.map((photo, index) => (
              <View key={photo.id} style={styles.existingPhotoItem}>
                <Text style={styles.existingPhotoText}>Photo {index + 1}</Text>
              </View>
            ))}
          </View>
        )}
        {photos.length > 0 && (
          <View style={styles.photoPreviewContainer}>
            {photos.map((photo, index) => (
              <View key={index} style={styles.photoPreview}>
                <Image source={{ uri: photo.uri }} style={styles.photoPreviewImage} />
                <Pressable
                  style={styles.photoRemoveButton}
                  onPress={() => removePhoto(index)}
                >
                  <Text style={styles.photoRemoveButtonText}>✕</Text>
                </Pressable>
              </View>
            ))}
          </View>
        )}
        <Pressable onPress={pickPhoto} style={styles.addPhotoButton}>
          <Text style={styles.addPhotoButtonText}>+ Add Photo</Text>
        </Pressable>

        <Pressable
          style={[styles.submitButton, (isSubmitting || isUploadingPhoto) && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting || isUploadingPhoto}
        >
          <Text style={styles.submitButtonText}>
            {isUploadingPhoto ? "Uploading Photos..." : isSubmitting ? "Saving..." : "Save Changes"}
          </Text>
        </Pressable>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#f5f5f5",
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
    color: "#333",
  },
  input: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  arrayItemRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  arrayInput: {
    flex: 1,
    marginBottom: 0,
  },
  removeButton: {
    color: "red",
    fontSize: 20,
    fontWeight: "bold",
    marginLeft: 12,
    padding: 4,
  },
  addButton: {
    color: "#007AFF",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 20,
    textAlign: "center",
    padding: 8,
  },
  radioGroup: {
    flexDirection: "row",
    marginBottom: 20,
  },
  radioButton: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 20,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#ccc",
    marginRight: 8,
  },
  radioCircleSelected: {
    backgroundColor: "#007AFF",
    borderColor: "#007AFF",
  },
  submitButton: {
    backgroundColor: "#007AFF",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  submitButtonDisabled: {
    backgroundColor: "#ccc",
  },
  submitButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  existingPhotosContainer: {
    marginBottom: 16,
  },
  existingPhotosLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
    color: "#666",
  },
  existingPhotoItem: {
    backgroundColor: "#f0f0f0",
    padding: 8,
    borderRadius: 6,
    marginRight: 8,
    marginBottom: 8,
  },
  existingPhotoText: {
    fontSize: 12,
    color: "#333",
  },
  photoPreviewContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 10
  },
  photoPreview: {
    width: 100,
    height: 100,
    position: "relative"
  },
  photoPreviewImage: {
    width: "100%",
    height: "100%",
    borderRadius: 8
  },
  photoRemoveButton: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center"
  },
  photoRemoveButtonText: {
    color: "#fff",
    fontSize: 16
  },
  addPhotoButton: {
    padding: 12,
    backgroundColor: "#e8e8e8",
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 20
  },
  addPhotoButtonText: {
    fontSize: 16,
    color: "#333"
  },
  ingredientContainer: {
    marginBottom: 8,
  },
  parsePreview: {
    backgroundColor: "#f0f8ff",
    padding: 8,
    borderRadius: 6,
    marginTop: 4,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
  },
  parsePreviewText: {
    fontSize: 13,
    color: "#333",
    flex: 1,
  },
  confirmButton: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 8,
  },
  confirmButtonText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
  },
  confirmedText: {
    fontSize: 12,
    color: "#4CAF50",
    marginTop: 4,
    marginBottom: 8,
  },
  dismissButton: {
    borderWidth: 1,
    borderColor: "#999",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 8,
  },
  dismissButtonText: {
    color: "#666",
    fontSize: 12,
    fontWeight: "500",
  },
});