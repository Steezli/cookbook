/**
 * Shared ingredient display function used across all screens.
 * Converts measurements based on user's unit preference (imperial/metric).
 *
 * Always attempts conversion — handles both structured ingredient data
 * (with amount/unit fields) and legacy plain-text ingredients.
 */
import type { RecipeIngredient } from '@/features/recipes/types';
import { displayAmount } from './conversions';
import { parseIngredient } from './parser';
import type { UnitSystem } from './types';

/**
 * Format an ingredient for display, applying unit conversion when the user's
 * preference differs from the stored measurement system.
 *
 * Handles three cases:
 * 1. Structured data with amount + unit → direct conversion
 * 2. Ambiguous ingredients → show original with "(approx.)"
 * 3. Legacy/plain text → parse with ingredient parser, then convert if possible
 */
export function displayIngredient(
  ing: RecipeIngredient,
  unitPreference: UnitSystem
): string {
  // 1. Structured amount/unit available
  if (ing.amount !== undefined && ing.unit !== undefined && !ing.is_ambiguous) {
    return displayAmount(
      ing.amount ?? null,
      ing.unit ?? null,
      unitPreference,
      ing.original_text || ing.text,
      ing.text
    );
  }

  // 2. Ambiguous
  if (ing.is_ambiguous) {
    return `${ing.text} (approx.)`;
  }

  // 3. Legacy: parse from text and attempt conversion
  const parsed = parseIngredient(ing.text);
  if (parsed.amount !== null && parsed.unit !== null && !parsed.isAmbiguous) {
    return displayAmount(
      parsed.amount,
      parsed.unit,
      unitPreference,
      ing.text,
      parsed.ingredient
    );
  }

  // 4. Unparseable — return raw text
  return ing.text;
}
