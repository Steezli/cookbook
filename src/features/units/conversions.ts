// Unit conversion functions
import { UnitSystem } from './types';

// ---------------------------------------------------------------------------
// Volume conversion table — all values in milliliters
// ---------------------------------------------------------------------------
const VOLUME_TO_ML: Record<string, number> = {
  // US customary
  tsp: 4.92892,
  teaspoon: 4.92892,
  teaspoons: 4.92892,
  tbsp: 14.7868,
  tablespoon: 14.7868,
  tablespoons: 14.7868,
  'fl oz': 29.5735,
  cup: 236.588,
  cups: 236.588,
  pint: 473.176,
  pints: 473.176,
  quart: 946.353,
  quarts: 946.353,
  gallon: 3785.41,
  gallons: 3785.41,
  // Metric
  ml: 1,
  milliliter: 1,
  milliliters: 1,
  l: 1000,
  liter: 1000,
  liters: 1000,
};

// ---------------------------------------------------------------------------
// Weight conversion table — all values in grams
// ---------------------------------------------------------------------------
const WEIGHT_TO_GRAMS: Record<string, number> = {
  // Imperial
  oz: 28.3495,
  ounce: 28.3495,
  ounces: 28.3495,
  lb: 453.592,
  pound: 453.592,
  pounds: 453.592,
  // Metric
  g: 1,
  gram: 1,
  grams: 1,
  kg: 1000,
  kilogram: 1000,
  kilograms: 1000,
};

// ---------------------------------------------------------------------------
// Dry ingredient density table — grams per US cup (236.588 ml)
// Used when converting dry ingredients from volume to weight for metric.
// These are standard baking/cooking densities.
// ---------------------------------------------------------------------------
const DRY_GRAMS_PER_CUP: Record<string, number> = {
  // Flours
  'all-purpose flour': 125,
  'flour': 125,
  'bread flour': 127,
  'cake flour': 114,
  'whole wheat flour': 128,
  'self-rising flour': 125,
  'almond flour': 96,
  'coconut flour': 128,
  'oat flour': 120,
  'rice flour': 160,

  // Sugars
  'sugar': 200,
  'granulated sugar': 200,
  'white sugar': 200,
  'brown sugar': 220,
  'light brown sugar': 220,
  'dark brown sugar': 220,
  'powdered sugar': 120,
  'confectioners sugar': 120,
  'icing sugar': 120,

  // Fats (solid at room temp)
  'butter': 227,
  'shortening': 191,
  'lard': 205,
  'coconut oil': 218,

  // Grains & starches
  'rice': 185,
  'oats': 90,
  'rolled oats': 90,
  'cornstarch': 128,
  'cornmeal': 150,
  'breadcrumbs': 108,
  'panko': 60,

  // Nuts & seeds
  'almonds': 143,
  'walnuts': 120,
  'pecans': 109,
  'peanuts': 146,
  'chocolate chips': 170,
  'cocoa powder': 86,
  'cocoa': 86,

  // Other dry
  'salt': 288,
  'baking soda': 220,
  'baking powder': 230,
  'yeast': 192,
  'cinnamon': 125,
  'ground cinnamon': 125,
};

