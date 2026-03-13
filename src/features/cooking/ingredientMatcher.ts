/**
 * Matches recipe ingredients mentioned in a cooking step's text.
 *
 * Uses normalized substring matching to handle:
 * - Plurals (apples → apple)
 * - Different word forms (butter, melted → butter)
 * - Partial references (Granny Smith apples → apples)
 * - Case insensitivity
 */

import type { RecipeIngredient } from '@/features/recipes/types';

/**
 * Normalize text for matching: lowercase, collapse whitespace, strip
 * common punctuation that doesn't affect meaning.
 */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[,;.!?()"']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extract the core ingredient name from an ingredient line.
 * Strips amounts, units, and preparation notes to get the food item.
 *
 * "2 cups all-purpose flour" → "all-purpose flour"
 * "butter, melted" → "butter melted"
 * "6 large Granny Smith apples" → "large granny smith apples"
 */
function extractIngredientName(ingredient: RecipeIngredient): string {
  const text = ingredient.original_text || ingredient.text;
  let name = normalize(text);

  // Remove leading amounts (numbers, fractions, decimals)
  name = name
    .replace(/^[\d\s/½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞.]+/, '')
    .trim();

  // Remove common units at the start
  const unitPattern = /^(tsp|teaspoons?|tbsp|tablespoons?|oz|ounces?|fl oz|cups?|pints?|quarts?|gallons?|ml|milliliters?|l|liters?|g|grams?|kg|kilograms?|lb|pounds?|cloves?|slices?|pieces?|cans?|packages?|sticks?|heads?|bunche?s?|sprigs?|stalks?|large|medium|small)\b\s*/;
  name = name.replace(unitPattern, '').trim();

  return name;
}

/**
 * Generate matching tokens from an ingredient name.
 * Produces the full name plus individual significant words,
 * so "granny smith apples" matches if step says "apples" or "granny smith".
 */
function getMatchTokens(ingredientName: string): string[] {
  const tokens: string[] = [];

  if (ingredientName.length > 0) {
    tokens.push(ingredientName);
  }

  // Split into words and add significant ones (>= 3 chars to skip "of", "a", etc.)
  const words = ingredientName.split(/\s+/);
  for (const word of words) {
    if (word.length >= 3) {
      tokens.push(word);
    }
  }

  return tokens;
}

/**
 * Simple plural stripping: removes trailing 's' or 'es' for matching.
 * Not a full stemmer — just enough for cooking ingredients.
 */
function depluralize(word: string): string {
  if (word.endsWith('ies') && word.length > 4) {
    return word.slice(0, -3) + 'y'; // berries → berry
  }
  if (word.endsWith('ves') && word.length > 4) {
    return word.slice(0, -3) + 'f'; // halves → half
  }
  if (word.endsWith('es') && word.length > 3) {
    return word.slice(0, -2); // tomatoes → tomato
  }
  if (word.endsWith('s') && !word.endsWith('ss') && word.length > 3) {
    return word.slice(0, -1); // apples → apple
  }
  return word;
}

/**
 * Simple pluralization: adds 's' or 'es' for matching.
 * Not comprehensive — just enough for cooking ingredients.
 */
function pluralize(word: string): string {
  if (word.endsWith('y') && word.length > 3 && !/[aeiou]y$/.test(word)) {
    return word.slice(0, -1) + 'ies'; // berry → berries
  }
  if (/[sxz]$/.test(word) || /[sc]h$/.test(word)) {
    return word + 'es'; // tomato doesn't end in these, but works for "dish → dishes"
  }
  if (word.endsWith('f') && word.length > 3) {
    return word.slice(0, -1) + 'ves'; // half → halves
  }
  return word + 's'; // egg → eggs
}

/**
 * Check if a token appears in the step text, respecting word boundaries.
 * Also checks the depluralized and pluralized forms for fuzzy matching.
 */
function tokenMatchesStep(token: string, normalizedStep: string): boolean {
  if (token.length < 3) return false;

  // Check the token as-is with word boundary
  if (matchWithBoundary(token, normalizedStep)) return true;

  // Check depluralized form (token is plural, step has singular)
  const singular = depluralize(token);
  if (singular !== token && matchWithBoundary(singular, normalizedStep)) return true;

  // Check pluralized form (token is singular, step has plural)
  const plural = pluralize(token);
  if (plural !== token && matchWithBoundary(plural, normalizedStep)) return true;

  return false;
}

/**
 * Word-boundary-aware substring match.
 * Ensures "flour" doesn't match "cauliflower".
 */
function matchWithBoundary(token: string, text: string): boolean {
  // Build a regex with word boundaries
  // Escape special regex chars in the token
  const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`\\b${escaped}\\b`);
  return pattern.test(text);
}

