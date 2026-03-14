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
  sourceImageIndex?: number;
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
export function parseSingleRecipe(parsed: unknown): ScanResult {
  if (!parsed || typeof parsed !== 'object') {
    return {
      rawText: '',
      confidence: 0.7,
      extracted: {},
    };
  }

  // After the typeof guard, narrow to a record so property access is safe.
  const p = parsed as Record<string, unknown>;

  return {
    rawText: (p.rawText as string) || '',
    confidence: typeof p.confidence === 'number' ? p.confidence : 0.7,
    sourceImageIndex: typeof p.sourceImageIndex === 'number' ? p.sourceImageIndex : undefined,
    extracted: {
      title: (p.title as string) || undefined,
      ingredients: Array.isArray(p.ingredients)
        ? (p.ingredients as Record<string, unknown>[]).map((ing) => ({
            name: (ing.name as string) || '',
            amount: String(ing.amount || ''),
            unit: (ing.unit as string) || '',
            preparation: (ing.preparation as string) || '',
          }))
        : undefined,
      instructions: Array.isArray(p.instructions) ? (p.instructions as string[]) : undefined,
      prepTimeMinutes:
        typeof p.prepTimeMinutes === 'number' ? p.prepTimeMinutes : undefined,
      cookTimeMinutes:
        typeof p.cookTimeMinutes === 'number' ? p.cookTimeMinutes : undefined,
      servings: typeof p.servings === 'number' ? p.servings : undefined,
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
export function parseMultiScanResult(parsed: unknown): ScanResult[] {
  if (!parsed || typeof parsed !== 'object') {
    return [];
  }

  // After the typeof guard, narrow to a record so property access is safe.
  const p = parsed as Record<string, unknown>;

  // Array format — { recipes: [...] }
  if (Array.isArray(p.recipes)) {
    if (p.recipes.length === 0) {
      return [];
    }
    return (p.recipes as unknown[]).map((r) => parseSingleRecipe(r));
  }

  // Legacy single-object format — { rawText, title, … }
  // Detect by checking for at least one expected top-level key.
  if (
    p.rawText !== undefined ||
    p.title !== undefined ||
    p.ingredients !== undefined
  ) {
    return [parseSingleRecipe(parsed)];
  }

  // Unrecognised shape — return empty rather than crash.
  return [];
}

// ---------------------------------------------------------------------------
// Deduplication
// ---------------------------------------------------------------------------

/**
 * Normalize a title for fuzzy comparison: lowercase, strip punctuation and
 * extra whitespace.
 */
function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Remove likely-duplicate recipes from a result set. Two recipes are
 * considered duplicates when their normalized titles match exactly.
 * When duplicates are found, the one with higher confidence wins.
 *
 * Returns { deduplicated, removedCount }.
 */
export function deduplicateResults(
  results: ScanResult[]
): { deduplicated: ScanResult[]; removedCount: number } {
  if (results.length <= 1) {
    return { deduplicated: results, removedCount: 0 };
  }

  const seen = new Map<string, ScanResult>();

  for (const r of results) {
    const title = r.extracted.title || '';
    const key = normalizeTitle(title);

    // Skip untitled recipes — can't deduplicate without a title
    if (!key) {
      // Still include untitled recipes; they just can't be deduped
      seen.set(`__untitled_${seen.size}`, r);
      continue;
    }

    const existing = seen.get(key);
    if (existing) {
      // Keep the one with higher confidence
      if (r.confidence > existing.confidence) {
        seen.set(key, r);
      }
      // else: keep existing, discard r
    } else {
      seen.set(key, r);
    }
  }

  const deduplicated = Array.from(seen.values());
  return {
    deduplicated,
    removedCount: results.length - deduplicated.length,
  };
}

// ---------------------------------------------------------------------------
// Prompt building
// ---------------------------------------------------------------------------

const RECIPE_JSON_SCHEMA = `{
  "recipes": [
    {
      "rawText": "the complete text you read from the image for this recipe, preserving original formatting",
      "confidence": 0.0 to 1.0,
      "sourceImageIndex": 1,
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
- sourceImageIndex is the 1-based index of the image this recipe was found in
- Return at most 5 recipes per response. If you detect more than 5, return the 5 most complete ones.
- Do NOT return the same recipe twice. Each recipe in the array must be a distinct recipe with its own title.
- Always wrap your response in the { "recipes": [...] } format, even for a single recipe.`;

/**
 * Build the system/user prompt for Claude based on how many images are
 * provided. Single-image prompts mention "photo"; multi-image prompts
 * mention "multiple pages" and include explicit image-boundary guidance.
 */
export function buildScanPrompt(imageCount: number): string {
  if (imageCount <= 1) {
    return `This is a photo of a recipe. Read ALL the text visible in the image. If the photo contains more than one recipe (e.g. two recipes on one page), return each one separately as a distinct entry in the recipes array. Set sourceImageIndex to 1 for all recipes.

Extract the structured recipe data. Return ONLY valid JSON with this exact schema — no markdown, no code fences, no explanation:

${RECIPE_JSON_SCHEMA}

${COMMON_INSTRUCTIONS}`;
  }

  return `You are looking at ${imageCount} separate photos of recipe pages. The images are labeled Image 1 through Image ${imageCount} in the order they were provided.

IMPORTANT — treat each image independently:
- Each image is a SEPARATE page that may contain one or more recipes.
- Do NOT combine content across images unless text explicitly continues from one image to the next (e.g. "continued on next page").
- A single image may contain multiple recipes — return each as a separate entry.
- Set sourceImageIndex to the 1-based image number where each recipe was found.
- Every distinct recipe across all images should appear exactly once in your response.

Read ALL the text from every image. Return each distinct recipe as its own entry in the recipes array.

Extract the structured recipe data. Return ONLY valid JSON with this exact schema — no markdown, no code fences, no explanation:

${RECIPE_JSON_SCHEMA}

${COMMON_INSTRUCTIONS}`;
}
