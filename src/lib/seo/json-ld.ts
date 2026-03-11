/**
 * schema.org/Recipe JSON-LD generator.
 *
 * Pure function — no React, no side effects, no platform dependencies.
 * All optional fields are omitted (not set to null/undefined) when the
 * source data is missing, ensuring the output is always valid JSON with
 * no undefined values.
 */

import type { Recipe } from '@/features/recipes/types';
import type { PublicAuthor } from '@/features/recipes/public';
import { minutesToIsoDuration } from './duration';

/**
 * Generate a schema.org/Recipe JSON-LD object from recipe data.
 *
 * @param recipe - The recipe data
 * @param author - The public author info, or null
 * @param imageUrl - Absolute URL to the hero image, or null
 * @returns A plain object ready for JSON.stringify — no undefined values
 */
export function generateRecipeJsonLd(
  recipe: Recipe,
  author: PublicAuthor | null,
  imageUrl: string | null
): Record<string, unknown> {
  const obj: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Recipe',
    name: recipe.title,
  };

  // Description
  if (recipe.description) {
    obj.description = recipe.description;
  }

  // Image
  if (imageUrl) {
    obj.image = imageUrl;
  }

  // Author
  const authorName = author?.display_name ?? 'Anonymous';
  obj.author = {
    '@type': 'Person',
    name: authorName,
  };

  // Dates
  obj.datePublished = recipe.created_at;
  obj.dateModified = recipe.updated_at;

  // Time fields
  const prepTime = minutesToIsoDuration(recipe.prep_time_minutes);
  const cookTime = minutesToIsoDuration(recipe.cook_time_minutes);

  if (prepTime) {
    obj.prepTime = prepTime;
  }
  if (cookTime) {
    obj.cookTime = cookTime;
  }

  // totalTime: only when both prep and cook are present
  if (
    recipe.prep_time_minutes != null &&
    recipe.prep_time_minutes > 0 &&
    recipe.cook_time_minutes != null &&
    recipe.cook_time_minutes > 0
  ) {
    const total = recipe.prep_time_minutes + recipe.cook_time_minutes;
    obj.totalTime = minutesToIsoDuration(total);
  }

  // Servings
  if (recipe.servings != null) {
    obj.recipeYield = `${recipe.servings} servings`;
  }

  // Ingredients
  if (recipe.ingredients.length > 0) {
    obj.recipeIngredient = recipe.ingredients.map((i) => i.text);
  }

  // Instructions
  if (recipe.steps.length > 0) {
    obj.recipeInstructions = recipe.steps.map((s) => ({
      '@type': 'HowToStep',
      text: s.text,
    }));
  }

  // Keywords
  if (recipe.tags.length > 0) {
    obj.keywords = recipe.tags.join(', ');
  }

  // Aggregate rating — only when both values are present
  if (recipe.rating_average != null && recipe.rating_count != null) {
    obj.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: recipe.rating_average,
      ratingCount: recipe.rating_count,
    };
  }

  // Safety: strip any undefined values via JSON roundtrip
  return JSON.parse(JSON.stringify(obj));
}
