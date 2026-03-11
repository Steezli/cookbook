/**
 * Multi-recipe parsing and prompt-building logic.
 *
 * Pure functions with no Deno or Supabase dependencies — testable in
 * the standard Jest/Node environment. The edge function (process-scan-job)
 * inlines these functions since it can't import from src/.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Ingredient {
  name: string;
  amount: string;
  unit: string;
  preparation?: string;
}

export interface ScanResult {
  rawText: string;
  confidence: number;
  extracted: {
    title?: string;
    ingredients?: Ingredient[];
    instructions?: string[];
    prepTimeMinutes?: number;
    cookTimeMinutes?: number;
    servings?: number;
  };
}

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

/**
 * Parse a single recipe object (flat key structure from Claude's JSON) into
 * a typed ScanResult. Applies safe defaults for missing/malformed fields.
 */
export function parseSingleRecipe(parsed: any): ScanResult {
  if (!parsed || typeof parsed !== 'object') {
    return {
      rawText: '',
      confidence: 0.7,
      extracted: {},
    };
  }

  return {
    rawText: parsed.rawText || '',
    confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.7,
    extracted: {
      title: parsed.title || undefined,
      ingredients: Array.isArray(parsed.ingredients)
        ? parsed.ingredients.map((ing: any) => ({
            name: ing.name || '',
            amount: String(ing.amount || ''),
            unit: ing.unit || '',
            preparation: ing.preparation || '',
          }))
        : undefined,
      instructions: Array.isArray(parsed.instructions) ? parsed.instructions : undefined,
      prepTimeMinutes:
        typeof parsed.prepTimeMinutes === 'number' ? parsed.prepTimeMinutes : undefined,
      cookTimeMinutes:
        typeof parsed.cookTimeMinutes === 'number' ? parsed.cookTimeMinutes : undefined,
      servings: typeof parsed.servings === 'number' ? parsed.servings : undefined,
    },
  };
}

/**
 * Parse Claude's JSON response into an array of ScanResult objects.
 *
 * Supports two response shapes:
 *  1. **Array format** — `{ recipes: [{ rawText, title, … }, …] }`
 *  2. **Legacy single-object format** — `{ rawText, title, … }` (no wrapper)
 *
 * Returns an empty array when the input is null, undefined, or structurally
 * unparseable (no crash).
 */
export function parseMultiScanResult(parsed: any): ScanResult[] {
  if (!parsed || typeof parsed !== 'object') {
    return [];
  }

  // Array format — { recipes: [...] }
  if (Array.isArray(parsed.recipes)) {
    if (parsed.recipes.length === 0) {
      return [];
    }
    return parsed.recipes.map((r: any) => parseSingleRecipe(r));
  }

  // Legacy single-object format — { rawText, title, … }
  // Detect by checking for at least one expected top-level key.
  if (
    parsed.rawText !== undefined ||
    parsed.title !== undefined ||
    parsed.ingredients !== undefined
  ) {
    return [parseSingleRecipe(parsed)];
  }

  // Unrecognised shape — return empty rather than crash.
  return [];
}

// ---------------------------------------------------------------------------
// Prompt building
// ---------------------------------------------------------------------------

const RECIPE_JSON_SCHEMA = `{
  "recipes": [
    {
      "rawText": "the complete text you read from the image(s), preserving original formatting",
      "confidence": 0.0 to 1.0,
      "title": "recipe title",
      "ingredients": [
        { "name": "ingredient name", "amount": "quantity", "unit": "unit of measure", "preparation": "prep notes if any" }
      ],
      "instructions": ["step 1 text", "step 2 text"],
      "prepTimeMinutes": number or null,
      "cookTimeMinutes": number or null,
      "servings": number or null
    }
  ]
}`;

const COMMON_INSTRUCTIONS = `Important:
- For ingredients, always separate amount, unit, and name. E.g. "2 cups flour" → amount: "2", unit: "cups", name: "flour"
- If a fraction like "1/2" or "1 1/2" appears, keep it as a string: "1/2" or "1 1/2"
- If prep/cook time or servings aren't mentioned, use null
- Include ALL ingredients and ALL instructions, don't summarize
- confidence should reflect how legible the image was and how complete the extraction is
- Return at most 5 recipes per response. If you detect more than 5, return the 5 most complete ones.
- Always wrap your response in the { "recipes": [...] } format, even for a single recipe.`;

/**
 * Build the system/user prompt for Claude based on how many images are
 * provided. Single-image prompts mention "photo"; multi-image prompts
 * mention "multiple pages".
 */
export function buildScanPrompt(imageCount: number): string {
  const intro =
    imageCount > 1
      ? `These ${imageCount} photos may contain one or more recipes (multiple pages or angles). Read ALL the text from every image. If you detect multiple distinct recipes, return each one separately.`
      : `This is a photo of a recipe. Read ALL the text visible in the image. If the photo contains more than one recipe, return each one separately.`;

  return `${intro}

Extract the structured recipe data. Return ONLY valid JSON with this exact schema — no markdown, no code fences, no explanation:

${RECIPE_JSON_SCHEMA}

${COMMON_INSTRUCTIONS}`;
}
