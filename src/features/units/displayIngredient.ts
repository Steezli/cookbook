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
  // Resolve display text — legacy recipes use `name` instead of `text`
  const ingredientText = ing.text || ing.name || '';
  // Reconstruct full text from structured fields if text is missing
  const fullText = ingredientText
    ? (ing.original_text || ingredientText)
    : '';

  // Normalize amount to number (legacy data stores as string like "2 1/4")
  let numericAmount: number | null = null;
  if (ing.amount !== undefined && ing.amount !== null) {
    if (typeof ing.amount === 'number') {
      numericAmount = ing.amount;
    } else if (typeof ing.amount === 'string') {
      // Parse string amounts like "2 1/4", "3/4", "1.5"
      const parsed = parseIngredient(`${ing.amount} x`);
      numericAmount = parsed.amount;
    }
  }

  // Build original display text: "amount unit name"
  // For legacy data without `text`, reconstruct from structured fields
  const originalDisplay = (ing.text && ing.text !== ingredientText)
    ? (ing.original_text || ing.text)
    : (ing.original_text || [ing.amount, ing.unit, ingredientText].filter(Boolean).join(' '));

  // 1. Structured amount/unit available
  if (numericAmount !== null && ing.unit !== undefined && ing.unit !== null && !ing.is_ambiguous) {
    return displayAmount(
      numericAmount,
      ing.unit,
      unitPreference,
      originalDisplay,
      ingredientText
    );
  }

  // 2. Ambiguous
  if (ing.is_ambiguous) {
    return `${originalDisplay} (approx.)`;
  }

  // 3. Legacy: parse from text and attempt conversion
  if (!originalDisplay) return '';
  const parsed = parseIngredient(originalDisplay);
  if (parsed.amount !== null && parsed.unit !== null && !parsed.isAmbiguous) {
    return displayAmount(
      parsed.amount,
      parsed.unit,
      unitPreference,
      originalDisplay,
      parsed.ingredient
    );
  }

  // 4. Unparseable — return raw text
  return originalDisplay;
}
