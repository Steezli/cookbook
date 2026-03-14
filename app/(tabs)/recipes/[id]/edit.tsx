import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { showAlert } from '@/lib/alert';
import { getRecipeById, updateRecipe } from '@/features/recipes/api';
import { getRecipePhotos, uploadRecipePhoto, type RecipePhoto } from '@/features/recipes/photos';
import { RecipeForm, type PendingPhoto } from '@/components/recipes/RecipeForm';
import type { CreateRecipeInput, Recipe } from '@/features/recipes/types';

export default function EditRecipeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [photos, setPhotos] = useState<RecipePhoto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function load() {
      if (!id) return;
      try {
        const [r, p] = await Promise.all([getRecipeById(id), getRecipePhotos(id)]);
        if (!r) {
          showAlert('Error', 'Recipe not found');
          router.back();
          return;
        }
        setRecipe(r);
        setPhotos(p);
      } catch {
        showAlert('Error', 'Failed to load recipe');
        router.back();
      } finally {
        setIsLoading(false);
      }
    }
    void load();
  }, [id]);

  async function handleSubmit(input: CreateRecipeInput, newPhotos: PendingPhoto[]) {
    if (!id) return;
    setIsSubmitting(true);
    try {
      await updateRecipe(id, input);
      for (let i = 0; i < newPhotos.length; i++) {
        await uploadRecipePhoto(id, newPhotos[i], photos.length + i);
      }
      router.back();
    } catch (err: any) {
      showAlert('Error', err.message ?? 'Failed to update recipe');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <>
        <Stack.Screen options={{ title: 'Edit Recipe' }} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator />
        </View>
      </>
    );
  }

  if (!recipe) return null;

  return (
    <>
      <Stack.Screen options={{ title: 'Edit Recipe' }} />
      <RecipeForm
        initialValues={{
          title: recipe.title,
          description: recipe.description ?? undefined,
          ingredients: recipe.ingredients,
          steps: recipe.steps,
          visibility: recipe.visibility,
          family_id: recipe.family_id,
          servings: recipe.servings,
          prep_time_minutes: recipe.prep_time_minutes,
          cook_time_minutes: recipe.cook_time_minutes,
          source_story: recipe.source_story ?? undefined,
          tags: recipe.tags,
        }}
        existingPhotos={photos}
        recipeId={id}
        onSubmit={handleSubmit}
        submitLabel="Save Changes"
        isSubmitting={isSubmitting}
      />
    </>
  );
}