// ---------------------------------------------------------------------------
// Liquid ingredients — ingredients that should stay in volume units.
// Anything NOT in this list is treated as dry when measured in cups.
// ---------------------------------------------------------------------------
const KNOWN_LIQUIDS = new Set([
  'water',
  'milk',
  'whole milk',
  'skim milk',
  'buttermilk',
  'cream',
  'heavy cream',
  'whipping cream',
  'half and half',
  'half-and-half',
  'broth',
  'stock',
  'chicken broth',
  'beef broth',
  'vegetable broth',
  'chicken stock',
  'beef stock',
  'oil',
  'olive oil',
  'vegetable oil',
  'canola oil',
  'sesame oil',
  'coconut milk',
  'almond milk',
  'oat milk',
  'soy milk',
  'juice',
  'orange juice',
  'lemon juice',
  'lime juice',
  'apple juice',
  'vinegar',
  'apple cider vinegar',
  'white vinegar',
  'balsamic vinegar',
  'red wine vinegar',
  'wine',
  'red wine',
  'white wine',
  'beer',
  'rum',
  'bourbon',
  'vanilla extract',
  'extract',
  'soy sauce',
  'fish sauce',
  'worcestershire sauce',
  'hot sauce',
  'maple syrup',
  'syrup',
  'honey',
  'molasses',
  'corn syrup',
  'condensed milk',
  'evaporated milk',
  'yogurt',
  'sour cream',
  'ketchup',
  'mustard',
  'mayonnaise',
  'coffee',
  'tea',
  'egg',
  'eggs',
]);

// ---------------------------------------------------------------------------
// Preferred target units for different magnitudes
// ---------------------------------------------------------------------------
const IMPERIAL_VOLUME_PREFERRED: Record<string, string> = {
  tsp: 'tsp',
  tbsp: 'tbsp',
  'fl oz': 'fl oz',
  cup: 'cup',
  ml: 'cup',
  l: 'cup',
};

const METRIC_VOLUME_PREFERRED: Record<string, string> = {
  tsp: 'ml',
  tbsp: 'ml',
  'fl oz': 'ml',
  cup: 'ml',
  ml: 'ml',
  l: 'ml',
};

const IMPERIAL_WEIGHT_PREFERRED: Record<string, string> = {
  g: 'oz',
  kg: 'lb',
  oz: 'oz',
  lb: 'lb',
};

