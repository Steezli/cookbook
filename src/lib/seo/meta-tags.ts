/**
 * Open Graph and Twitter Card meta tag generator.
 *
 * Pure function — no React, no side effects, no platform dependencies.
 * Returns an array of MetaTag objects ready to be rendered as <meta> elements.
 * Optional tags (description, image) are omitted when the source data is null.
 */

import type { Recipe } from '@/features/recipes/types';
import { SITE_NAME } from '@/lib/site-config';

/**
 * A meta tag descriptor. OG tags use `property`, Twitter tags use `name`.
 */
export type MetaTag = {
  property?: string;
  name?: string;
  content: string;
};

/**
 * Generate Open Graph and Twitter Card meta tags for a recipe.
 *
 * @param recipe - The recipe data
 * @param imageUrl - Absolute URL to the hero image, or null
 * @param pageUrl - The canonical page URL
 * @returns Array of MetaTag objects
 */
export function generateRecipeMetaTags(
  recipe: Recipe,
  imageUrl: string | null,
  pageUrl: string
): MetaTag[] {
  const tags: MetaTag[] = [];

  // --- Open Graph tags ---
  tags.push({ property: 'og:title', content: recipe.title });

  if (recipe.description) {
    tags.push({ property: 'og:description', content: recipe.description });
  }

  if (imageUrl) {
    tags.push({ property: 'og:image', content: imageUrl });
  }

  tags.push({ property: 'og:url', content: pageUrl });
  tags.push({ property: 'og:type', content: 'article' });
  tags.push({ property: 'og:site_name', content: SITE_NAME });

  // --- Twitter Card tags ---
  tags.push({ name: 'twitter:card', content: 'summary_large_image' });
  tags.push({ name: 'twitter:title', content: recipe.title });

  if (recipe.description) {
    tags.push({ name: 'twitter:description', content: recipe.description });
  }

  if (imageUrl) {
    tags.push({ name: 'twitter:image', content: imageUrl });
  }

  return tags;
}