/**
 * Given a step's text and the full ingredient list, returns the indices
 * of ingredients that are mentioned in or relevant to this step.
 *
 * @param stepText - The instruction text for a single cooking step
 * @param ingredients - The full recipe ingredient list
 * @returns Array of 0-based indices into the ingredients array
 */
export function extractStepIngredients(
  stepText: string,
  ingredients: RecipeIngredient[]
): number[] {
  if (!stepText || ingredients.length === 0) return [];

  const normalizedStep = normalize(stepText);
  const matched: number[] = [];

  for (let i = 0; i < ingredients.length; i++) {
    const ingredientName = extractIngredientName(ingredients[i]);
    const tokens = getMatchTokens(ingredientName);

    // An ingredient matches if ANY of its tokens appear in the step text
    const isMatch = tokens.some(token => tokenMatchesStep(token, normalizedStep));

    if (isMatch) {
      matched.push(i);
    }
  }

  return matched;
}

/**
 * Highlights ingredient names within step text by wrapping them in markers.
 * Returns an array of segments with { text, highlighted } for rendering.
 *
 * @param stepText - The instruction text for a single cooking step
 * @param ingredients - The ingredients matched to this step
 * @returns Array of { text, highlighted } segments
 */
export interface TextSegment {
  text: string;
  highlighted: boolean;
}

export function highlightStepIngredients(
  stepText: string,
  ingredients: RecipeIngredient[]
): TextSegment[] {
  if (!stepText || ingredients.length === 0) {
    return [{ text: stepText || '', highlighted: false }];
  }

  // Collect all match tokens with their positions in the step text
  const matches: { start: number; end: number }[] = [];
  const normalizedStep = normalize(stepText);
  // We need to map positions between normalized and original text
  // Simpler approach: search in the original text (case-insensitive) for each token

  for (const ingredient of ingredients) {
    const ingredientName = extractIngredientName(ingredient);
    const tokens = getMatchTokens(ingredientName);

    for (const token of tokens) {
      if (token.length < 3) continue;

      // Search for the token and its singular form in the original text
      const searchTerms = [token];
      const singular = depluralize(token);
      if (singular !== token) searchTerms.push(singular);

      for (const term of searchTerms) {
        const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const pattern = new RegExp(`\\b${escaped}\\b`, 'gi');
        let match: RegExpExecArray | null;

        while ((match = pattern.exec(stepText)) !== null) {
          matches.push({ start: match.index, end: match.index + match[0].length });
        }
      }
    }
  }

  if (matches.length === 0) {
    return [{ text: stepText, highlighted: false }];
  }

  // Sort by start position and merge overlapping ranges
  matches.sort((a, b) => a.start - b.start);
  const merged: { start: number; end: number }[] = [];
  for (const m of matches) {
    const last = merged[merged.length - 1];
    if (last && m.start <= last.end) {
      last.end = Math.max(last.end, m.end);
    } else {
      merged.push({ ...m });
    }
  }

  // Build segments
  const segments: TextSegment[] = [];
  let cursor = 0;

  for (const m of merged) {
    if (cursor < m.start) {
      segments.push({ text: stepText.slice(cursor, m.start), highlighted: false });
    }
    segments.push({ text: stepText.slice(m.start, m.end), highlighted: true });
    cursor = m.end;
  }

  if (cursor < stepText.length) {
    segments.push({ text: stepText.slice(cursor), highlighted: false });
  }

  return segments;
}
