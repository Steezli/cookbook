import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { showAlert } from '@/lib/alert';
import { createRecipe } from '@/features/recipes/api';
import { uploadRecipePhoto } from '@/features/recipes/photos';
import { RecipeForm, type PendingPhoto } from '@/components/recipes/RecipeForm';
import type { CreateRecipeInput } from '@/features/recipes/types';

export default function CreateRecipeScreen() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(input: CreateRecipeInput, newPhotos: PendingPhoto[]) {
    setIsSubmitting(true);
    try {
      const recipe = await createRecipe(input);
      for (let i = 0; i < newPhotos.length; i++) {
        await uploadRecipePhoto(recipe.id, newPhotos[i], i);
      }
      router.replace(`/recipes/${recipe.id}`);
    } catch (err: any) {
      showAlert('Error', err.message ?? 'Failed to create recipe');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Create Recipe' }} />
      <RecipeForm
        onSubmit={handleSubmit}
        submitLabel="Create Recipe"
        isSubmitting={isSubmitting}
      />
    </>
  );
}