const METRIC_WEIGHT_PREFERRED: Record<string, string> = {
  g: 'g',
  kg: 'g',
  oz: 'g',
  lb: 'g',
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function convertVolume(amount: number, fromUnit: string, toUnit: string): number {
  const fromMl = VOLUME_TO_ML[fromUnit.toLowerCase()];
  const toMl = VOLUME_TO_ML[toUnit.toLowerCase()];

  if (!fromMl || !toMl) {
    return amount;
  }

  const ml = amount * fromMl;
  return ml / toMl;
}

export function convertWeight(amount: number, fromUnit: string, toUnit: string): number {
  const fromGrams = WEIGHT_TO_GRAMS[fromUnit.toLowerCase()];
  const toGrams = WEIGHT_TO_GRAMS[toUnit.toLowerCase()];

  if (!fromGrams || !toGrams) {
    return amount;
  }

  const grams = amount * fromGrams;
  return grams / toGrams;
}

export function canConvert(unit: string): boolean {
  const normalized = unit.toLowerCase();
  return normalized in VOLUME_TO_ML || normalized in WEIGHT_TO_GRAMS;
}

/**
 * Classify an ingredient as liquid or dry based on its name.
 * Used to decide whether volume units (cups) should convert to
 * volume (ml) or weight (g) when switching to metric.
 */
export function isLiquidIngredient(ingredientName: string): boolean {
  if (!ingredientName) return false;

  const normalized = ingredientName
    .toLowerCase()
    .replace(/[,;.!?()"']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Direct match
  if (KNOWN_LIQUIDS.has(normalized)) return true;

  // Check if any known liquid is a substring of the ingredient name
  for (const liquid of KNOWN_LIQUIDS) {
    if (normalized.includes(liquid)) return true;
  }

  return false;
}

/**
 * Look up the grams-per-cup for a dry ingredient.
 * Returns null if no density data is available.
 */
function getDryGramsPerCup(ingredientName: string): number | null {
  if (!ingredientName) return null;

  const normalized = ingredientName
    .toLowerCase()
    .replace(/[,;.!?()"']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Direct match
  if (DRY_GRAMS_PER_CUP[normalized] !== undefined) {
    return DRY_GRAMS_PER_CUP[normalized];
  }

  // Check if any known dry ingredient is a substring
  for (const [key, value] of Object.entries(DRY_GRAMS_PER_CUP)) {
    if (normalized.includes(key)) return value;
  }

  return null;
}

/**
 * Convert a volume amount of a dry ingredient to grams.
 * Uses the density lookup table. Falls back to null if unknown.
 */
function convertDryVolumeToGrams(
  amount: number,
  fromUnit: string,
  ingredientName: string
): number | null {
  const gramsPerCup = getDryGramsPerCup(ingredientName);
  if (gramsPerCup === null) return null;

  // Convert the amount to cups first, then multiply by grams-per-cup
  const amountInCups = convertVolume(amount, fromUnit, 'cup');
  return amountInCups * gramsPerCup;
}

/**
 * Convert grams of a dry ingredient to a volume amount in cups.
 * Used for metric→imperial conversion of dry goods.
 */
function convertDryGramsToVolume(
  amountInGrams: number,
  ingredientName: string
): { amount: number; unit: string } | null {
  const gramsPerCup = getDryGramsPerCup(ingredientName);
  if (gramsPerCup === null) return null;

  const cups = amountInGrams / gramsPerCup;

  // Use tsp/tbsp for small amounts
  if (cups < 1 / 16) {
    return { amount: cups * 48, unit: 'tsp' }; // 48 tsp per cup
  }
  if (cups < 1 / 4) {
    return { amount: cups * 16, unit: 'tbsp' }; // 16 tbsp per cup
  }

  return { amount: cups, unit: 'cup' };
}

export function getTargetUnit(unit: string, preference: UnitSystem): string {
  const normalized = unit.toLowerCase();

  if (preference === 'imperial') {
    if (normalized in VOLUME_TO_ML) {
      return IMPERIAL_VOLUME_PREFERRED[normalized] || 'cup';
    }
    if (normalized in WEIGHT_TO_GRAMS) {
      return IMPERIAL_WEIGHT_PREFERRED[normalized] || 'oz';
    }
  } else {
    if (normalized in VOLUME_TO_ML) {
      return METRIC_VOLUME_PREFERRED[normalized] || 'ml';
    }
    if (normalized in WEIGHT_TO_GRAMS) {
      return METRIC_WEIGHT_PREFERRED[normalized] || 'g';
    }
  }

  return unit;
}

export function formatAmount(num: number): string {
  // For very small amounts, show one decimal
  if (num > 0 && num < 1) {
    const rounded = Math.round(num * 10) / 10;
    if (rounded === 0) return '< 1';
    return rounded.toString();
  }
  // Round to nearest whole number for larger amounts
  return Math.round(num).toString();
}

/**
 * Display a converted amount with unit, preference-aware.
 *
 * @param amount - The numeric amount
 * @param unit - The stored unit
 * @param preference - User's preferred unit system
 * @param originalText - The original ingredient text (fallback display)
 * @param ingredientName - Optional ingredient name for liquid/dry classification
 */
export function displayAmount(
  amount: number | null,
  unit: string | null,
  preference: UnitSystem,
  originalText: string,
  ingredientName?: string
): string {
  if (amount === null || unit === null) {
    return originalText;
  }

  const normalized = unit.toLowerCase();

  if (!canConvert(normalized)) {
    return originalText;
  }

  // Determine if conversion is needed
  const isMetricUnit = normalized in VOLUME_TO_ML
    ? ['ml', 'l', 'milliliter', 'milliliters', 'liter', 'liters'].includes(normalized)
    : ['g', 'kg', 'gram', 'grams', 'kilogram', 'kilograms'].includes(normalized);

  const needsConversion =
    (preference === 'metric' && !isMetricUnit) ||
    (preference === 'imperial' && isMetricUnit);

  if (!needsConversion) {
    return originalText;
  }

  // Extract ingredient name from original text if not provided
  const ingredientContext = ingredientName || extractIngredientFromText(originalText);

  // Check if this is a volume unit that might need liquid/dry routing
  const isVolumeUnit = normalized in VOLUME_TO_ML;
  const isWeightUnit = normalized in WEIGHT_TO_GRAMS;

  // --- Volume unit conversion with liquid/dry awareness ---
  if (isVolumeUnit) {
    const liquid = isLiquidIngredient(ingredientContext);

    if (preference === 'metric') {
      // Imperial volume → metric
      if (!liquid) {
        // Dry ingredient: try to convert to grams
        const grams = convertDryVolumeToGrams(amount, normalized, ingredientContext);
        if (grams !== null) {
          // Use kg for large amounts
          if (grams >= 1000) {
            return formatConvertedDisplay(grams / 1000, 'kg', amount, unit, originalText);
          }
          return formatConvertedDisplay(grams, 'g', amount, unit, originalText);
        }
      }
      // Liquid or unknown dry: convert to ml (original behavior)
      const targetUnit = getTargetUnit(normalized, preference);
      const convertedAmount = convertVolume(amount, normalized, targetUnit);
      return formatConvertedDisplay(convertedAmount, targetUnit, amount, unit, originalText);
    } else {
      // Metric volume → imperial volume (liquid stays as volume)
      const targetUnit = getTargetUnit(normalized, preference);
      const convertedAmount = convertVolume(amount, normalized, targetUnit);
      return formatConvertedDisplay(convertedAmount, targetUnit, amount, unit, originalText);
    }
  }

  // --- Weight unit conversion with liquid/dry awareness ---
  if (isWeightUnit) {
    if (preference === 'imperial') {
      // Metric weight → imperial
      // For dry ingredients with a known density, convert to cups
      const liquid = isLiquidIngredient(ingredientContext);
      if (!liquid && !isMetricUnit) {
        // Already imperial weight, no conversion needed
        return originalText;
      }
      if (!liquid) {
        // Try to convert grams to cups for dry ingredients
        const fromGrams = WEIGHT_TO_GRAMS[normalized];
        if (fromGrams) {
          const totalGrams = amount * fromGrams;
          const volumeResult = convertDryGramsToVolume(totalGrams, ingredientContext);
          if (volumeResult) {
            return formatConvertedDisplay(volumeResult.amount, volumeResult.unit, amount, unit, originalText);
          }
        }
      }
      // Fallback: standard weight→weight conversion
      const targetUnit = getTargetUnit(normalized, preference);
      const convertedAmount = convertWeight(amount, normalized, targetUnit);
      return formatConvertedDisplay(convertedAmount, targetUnit, amount, unit, originalText);
    } else {
      // Imperial weight → metric weight
      const targetUnit = getTargetUnit(normalized, preference);
      const convertedAmount = convertWeight(amount, normalized, targetUnit);
      return formatConvertedDisplay(convertedAmount, targetUnit, amount, unit, originalText);
    }
  }

  return originalText;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Extract the ingredient name from an ingredient text line.
 * "2 cups all-purpose flour" → "all-purpose flour"
 */
function extractIngredientFromText(text: string): string {
  return text
    .replace(/^[\d\s/½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞.]+/, '')
    .replace(/^(tsp|teaspoons?|tbsp|tablespoons?|oz|ounces?|fl oz|cups?|pints?|quarts?|gallons?|ml|milliliters?|l|liters?|g|grams?|kg|kilograms?|lb|pounds?)\b\s*/i, '')
    .trim();
}

/**
 * Format a converted display string.
 * Shows: "250 g (2 cups) flour"
 */
function formatConvertedDisplay(
  convertedAmount: number,
  targetUnit: string,
  originalAmount: number,
  originalUnit: string,
  originalText: string
): string {
  const ingredientName = extractIngredientFromText(originalText);
  return `${formatAmount(convertedAmount)} ${targetUnit} (${originalAmount} ${originalUnit}) ${ingredientName}`.trim();
}
